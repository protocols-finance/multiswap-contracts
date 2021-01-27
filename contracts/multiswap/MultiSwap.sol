// SPDX-License-Identifier: Apache-2.0-with-multiswap-clause
pragma solidity >=0.6.12;
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "../Ownable.sol";
import "./Whitelist.sol";
import "../utils/Console.sol";

struct Pair {
  uint256 unit;
  address token;
  uint256 decimals;
  uint256 collateral;
}

contract MultiSwap is ERC20, Whitelist, ReentrancyGuard {
  using Address for address;
  using SafeERC20 for IERC20;
  using SafeMath for uint256;
  using EnumerableSet for EnumerableSet.AddressSet;

  uint256 constant PCT_BASE = 10000;

  mapping (address => Pair) pairs;
  EnumerableSet.AddressSet collateral;

  constructor (string memory name, string memory symbol, address owner) ERC20(name, symbol) Whitelist(owner, true) public {
  }

  function allowCollateral(address token) external onlyOwner {
    require(token != address(0) && !_isCollateralAllowed(token), '!token');
    collateral.add(token);
    pairs[token].token = token;
    pairs[token].decimals = ERC20(token).decimals();
  }

  function _isCollateralAllowed(address token) internal view returns(bool) {
    return collateral.contains(token);
  }

  function _activePair(address token) internal view returns(bool) {
    Pair storage pair = pairs[token];
    return pair.unit > 0 && pair.collateral > 0;
  }

  function reserves(address token) external view returns(uint256 reserveCollateral, uint256 reserveUnit) {
    require(token != address(0), '!token');
    require(_isCollateralAllowed(token), '!pair');
    Pair storage pair = pairs[token];
    reserveUnit = pair.unit;
    reserveCollateral = pair.collateral;
  }

  function getAmountOut(address tokenIn, address tokenOut, uint256 amount) external view returns(uint256 out) {
    require(_isCollateralAllowed(tokenIn) && _isCollateralAllowed(tokenOut), '!allowed');
    require(_activePair(tokenIn) && _activePair(tokenOut) && amount > 0, '!amount||!pair');
    Pair storage pairIn = pairs[tokenIn];
    Pair storage pairOut = pairs[tokenOut];
    uint256 unit = amount.mul(pairIn.unit).div(pairIn.collateral.add(amount));
    out = unit.mul(pairOut.collateral).div(pairOut.unit.add(unit));
  }

  /*
    amountOutMin is getAmountOut minus some acceptable slippage
  */
  function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin) external nonReentrant onlyWhitelist {
    require(_isCollateralAllowed(tokenIn) && _isCollateralAllowed(tokenOut), '!allowed');
    require(_activePair(tokenIn) && _activePair(tokenOut), '!active');
    require(amountIn > 0 && amountOutMin > 0, '!amount');
    // TODO limit price impact
    uint256 unit = _swapToUnit(pairs[tokenIn], tokenIn, amountIn);
    uint256 out = _swapFromUnit(pairs[tokenOut], unit);
    require(out >= amountOutMin, '!out');
    IERC20(tokenOut).transfer(msg.sender, out);
  }

  function _swapToUnit(Pair storage pair, address token, uint256 amount) internal returns(uint256 unit) {
    IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    unit = amount.mul(pair.unit).div(pair.collateral.add(amount));
    pair.unit = pair.unit.sub(unit, '!unit');
    pair.collateral = pair.collateral.add(amount);
  }

  function _swapFromUnit(Pair storage pair, uint256 unit) internal returns(uint256 out) {
    out = unit.mul(pair.collateral).div(pair.unit.add(unit));
    pair.unit = pair.unit.add(unit);
    pair.collateral = pair.collateral.sub(out, '!collateral');
  }

  function tokens() external view returns(address[] memory allowed) {
    uint256 len = collateral.length();
    allowed = new address[](len);
    for (uint256 i = 0; i < len; i++)
      allowed[i] = collateral.at(i);
  }

  function initialize(uint256[] memory collaterals, uint256[] memory units) external {
    uint256 share = 0;
    uint256 len = collateral.length();
    for (uint256 i = 0; i < len; i++) {
      address token = collateral.at(i);
      require(!_activePair(token), '!pair');
      Pair storage pair = pairs[token];
      pair.unit = units[i];
      pair.collateral = collaterals[i];
      IERC20(token).transferFrom(msg.sender, address(this), pair.collateral);
      share += pair.unit;
    }
    _mint(msg.sender, share);
  }

  function deposit(uint256 pct, uint256 lower, uint256 upper) external nonReentrant onlyWhitelist {
    uint256 totalSupply = totalSupply();
    require(totalSupply >= lower && totalSupply <= upper, '!bounds');
    uint256 len = collateral.length();
    for (uint256 i = 0; i < len; i++) {
      address token = collateral.at(i);
      require(_activePair(token), '!pair');
      Pair storage pair = pairs[token];
      uint256 units = pair.unit.mul(pct).div(PCT_BASE);
      uint256 amount = units.mul(pair.collateral).div(pair.unit);
      pair.unit = pair.unit.add(units);
      pair.collateral = pair.collateral.add(amount);
      IERC20(token).transferFrom(msg.sender, address(this), amount);
    }
    uint256 share = totalSupply.mul(pct).div(PCT_BASE);
    _mint(msg.sender, share);
  }

  function withdrawAmounts(uint256 unit) external view returns(uint256[] memory outs) {
    require(unit <= balanceOf(msg.sender), '!unit');
    uint256 share = unit.mul(1e18).div(totalSupply());
    uint256 len = collateral.length();
    outs = new uint256[](len);
    for (uint256 i = 0; i < len; i++) {
      address token = collateral.at(i);
      require(_activePair(token), '!pair');
      Pair storage pair = pairs[token];
      uint256 units = pair.unit.mul(share).div(1e18);
      outs[i] = units.mul(pair.collateral).div(pair.unit);
    }
  }

  /*
    minOuts is withdrawAmounts
  */
  function withdraw(uint256 unit, uint256[] memory minOuts) external nonReentrant onlyWhitelist {
    require(unit <= balanceOf(msg.sender), '!share');
    uint256 len = minOuts.length;
    require(len == collateral.length(), '!len');
    uint256 share = unit.mul(1e18).div(totalSupply());
    for (uint256 i = 0; i < len; i++) {
      uint256 minOut = minOuts[i];
      address token = collateral.at(i);
      require(minOut > 0 && _activePair(token), '!pair');
      Pair storage pair = pairs[token];
      uint256 units = pair.unit.mul(share).div(1e18);
      uint256 out = units.mul(pair.collateral).div(pair.unit);
      require(out >= minOut, '!minOuts');
      pair.unit = pair.unit.sub(units, '!unit');
      pair.collateral = pair.collateral.sub(out, '!collateral');
      IERC20(token).transfer(msg.sender, out);
    }
    _burn(msg.sender, unit);
  }

}
