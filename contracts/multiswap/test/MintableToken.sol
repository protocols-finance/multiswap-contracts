// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.6.12;
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../Ownable.sol";

contract MintableToken is ERC20, Ownable {
  using Address for address;

  constructor (string memory name, string memory symbol, uint256 _decimals, address owner) ERC20(name, symbol) Ownable(owner) public {
    _setupDecimals(SafeCast.toUint8(_decimals));
  }

  function mint(address to, uint256 amount) external onlyOwner {
    _mint(to, amount);
  }

}
