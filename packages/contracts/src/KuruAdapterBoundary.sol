// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IKuruOrderBook} from "./interfaces/IKuruOrderBook.sol";
import {IVenueAdapter} from "./interfaces/IVenueAdapter.sol";

/**
 * A deliberately execution-disabled Kuru boundary.
 *
 * It pins the narrow ABI and conversion implied by the M1 read probe, but it
 * cannot route user funds until Kuru publishes deployment/build provenance and
 * the authorized settlement experiment proves actual refund/output behavior.
 */
contract KuruAdapterBoundary is IVenueAdapter {
    error UnauthorizedPolicy();
    error KuruSettlementUnverified();
    error InexactQuoteConversion();
    error QuoteSizeOverflow();

    address public immutable policy;
    IKuruOrderBook public immutable market;
    address public immutable quoteToken;
    uint8 public immutable quoteTokenDecimals;
    uint32 public immutable pricePrecision;
    uint96 public immutable sizePrecision;

    constructor(
        address policy_,
        address market_,
        address quoteToken_,
        uint8 quoteTokenDecimals_,
        uint32 pricePrecision_,
        uint96 sizePrecision_
    ) {
        if (policy_ == address(0) || market_ == address(0) || quoteToken_ == address(0)) revert UnauthorizedPolicy();
        policy = policy_;
        market = IKuruOrderBook(market_);
        quoteToken = quoteToken_;
        quoteTokenDecimals = quoteTokenDecimals_;
        pricePrecision = pricePrecision_;
        sizePrecision = sizePrecision_;
    }

    /** Converts USDC smallest units to Kuru's documented market-buy quote size. */
    function quoteUnitsToKuruQuoteSize(uint256 quoteUnits) public view returns (uint96) {
        uint256 numerator = quoteUnits * pricePrecision;
        uint256 denominator = 10 ** quoteTokenDecimals;
        if (numerator % denominator != 0) revert InexactQuoteConversion();
        uint256 converted = numerator / denominator;
        if (converted > type(uint96).max) revert QuoteSizeOverflow();
        return uint96(converted);
    }

    function executeBuy(uint256, uint256, address) external view override returns (uint256, uint256) {
        if (msg.sender != policy) revert UnauthorizedPolicy();
        revert KuruSettlementUnverified();
    }
}
