// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * ABI copied from the Kuru SDK artifact pinned in
 * docs/KURU_COMPATIBILITY_INVESTIGATION.md. This declares only the narrow
 * surface Kairos has runtime-read evidence for plus the documented buy entry.
 * It is not a statement that the deployed write path has been validated.
 */
interface IKuruOrderBook {
    function getMarketParams() external view returns (
        uint32 pricePrecision,
        uint96 sizePrecision,
        address baseAsset,
        uint256 baseAssetDecimals,
        address quoteAsset,
        uint256 quoteAssetDecimals,
        uint32 tickSize,
        uint96 minSize,
        uint96 maxSize,
        uint256 takerFeeBps,
        uint256 makerFeeBps
    );

    function getL2Book() external view returns (bytes memory);

    function placeAndExecuteMarketBuy(uint96 quoteSize, uint256 minAmountOut, bool isMargin, bool isFillOrKill)
        external
        payable
        returns (uint256);
}
