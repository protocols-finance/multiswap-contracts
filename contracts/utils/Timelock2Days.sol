// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.6.12;

import "./Timelock.sol";

contract Timelock2Days
 is Timelock {

    uint public constant DELAY = 2 days;
    constructor(address admin_) public Timelock(admin_, DELAY) {
    }

}