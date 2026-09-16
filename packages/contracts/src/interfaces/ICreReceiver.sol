// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @notice CRE EVM receiver surface used by the Keystone Forwarder.
/// @dev Matches the Chainlink IReceiver interface pinned in docs/CRE_RECEIVER.md.
interface ICreReceiver is IERC165 {
    function onReport(bytes calldata metadata, bytes calldata report) external;
}
