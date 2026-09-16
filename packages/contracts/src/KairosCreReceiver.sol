// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ICreReceiver} from "./interfaces/ICreReceiver.sol";
import {IKairosPolicyExecutor} from "./interfaces/IKairosPolicyExecutor.sol";

/**
 * CRE report boundary for one Kairos policy deployment.
 *
 * The forwarder and activation authority are immutable. The receiver starts
 * inactive, then binds exactly once to a deployed Kairos policy and complete
 * workflow identity. No setter can later weaken provenance checks.
 */
contract KairosCreReceiver is ICreReceiver, ReentrancyGuard {
    uint256 private constant METADATA_LENGTH = 62;
    uint256 private constant REPORT_LENGTH = 192;

    error InvalidAddress();
    error Unauthorized();
    error AlreadyActivated();
    error NotActivated();
    error InvalidMetadataLength(uint256 received);
    error InvalidReportLength(uint256 received);
    error InvalidWorkflowId(bytes32 received, bytes32 expected);
    error InvalidWorkflowName(bytes10 received, bytes10 expected);
    error InvalidWorkflowOwner(address received, address expected);
    error StaleReport(uint64 validUntil, uint256 currentTimestamp);
    error InvalidReport();
    error DuplicateReport(bytes32 reportHash);

    address public immutable trustedForwarder;
    address public immutable activationAuthority;

    IKairosPolicyExecutor public policy;
    bytes32 public expectedWorkflowId;
    bytes10 public expectedWorkflowName;
    address public expectedWorkflowOwner;
    bool public activated;

    mapping(bytes32 => bool) public processedReports;

    event ReceiverActivated(
        address indexed policy,
        bytes32 indexed workflowId,
        bytes10 indexed workflowName,
        address workflowOwner
    );
    event ReportForwarded(
        bytes32 indexed reportHash,
        bytes32 indexed workflowId,
        uint256 indexed orderId,
        uint64 nonce,
        bytes32 snapshotId
    );

    constructor(address trustedForwarder_, address activationAuthority_) {
        if (trustedForwarder_ == address(0) || activationAuthority_ == address(0)) revert InvalidAddress();
        trustedForwarder = trustedForwarder_;
        activationAuthority = activationAuthority_;
    }

    function activate(
        address policy_,
        bytes32 workflowId_,
        bytes10 workflowName_,
        address workflowOwner_
    ) external {
        if (msg.sender != activationAuthority) revert Unauthorized();
        if (activated) revert AlreadyActivated();
        if (
            policy_ == address(0) || policy_.code.length == 0 || workflowId_ == bytes32(0)
                || workflowName_ == bytes10(0) || workflowOwner_ == address(0)
        ) revert InvalidAddress();

        policy = IKairosPolicyExecutor(policy_);
        expectedWorkflowId = workflowId_;
        expectedWorkflowName = workflowName_;
        expectedWorkflowOwner = workflowOwner_;
        activated = true;

        emit ReceiverActivated(policy_, workflowId_, workflowName_, workflowOwner_);
    }

    function onReport(bytes calldata metadata, bytes calldata report) external override nonReentrant {
        if (msg.sender != trustedForwarder) revert Unauthorized();
        if (!activated) revert NotActivated();
        if (metadata.length != METADATA_LENGTH) revert InvalidMetadataLength(metadata.length);
        if (report.length != REPORT_LENGTH) revert InvalidReportLength(report.length);

        (bytes32 workflowId, bytes10 workflowName, address workflowOwner) = _decodeMetadata(metadata);
        if (workflowId != expectedWorkflowId) revert InvalidWorkflowId(workflowId, expectedWorkflowId);
        if (workflowName != expectedWorkflowName) revert InvalidWorkflowName(workflowName, expectedWorkflowName);
        if (workflowOwner != expectedWorkflowOwner) revert InvalidWorkflowOwner(workflowOwner, expectedWorkflowOwner);

        IKairosPolicyExecutor.Proposal memory proposal = abi.decode(report, (IKairosPolicyExecutor.Proposal));
        if (proposal.proposedInput == 0 || proposal.minimumOutput == 0 || proposal.snapshotId == bytes32(0)) {
            revert InvalidReport();
        }
        if (block.timestamp >= proposal.validUntil) revert StaleReport(proposal.validUntil, block.timestamp);

        bytes32 reportHash = keccak256(report);
        if (processedReports[reportHash]) revert DuplicateReport(reportHash);
        processedReports[reportHash] = true;

        policy.execute(proposal);
        emit ReportForwarded(reportHash, workflowId, proposal.orderId, proposal.nonce, proposal.snapshotId);
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(ICreReceiver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }

    function _decodeMetadata(bytes calldata metadata)
        private
        pure
        returns (bytes32 workflowId, bytes10 workflowName, address workflowOwner)
    {
        assembly {
            workflowId := calldataload(metadata.offset)
            workflowName := calldataload(add(metadata.offset, 32))
            workflowOwner := shr(96, calldataload(add(metadata.offset, 42)))
        }
    }
}
