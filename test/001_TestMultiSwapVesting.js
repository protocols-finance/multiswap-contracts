const MultiSwapToken = artifacts.require("MultiSwapToken");
const MultiSwapVesting = artifacts.require("MultiSwapVesting");

const BN = require('bn.js');
const { assert } = require('chai');

contract("MultiSwap Test", async accounts => {

  let MULTI;
  let VESTING;

  const deployer = accounts[0];
  const presale = accounts[1];
  const lge = accounts[2];
  const founders = accounts[3];
  const fundraising = accounts[4];
  const community = accounts[6];
  let recipient = deployer;
  const presale0 = accounts[7];
  const TIME_12H = 60 * 60 * 12;
  const TIME_1H = 60 * 60
  const TIME_1D = TIME_1H * 24
  console.log('TIME_1D', TIME_1D);
  console.log('bad', 2678400 / TIME_1D);

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

  const numberFromWei = (wei) => {
    return Number(web3.utils.fromWei(wei.toString()))
  }

  const logEther = (msg, wei) => {
    console.log(msg, etherFromWei(wei));
  }

  const usdToWei = (usd) => usd.mul(new BN('10000000000'))

  const usdFromWei = (wei) => {
    return Number(web3.utils.fromWei(wei.toString(), 'gwei')) * 10;
  }

  const timeTravel = function (time) {
    return new Promise((resolve, reject) => {
      const id = new Date().getTime()
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [time], // 86400 is num seconds in day
        id
      }, (err, result) => {
        if(err){ return reject(err) }
        const id = new Date().getTime();
        // resolve(result);
        web3.currentProvider.send({
          jsonrpc: '2.0',
          method: 'evm_mine',
          id,
        }, (err2, res) => (err2 ? reject(err2) : resolve(result)));
      });
    })
  }

  const mineBlock = function () {
    return new Promise((resolve, reject) => {
      const id = new Date().getTime()
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id,
      }, (err2, res) => (err2 ? reject(err2) : resolve(res)));
    })
  }

  beforeEach(async () => {
    MULTI = await MultiSwapToken.deployed();
    console.log('MULTI', MULTI.address);
    VESTING = await MultiSwapVesting.deployed();
    console.log('VESTING', VESTING.address);
    await MULTI.approve(VESTING.address, '5000000000000000000000000', { from: presale})
    await MULTI.approve(VESTING.address, '15000000000000000000000000', { from: founders})
    await MULTI.approve(VESTING.address, '5000000000000000000000000', { from: fundraising})
  });

  const claimShouldFail = async (from, id) => {
    try {
      await VESTING.claimVestedTokens(id, { from });
      assert.isTrue(false, 'claim should fail')
    } catch (e) {
    }
  }

  const claimShouldSucceed = async (from, id) => {
    try {
      await VESTING.claimVestedTokens(id, { from });
    } catch (e) {
      console.log('claimShouldSucceed', e);
      // assert.isTrue(false, 'claim should succeed')
    }
  }

  it("MultiSwapVesting Tests", async () => {
    
    console.log(`
      Vest Dev 0
    `)
    {
      const amount = '1000000000000000000000000'; // 1M
      await VESTING.addTokenGrant(recipient, 0, amount, founders, 365, 30);
      const grants = await VESTING.getActiveGrants(recipient);
      assert.equal(grants.length, 1, 'wrong number of grants')
      await claimShouldFail(recipient, grants[0]);

      const TIME_40D = TIME_1D * 40;
      await timeTravel(TIME_40D); // 40 days
      await mineBlock();
      await claimShouldSucceed(recipient, grants[0]);
      let multi = await MULTI.balanceOf(recipient)
      let v = new BN(amount).mul(new BN('40')).div(new BN('365'))
      assert.closeTo(numberFromWei(multi), numberFromWei(v), .000000000000000001)
      await claimShouldFail(recipient, grants[0]);

      await timeTravel(TIME_40D); // 40 days
      await mineBlock();
      await claimShouldSucceed(recipient, grants[0]);
      multi = await MULTI.balanceOf(recipient)
      v = new BN(amount).mul(new BN('80')).div(new BN('365'))
      assert.closeTo(numberFromWei(multi), numberFromWei(v), .000000000000000001)
      await claimShouldFail(recipient, grants[0]);

      await timeTravel(TIME_1D * 365);
      await mineBlock();
      await claimShouldSucceed(recipient, grants[0]);
      multi = await MULTI.balanceOf(recipient)
      assert.equal(multi.toString(), amount);
      assert.equal(numberFromWei(multi), 1000000);
    }

    console.log(`
      Vest Mkt 0
    `)
    {
      recipient = presale0;
      const amount = '1000000000000000000000'; // 1K
      await VESTING.addTokenGrant(recipient, 0, amount, presale, 365, 60);
      const grants = await VESTING.getActiveGrants(recipient);
      assert.equal(grants.length, 1, 'wrong number of grants')
      await claimShouldFail(recipient, grants[0]);

      const TIME_40D = TIME_1D * 40;
      await timeTravel(TIME_40D * 2); // 40 days
      await mineBlock();
      await claimShouldSucceed(recipient, grants[0]);
      let multi = await MULTI.balanceOf(recipient)
      let v = new BN(amount).mul(new BN('80')).div(new BN('365'))
      assert.closeTo(numberFromWei(multi), numberFromWei(v), .000000000000000001)
      await claimShouldFail(recipient, grants[0]);

      await timeTravel(TIME_40D); // 40 days
      await mineBlock();
      await claimShouldSucceed(recipient, grants[0]);
      multi = await MULTI.balanceOf(recipient)
      v = new BN(amount).mul(new BN('120')).div(new BN('365'))
      assert.closeTo(numberFromWei(multi), numberFromWei(v), .000000000000000001)
      await claimShouldFail(recipient, grants[0]);

      await timeTravel(TIME_1D * 365);
      await mineBlock();
      await claimShouldSucceed(recipient, grants[0]);
      multi = await MULTI.balanceOf(recipient)
      assert.equal(multi.toString(), amount);
      assert.equal(numberFromWei(multi), 1000);
    }

  });

});