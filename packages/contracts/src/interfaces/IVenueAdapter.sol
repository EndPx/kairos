// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * Generic policy boundary. The immutable adapter must deliver output and unused
 * input directly to `recipient`; Kairos measures the recipient's actual deltas.
 */
interface IVenueAdapter {
    function executeBuy(uint256 requestedInput, uint256 minimumOutput, address recipient) external returns (uint256 reportedInput, uint256 reportedOutput);
}
