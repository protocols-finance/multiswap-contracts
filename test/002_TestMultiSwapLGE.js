const MultiSwapToken = artifacts.require("MultiSwapToken");
const MultiSwapLGE = artifacts.require("MultiSwapLGE");
const IERC20 = artifacts.require("IERC20");

const BN = require('bn.js');
const { assert } = require('chai');

contract("MultiSwapLGE", async accounts => {
  let weth = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

  let LGE;
  let MULTI;
  let PAIR;
  let pair;

  const deployer = accounts[0];
  const presale = accounts[1];
  const lge = accounts[2];
  const founders = accounts[3];
  const fundraising = accounts[4];
  const community = accounts[6];
  const admin = accounts[0];
  const member1 = accounts[7];
  const member2 = accounts[8];
  const member3 = accounts[9];
  const fund = admin;
  const TIME_12H = 60 * 60 * 12;
  const TIME_1H = 60 * 60
  const TIME_1D = TIME_1H * 24

  function sleep(s) {
    return new Promise(resolve => setTimeout(resolve, s * 1000));
  }

  function encodeParameters(types, values) {
    return web3.eth.abi.encodeParameters(types, values);
  }

  const toWei = (val) => web3.utils.toWei(val);

  const etherFromWei = (wei) => {
    return web3.utils.fromWei(wei.toString())
  }

  const logEther = (msg, wei) => {
    console.log(msg, etherFromWei(wei));
  }

  const ethBalance = async (from) => {
    const ethStr = await web3.eth.getBalance(from);
    return new BN(ethStr);
  }

  const timeTravel = function (time) {
    return new Promise((resolve, reject) => {
      const id = new Date().getTime()
      // console.log('evm_increaseTime bef', id, time);
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [time], // 86400 is num seconds in day
        id
      }, (err, result) => {
        if(err){ return reject(err) }
        const id = new Date().getTime();
        // console.log('evm_increaseTime aft', id);
        // resolve(result);
        web3.currentProvider.send({
          jsonrpc: '2.0',
          method: 'evm_mine',
          id,
        }, (err2, res) => (err2 ? reject(err2) : resolve(result)));
      });
    })
  }

  beforeEach(async () => {
    MULTI = await MultiSwapToken.deployed();
    console.log('MULTI', MULTI.address);
    LGE = await MultiSwapLGE.deployed();
    console.log('LGE', LGE.address);
    pair = await LGE.IPAIR();
    PAIR = await IERC20.at(pair);
    await MULTI.approve(LGE.address, '5000000000000000000000000', { from: lge})

  });

  it("LGE Tests", async () => {
    console.log(`
      Start LGE, Deposit some ETH, Generate Liquidity, Claim Liquidity
    `)

    const addLiquidityShouldFail = async (value, from) => {
      try {
        // Should fail, LGE not started yet
        await LGE.addLiquidity({value, from})
        assert.isFalse(true, 'addLiquidity should fail')
      } catch (e) {
        assert.isTrue(true, 'identity')
      }  
    }

    const generateLPTokensShouldFail = async () => {
      try {
        // Should fail, LGE not started yet
        await LGE.generateLPTokens()
        assert.isFalse(true, 'generateLPTokens should fail')
      } catch (e) {
      }  
    }

    const claimLPTokensShouldFail = async (from) => {
      try {
        // Should fail, LGE not started yet
        await LGE.claimLPTokens({from})
        assert.isFalse(true, 'claimLPTokens should fail')
      } catch (e) {
      }  
    }

    // startLGE
    await LGE.startLGE();
    const ethFundStart = await ethBalance(lge);
    const lgeFund = await LGE.fund();
    assert.equal(lge, lgeFund, 'lge fund is incorrect')

    // deposit some eth
    await LGE.registerAirdrop(toWei('1'), {from: member1});
    await LGE.registerAirdrop(toWei('1.01'), {from: member2});
    await LGE.addLiquidity({value: toWei('1'), from: member1});
    await LGE.addLiquidity({value: toWei('1'), from: member2});
    await addLiquidityShouldFail(toWei('.499'), member1); // too small
    await addLiquidityShouldFail(toWei('101'), member1); // too large
    await web3.eth.sendTransaction({from: member3, to: LGE.address, value: toWei('.5')}); // goes to receive
        
    await generateLPTokensShouldFail();
    await timeTravel(TIME_1D * 7 + TIME_1H);

    const multiPerEth = await LGE.multiPerEth();
    const totalEth = await LGE.totalETHContributed();
    const amount = multiPerEth.mul(totalEth);
    const multiInContract = await MULTI.balanceOf(LGE.address);
    assert.equal(multiInContract.toString(), amount.toString(), 'wrong multi amount');

    const eth = await ethBalance(LGE.address);

    const fundEth = eth.sub(totalEth);
    const fundPct = await LGE.fundPctLiq();
    const FUND_BASE = new BN('10000');
    const expectedFundEth = eth.mul(fundPct).div(FUND_BASE);
    assert.equal(fundEth.toString(), expectedFundEth.toString(), 'fundEth is incorrect');

    // generate LP tokens
    await LGE.generateLPTokens();
    await generateLPTokensShouldFail();
    const ethRemain = await web3.eth.getBalance(LGE.address);
    assert.equal(ethRemain.toString(), '0', 'all ETH should be converted to LP tokens and sent to fund');

    // check fund share of eth
    const ethFundAfter = await ethBalance(lge);
    const ethFundSent = ethFundAfter.sub(ethFundStart);
    logEther('ethFundSent', ethFundSent);
    assert.equal(ethFundSent.toString(), fundEth, 'eth sent to fund incorrect');

    await LGE.claimLPTokens({from: member1});
    await claimLPTokensShouldFail(member1);
    const member1Share = await PAIR.balanceOf(member1);
    logEther('member1 LP Tokens', member1Share);
    await LGE.claimLPTokens({from: member2});
    await claimLPTokensShouldFail(member2);
    const member2Share = await PAIR.balanceOf(member2);
    logEther('member1 LP Tokens', member2Share);
    assert.equal(member1Share.toString(), member2Share.toString(), 'member1 share should equal member2 share');

    await LGE.claimLPTokens({from: member3});
    await claimLPTokensShouldFail(member3);
    const member3Share = await PAIR.balanceOf(member3);
    logEther('member3 LP Tokens', member3Share);
    assert.equal(member3Share.toString(), member1Share.div(new BN('2')).toString(), 'member3 share should be half of member1 share');

    const endShare = await PAIR.balanceOf(LGE.address);
    logEther('endShare', endShare);
    const dust = new BN('10');
    assert.isTrue(endShare.lte(dust), 'all LP tokens should be claimed');

    const confirmed1 = await LGE.confirmedAirdrop(member1);
    assert.isTrue(!confirmed1.isZero(), 'member1 should have a confirmed airdrop');
    const confirmed2 = await LGE.confirmedAirdrop(member2);
    assert.isTrue(confirmed2.isZero(), 'member2 confirmed airdrop should be 0');

  });

});