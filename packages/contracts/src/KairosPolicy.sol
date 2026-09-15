// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20Minimal} from "./interfaces/IERC20Minimal.sol";
import {IVenueAdapter} from "./interfaces/IVenueAdapter.sol";

/**
 * Generic, single-market Kairos policy core.
 *
 * The contract never holds an order's unexecuted funds between transactions.
 * Each execution pulls only the approved proposed amount and requires the
 * immutable adapter to settle output and any unused input to the order owner
 * inside the same transaction.
 */
contract KairosPolicy is ReentrancyGuard {
    enum Status { ACTIVE, COMPLETED, CANCELLED, EXPIRED }

    error Unauthorized();
    error InvalidAddress();
    error InvalidPolicy();
    error InvalidProposal();
    error OrderNotActive(Status status);
    error ProposalExpired();
    error Replay();
    error ReleaseExceeded();
    error BudgetExceeded();
    error InsufficientBalance();
    error InsufficientAllowance();
    error MinimumFillNotMet();
    error PriceLimitExceeded();
    error SettlementMismatch();
    error UnsafeTokenOperation();

    struct Order {
        address owner;
        uint128 budget;
        uint128 spent;
        uint128 received;
        uint64 startTime;
        uint64 endTime;
        uint128 maxPerFill;
        uint128 minFill;
        uint128 maxEffectivePrice;
        uint64 executionNonce;
        bool cancelled;
    }

    struct Proposal {
        uint256 orderId;
        uint64 nonce;
        uint64 validUntil;
        uint128 proposedInput;
        uint128 minimumOutput;
        bytes32 snapshotId;
    }

    address public immutable executor;
    address public immutable market;
    address public immutable tokenIn;
    address public immutable tokenOut;
    address public immutable adapter;
    uint8 public immutable inputDecimals;
    uint8 public immutable outputDecimals;
    uint8 public immutable priceDecimals;

    uint256 public nextOrderId;
    mapping(uint256 => Order) private orders;

    event OrderCreated(uint256 indexed orderId, address indexed owner, uint128 budget, uint64 startTime, uint64 endTime);
    event OrderCancelled(uint256 indexed orderId, address indexed owner);
    event ExecutionSettled(uint256 indexed orderId, uint64 indexed nonce, uint256 actualInput, uint256 actualOutput, uint256 returnedInput, bytes32 snapshotId);

    constructor(
        address executor_,
        address market_,
        address tokenIn_,
        address tokenOut_,
        address adapter_,
        uint8 inputDecimals_,
        uint8 outputDecimals_,
        uint8 priceDecimals_
    ) {
        if (executor_ == address(0) || market_ == address(0) || tokenIn_ == address(0) || adapter_ == address(0)) revert InvalidAddress();
        executor = executor_;
        market = market_;
        tokenIn = tokenIn_;
        tokenOut = tokenOut_;
        adapter = adapter_;
        inputDecimals = inputDecimals_;
        outputDecimals = outputDecimals_;
        priceDecimals = priceDecimals_;
    }

    function createOrder(
        uint128 budget,
        uint64 startTime,
        uint64 endTime,
        uint128 maxPerFill,
        uint128 minFill,
        uint128 maxEffectivePrice
    ) external returns (uint256 orderId) {
        if (budget == 0 || startTime >= endTime || minFill == 0 || minFill > maxPerFill || maxPerFill > budget || maxEffectivePrice == 0) revert InvalidPolicy();
        orderId = nextOrderId++;
        orders[orderId] = Order({
            owner: msg.sender,
            budget: budget,
            spent: 0,
            received: 0,
            startTime: startTime,
            endTime: endTime,
            maxPerFill: maxPerFill,
            minFill: minFill,
            maxEffectivePrice: maxEffectivePrice,
            executionNonce: 0,
            cancelled: false
        });
        emit OrderCreated(orderId, msg.sender, budget, startTime, endTime);
    }

    function cancelOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        if (order.owner != msg.sender) revert Unauthorized();
        if (statusOf(orderId) != Status.ACTIVE) revert OrderNotActive(statusOf(orderId));
        order.cancelled = true;
        emit OrderCancelled(orderId, msg.sender);
    }

    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    function statusOf(uint256 orderId) public view returns (Status) {
        Order storage order = orders[orderId];
        if (order.owner == address(0)) revert InvalidProposal();
        if (order.cancelled) return Status.CANCELLED;
        if (order.spent >= order.budget) return Status.COMPLETED;
        if (block.timestamp >= order.endTime) return Status.EXPIRED;
        return Status.ACTIVE;
    }

    function releasedBudget(uint256 orderId, uint256 timestamp) public view returns (uint256) {
        Order storage order = orders[orderId];
        if (order.owner == address(0)) revert InvalidProposal();
        if (timestamp <= order.startTime) return 0;
        if (timestamp >= order.endTime) return order.budget;
        return uint256(order.budget) * (timestamp - order.startTime) / (order.endTime - order.startTime);
    }

    function availableToSpend(uint256 orderId, uint256 timestamp) public view returns (uint256) {
        uint256 released = releasedBudget(orderId, timestamp);
        uint256 alreadySpent = orders[orderId].spent;
        return released > alreadySpent ? released - alreadySpent : 0;
    }

    function execute(Proposal calldata proposal) external nonReentrant {
        if (msg.sender != executor) revert Unauthorized();
        Order storage order = orders[proposal.orderId];
        if (statusOf(proposal.orderId) != Status.ACTIVE) revert OrderNotActive(statusOf(proposal.orderId));
        if (block.timestamp >= proposal.validUntil) revert ProposalExpired();
        if (proposal.nonce != order.executionNonce) revert Replay();
        if (proposal.proposedInput < order.minFill || proposal.proposedInput > order.maxPerFill) revert MinimumFillNotMet();
        if (proposal.proposedInput > availableToSpend(proposal.orderId, block.timestamp)) revert ReleaseExceeded();
        if (uint256(order.spent) + proposal.proposedInput > order.budget) revert BudgetExceeded();

        IERC20Minimal input = IERC20Minimal(tokenIn);
        if (input.balanceOf(order.owner) < proposal.proposedInput) revert InsufficientBalance();
        if (input.allowance(order.owner, address(this)) < proposal.proposedInput) revert InsufficientAllowance();
        uint256 ownerInputBefore = input.balanceOf(order.owner);
        uint256 ownerOutputBefore = _outputBalance(order.owner);
        uint256 policyInputBefore = input.balanceOf(address(this));

        _safeTransferFrom(input, order.owner, address(this), proposal.proposedInput);
        _forceApprove(input, adapter, proposal.proposedInput);
        (uint256 reportedInput, uint256 reportedOutput) = IVenueAdapter(adapter).executeBuy(proposal.proposedInput, proposal.minimumOutput, order.owner);
        _forceApprove(input, adapter, 0);

        uint256 ownerInputAfter = input.balanceOf(order.owner);
        uint256 ownerOutputAfter = _outputBalance(order.owner);
        uint256 policyInputAfter = input.balanceOf(address(this));
        if (ownerInputAfter > ownerInputBefore || ownerOutputAfter < ownerOutputBefore || policyInputAfter != policyInputBefore) revert SettlementMismatch();

        uint256 actualInput = ownerInputBefore - ownerInputAfter;
        uint256 actualOutput = ownerOutputAfter - ownerOutputBefore;
        uint256 returnedInput = proposal.proposedInput - actualInput;
        if (actualInput != reportedInput || actualOutput != reportedOutput || actualInput > proposal.proposedInput) revert SettlementMismatch();
        if (actualInput < order.minFill || actualOutput < proposal.minimumOutput) revert MinimumFillNotMet();
        if (!_effectivePriceAtMost(actualInput, actualOutput, order.maxEffectivePrice)) revert PriceLimitExceeded();

        order.spent += uint128(actualInput);
        order.received += uint128(actualOutput);
        unchecked { order.executionNonce++; }
        emit ExecutionSettled(proposal.orderId, proposal.nonce, actualInput, actualOutput, returnedInput, proposal.snapshotId);
    }

    function _outputBalance(address account) private view returns (uint256) {
        return tokenOut == address(0) ? account.balance : IERC20Minimal(tokenOut).balanceOf(account);
    }

    function _effectivePriceAtMost(uint256 actualInput, uint256 actualOutput, uint256 maxPrice) private view returns (bool) {
        if (actualOutput == 0) return false;
        return actualInput * (10 ** outputDecimals) * (10 ** priceDecimals) <= maxPrice * actualOutput * (10 ** inputDecimals);
    }

    function _safeTransferFrom(IERC20Minimal token, address from, address to, uint256 value) private {
        if (!token.transferFrom(from, to, value)) revert UnsafeTokenOperation();
    }

    function _forceApprove(IERC20Minimal token, address spender, uint256 value) private {
        if (!token.approve(spender, value)) revert UnsafeTokenOperation();
    }
}
