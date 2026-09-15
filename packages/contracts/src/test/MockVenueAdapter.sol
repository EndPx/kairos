// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20Minimal} from "../interfaces/IERC20Minimal.sol";
import {IVenueAdapter} from "../interfaces/IVenueAdapter.sol";
import {MockERC20} from "./MockERC20.sol";

/**
 * Test fixture only. It models an adapter that consumes a configured amount,
 * immediately returns unused input to the owner, and mints configured output.
 * It is not a Kuru implementation or Kuru integration evidence.
 */
contract MockVenueAdapter is IVenueAdapter {
    IERC20Minimal public immutable input;
    MockERC20 public immutable output;
    uint256 public nextActualInput;
    uint256 public nextActualOutput;
    bool public reenter;
    bytes public reentryData;

    constructor(IERC20Minimal input_, MockERC20 output_) {
        input = input_;
        output = output_;
    }

    function configure(uint256 actualInput, uint256 actualOutput) external {
        nextActualInput = actualInput;
        nextActualOutput = actualOutput;
        reenter = false;
        delete reentryData;
    }

    function configureReentry(bytes calldata data) external {
        reenter = true;
        reentryData = data;
    }

    function executeBuy(uint256 requestedInput, uint256 minimumOutput, address recipient) external override returns (uint256, uint256) {
        require(nextActualInput <= requestedInput, "fixture input exceeds request");
        require(nextActualOutput >= minimumOutput, "fixture output below minimum");
        input.transferFrom(msg.sender, address(this), requestedInput);
        if (requestedInput > nextActualInput) input.transfer(recipient, requestedInput - nextActualInput);
        output.mint(recipient, nextActualOutput);
        if (reenter) {
            (bool ok,) = msg.sender.call(reentryData);
            require(!ok, "reentry unexpectedly succeeded");
        }
        return (nextActualInput, nextActualOutput);
    }
}
