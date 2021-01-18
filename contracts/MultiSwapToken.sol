// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.6.12;
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Ownable.sol";
import "./IMintToLGE.sol";
import "./utils/Console.sol";

contract MultiSwapToken is ERC20, Ownable, IMintToLGE {
  using Address for address;

  address LGE;

  constructor (string memory name, string memory symbol, address owner) ERC20(name, symbol) Ownable(owner) public {
  }

  function mint(address to, uint256 amount) external onlyOwner {
    _mint(to, amount);
  }

  function burn(address from, uint256 amount) external onlyOwner {
    _burn(from, amount);
  }

  function setLGE(address _LGE) external onlyOwner {
    LGE = _LGE;
  }

  function mintToLGE(uint256 amount) external override {
    require(msg.sender == LGE, '!LGE');
    require(amount > 0, '!amount');
    _mint(LGE, amount);
  }

}
