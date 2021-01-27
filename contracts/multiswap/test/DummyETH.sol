// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.6.12;
import "@openzeppelin/contracts/utils/Address.sol";
import "./MintableToken.sol";

contract DummyETH is MintableToken {
  using Address for address;

  constructor (string memory name, string memory symbol, uint256 _decimals, address owner) MintableToken(name, symbol, _decimals, owner) public {
  }

}
