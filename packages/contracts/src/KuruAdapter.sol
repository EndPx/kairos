// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20Minimal} from "./interfaces/IERC20Minimal.sol";
import {IKuruOrderBook} from "./interfaces/IKuruOrderBook.sol";
import {IVenueAdapter} from "./interfaces/IVenueAdapter.sol";

/**
 * Restricted USDC-to-native-MON Kuru settlement adapter.
 *
 * The deployment binds one policy, market, quote token, market precision, FOK
 * mode, and execution chain. It preserves any pre-existing adapter balances,
 * returns only the current call's unused quote input, and forwards only the
 * current call's native output to the policy-supplied owner recipient.
 */
contract KuruAdapter is IVenueAdapter {
    error UnauthorizedPolicy();
    error UnexpectedChain();
    error InvalidAddress();
    error MarketConfigurationMismatch();
    error InexactQuoteConversion();
    error QuoteSizeOverflow();
    error UnsafeTokenOperation();
    error SettlementMismatch();
    error NativeTransferFailed();

    address public immutable policy;
    IKuruOrderBook public immutable market;
    IERC20Minimal public immutable quoteToken;
    uint8 public immutable quoteTokenDecimals;
    uint32 public immutable pricePrecision;
    uint96 public immutable sizePrecision;
    bool public immutable fillOrKill;
    uint256 public immutable executionChainId;

    constructor(
        address policy_,
        address market_,
        address quoteToken_,
        uint8 quoteTokenDecimals_,
        uint32 pricePrecision_,
        uint96 sizePrecision_,
        bool fillOrKill_,
        uint256 executionChainId_
    ) {
        if (policy_ == address(0) || market_ == address(0) || quoteToken_ == address(0)) revert InvalidAddress();
        policy = policy_;
        market = IKuruOrderBook(market_);
        quoteToken = IERC20Minimal(quoteToken_);
        quoteTokenDecimals = quoteTokenDecimals_;
        pricePrecision = pricePrecision_;
        sizePrecision = sizePrecision_;
        fillOrKill = fillOrKill_;
        executionChainId = executionChainId_;

        (
            uint32 deployedPricePrecision,
            uint96 deployedSizePrecision,
            address baseAsset,
            uint256 baseAssetDecimals,
            address deployedQuoteAsset,
            uint256 deployedQuoteDecimals,
            ,,,,
        ) = market.getMarketParams();
        if (
            deployedPricePrecision != pricePrecision_ || deployedSizePrecision != sizePrecision_
                || baseAsset != address(0) || baseAssetDecimals != 18 || deployedQuoteAsset != quoteToken_
                || deployedQuoteDecimals != quoteTokenDecimals_
        ) revert MarketConfigurationMismatch();
    }

    function quoteUnitsToKuruQuoteSize(uint256 quoteUnits) public view returns (uint96) {
        uint256 numerator = quoteUnits * pricePrecision;
        uint256 denominator = 10 ** quoteTokenDecimals;
        if (numerator % denominator != 0) revert InexactQuoteConversion();
        uint256 converted = numerator / denominator;
        if (converted > type(uint96).max) revert QuoteSizeOverflow();
        return uint96(converted);
    }

    function executeBuy(uint256 requestedInput, uint256 minimumOutput, address recipient)
        external
        override
        returns (uint256 actualInput, uint256 actualOutput)
    {
        if (msg.sender != policy) revert UnauthorizedPolicy();
        if (block.chainid != executionChainId) revert UnexpectedChain();
        if (recipient == address(0) || requestedInput == 0) revert InvalidAddress();

        uint256 quoteBefore = quoteToken.balanceOf(address(this));
        uint256 nativeBefore = address(this).balance;
        _safeTransferFrom(quoteToken, msg.sender, address(this), requestedInput);
        if (quoteToken.balanceOf(address(this)) != quoteBefore + requestedInput) revert SettlementMismatch();

        _forceApprove(quoteToken, address(market), requestedInput);
        uint256 reportedOutput = market.placeAndExecuteMarketBuy(
            quoteUnitsToKuruQuoteSize(requestedInput), minimumOutput, false, fillOrKill
        );
        _forceApprove(quoteToken, address(market), 0);

        uint256 quoteAfter = quoteToken.balanceOf(address(this));
        uint256 nativeAfter = address(this).balance;
        if (quoteAfter < quoteBefore || quoteAfter > quoteBefore + requestedInput || nativeAfter < nativeBefore) {
            revert SettlementMismatch();
        }

        uint256 returnedInput = quoteAfter - quoteBefore;
        actualInput = requestedInput - returnedInput;
        actualOutput = nativeAfter - nativeBefore;
        if (reportedOutput != actualOutput || actualOutput < minimumOutput) revert SettlementMismatch();

        if (returnedInput != 0) _safeTransfer(quoteToken, recipient, returnedInput);
        (bool sent,) = payable(recipient).call{value: actualOutput}("");
        if (!sent) revert NativeTransferFailed();

        if (quoteToken.balanceOf(address(this)) != quoteBefore || address(this).balance != nativeBefore) {
            revert SettlementMismatch();
        }
    }

    function _safeTransfer(IERC20Minimal token, address to, uint256 value) private {
        if (!token.transfer(to, value)) revert UnsafeTokenOperation();
    }

    function _safeTransferFrom(IERC20Minimal token, address from, address to, uint256 value) private {
        if (!token.transferFrom(from, to, value)) revert UnsafeTokenOperation();
    }

    function _forceApprove(IERC20Minimal token, address spender, uint256 value) private {
        uint256 currentAllowance = token.allowance(address(this), spender);
        if (currentAllowance != 0 && !token.approve(spender, 0)) revert UnsafeTokenOperation();
        if (value != 0 && !token.approve(spender, value)) revert UnsafeTokenOperation();
    }

    receive() external payable {}
}
