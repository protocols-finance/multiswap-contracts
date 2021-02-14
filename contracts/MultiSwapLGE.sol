// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.6.12;
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./Ownable.sol";
import "./IMintToLGE.sol";
import "./utils/Console.sol";
import "./interfaces/IWETH.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Router02.sol";

contract MultiSwapLGE is Ownable {
  using SafeMath for uint256;
  using Address for address;
  using SafeERC20 for IERC20;

  event LPTokenClaimed(address dst, uint value);
  event LiquidityAdded(address indexed dst, uint value);

  address public fund;
  uint256 public fundFee;
  uint256 public fundPctLiq = 1000;
  uint256 public fundPctToken = 2000;
  uint256 constant FUND_BASE = 10000;
  uint256 constant MIN_FUND_PCT = 100;
  uint256 constant MAX_FUND_PCT = 2000;
  uint256 constant MIN_LGE_LENGTH = 1 hours;
  uint256 constant MAX_LGE_LENGTH = 14 days;
  uint256 constant MIN_MULTI_PER_ETH = 1;
  uint256 constant MIN_MIN_ETH = 1 ether / 10;
  uint256 constant MAX_MIN_ETH = 2 ether;
  uint256 constant MIN_MAX_ETH = 100 ether;
  uint256 constant MAX_MAX_ETH = 2000 ether;
  uint256 constant MIN_CAP = 1000 ether;
  uint256 constant MAX_CAP = 50_000 ether;
  uint256 constant PRECISION = 1e18;

  IWETH Iweth;
  IERC20 IMULTI;
  IUniswapV2Factory uniswapFactory;
  IUniswapV2Router02 uniswapRouterV2;

  IUniswapV2Pair public IPAIR;
  uint256 minEth = 1 ether / 2;
  uint256 maxEth = 1000 ether;
  uint256 cap = 20000 ether;
  uint256 public multiPerEth = 300;
  uint256 public lgeLength = 7 days;
  uint256 public contractStartTimestamp;
  bool public LGEFinished;
  uint256 public LPperETHUnit;
  uint256 public totalLPTokensMinted;
  uint256 public totalETHContributed;
  bool public LPGenerationCompleted;
  mapping (address => uint)  public ethContributed;

  constructor(address multi, address owner, address _fund) public Ownable(owner) {
    fund = _fund;
    uniswapFactory = IUniswapV2Factory(0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f);
    uniswapRouterV2 = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);

    IMULTI = IERC20(multi);
    address WETH = uniswapRouterV2.WETH();
    Iweth = IWETH(WETH);
    address _pair = uniswapFactory.getPair(WETH, multi);
    require(_pair == address(0), 'pair must not exist');
    IPAIR = IUniswapV2Pair(uniswapFactory.createPair(WETH, multi));
  }

  function setMinEth(uint256 _minEth) onlyOwner external {
    require(_minEth >= MIN_MIN_ETH && _minEth <= MAX_MIN_ETH);
    minEth = _minEth;
  }

  function setMaxEth(uint256 _maxEth) onlyOwner external {
    require(_maxEth >= MIN_MAX_ETH && _maxEth <= MAX_MAX_ETH);
    maxEth = _maxEth;
  }

  function setCap(uint256 _cap) onlyOwner external {
    require(_cap >= MIN_CAP && _cap <= MAX_CAP);
    cap = _cap;
  }

  function setFundPctLiq(uint256 _fundPctLiq) onlyOwner external {
    require(_fundPctLiq == 0 || (_fundPctLiq >= MIN_FUND_PCT && _fundPctLiq <= MAX_FUND_PCT));
    fundPctLiq = _fundPctLiq;
  }

  function setFundPctToken(uint256 _fundPctToken) onlyOwner external {
    require(_fundPctToken == 0 || (_fundPctToken >= MIN_FUND_PCT && _fundPctToken <= MAX_FUND_PCT));
    fundPctToken = _fundPctToken;
  }

  function setMultiPerEth(uint256 _multiPerEth) onlyOwner external {
    require(_multiPerEth >= MIN_MULTI_PER_ETH, '!multiPerEth');
    multiPerEth = _multiPerEth;
  }

  function setLGELength(uint256 _lgeLength) onlyOwner external {
    require(_lgeLength >= MIN_LGE_LENGTH && _lgeLength <= MAX_LGE_LENGTH, '!lgeLength');
    lgeLength = _lgeLength;
  }

  function startLGE() onlyOwner external {
    contractStartTimestamp = block.timestamp;
  }

  function _LGEStarted() internal view returns (bool) {
    return contractStartTimestamp != 0;
  }

  function setLGEFinished() public onlyOwner {
    LGEFinished = true;
  }

  function lgeInProgress() public view returns (bool) {
    if (!_LGEStarted() || LGEFinished) {
        return false;
    }
    return contractStartTimestamp.add(lgeLength) > block.timestamp;
  }

  function emergencyRescueEth(address to) onlyOwner external {
    require(to != address(0), '!to');
    require(block.timestamp >= contractStartTimestamp.add(lgeLength).add(2 days), 'must be 2 days after end of lge');
    (bool success, ) = to.call.value(address(this).balance)("");
    require(success, "Transfer failed.");
  }

  function generateLPTokens() public {
    require(lgeInProgress() == false, "LGE still in progress");
    require(LPGenerationCompleted == false, "LP tokens already generated");
    uint256 total = totalETHContributed; // gas

    //Wrap eth
    Iweth.deposit{ value: total }();
    require(IERC20(address(Iweth)).balanceOf(address(this)) == total, '!weth');
    Iweth.transfer(address(IPAIR), total);

    uint256 multiBalance = IMULTI.balanceOf(address(this));
    IMULTI.safeTransfer(address(IPAIR), multiBalance);
    IPAIR.mint(address(this));
    totalLPTokensMinted = IPAIR.balanceOf(address(this));
    require(totalLPTokensMinted != 0 , "LP creation failed");
    if (fund != address(0)) {
      // Mint MULTI tokens for fund
      uint256 fundTokenFee = multiBalance.mul(fundPctToken).div(FUND_BASE);
      if (fundTokenFee > 0) {
        IMintToLGE(address(IMULTI)).mintToLGE(fundTokenFee);
        IMULTI.safeTransfer(fund, fundTokenFee);
      }
      // send remaining ETH to fund
      (bool success, ) = fund.call.value(address(this).balance)("");
      require(success, "Transfer failed.");
    }
    // Calculate LP tokens per eth
    LPperETHUnit = totalLPTokensMinted.mul(PRECISION).div(total);
    require(LPperETHUnit != 0 , "LP creation failed");
    LPGenerationCompleted = true;
  }

  receive() external payable {
    require(lgeInProgress(), "!LGE in progress");
    _addLiquidity();
  }

  function addLiquidity() public payable {
    require(lgeInProgress(), "!LGE in progress");
    _addLiquidity();
  }

  function _addLiquidity() internal {
    require(msg.value >= minEth, '!minEth');
    uint256 fee = msg.value.mul(fundPctLiq).div(FUND_BASE);
    fundFee = fundFee.add(fee);
    uint256 contrib = msg.value.sub(fee, '!fee');
    ethContributed[msg.sender] += contrib;
    require(ethContributed[msg.sender] <= maxEth);
    totalETHContributed = totalETHContributed.add(contrib);
    require(totalETHContributed <= cap, '!cap');
    uint256 amount = contrib * multiPerEth;
    if (amount > 0) {
      IMintToLGE(address(IMULTI)).mintToLGE(amount);
    }
    emit LiquidityAdded(msg.sender, msg.value);
  }

  function claimLPTokens() public {
    require(LPGenerationCompleted, "!LP generated");
    require(ethContributed[msg.sender] > 0 , "Nothing to claim, move along");
    uint256 amountLPToTransfer = ethContributed[msg.sender].mul(LPperETHUnit).div(PRECISION);
    ethContributed[msg.sender] = 0;
    IPAIR.transfer(msg.sender, amountLPToTransfer);
    emit LPTokenClaimed(msg.sender, amountLPToTransfer);
  }

}
