// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IKairosPolicyExecutor {
    struct Proposal {
        uint256 orderId;
        uint64 nonce;
        uint64 validUntil;
        uint128 proposedInput;
        uint128 minimumOutput;
        bytes32 snapshotId;
    }

    function execute(Proposal calldata proposal) external;
}
