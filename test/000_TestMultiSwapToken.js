const MultiSwapToken = artifacts.require("MultiSwapToken");

const BN = require('bn.js');
const { assert } = require('chai');

contract("MultiSwap Test", async accounts => {

  let MULTI;

  const admin = accounts[0];
  const presale = accounts[1];
  const lge = accounts[2];
  const founders = accounts[3];
  const fundraising = accounts[4];
  const general = accounts[5];
  const community = accounts[6];
  const dev = admin;
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

  const usdToWei = (usd) => usd.mul(new BN('10000000000'))

  const usdFromWei = (wei) => {
    return Number(web3.utils.fromWei(wei.toString(), 'gwei')) * 10;
  }

  const timeTravel = function (time) {
    return new Promise((resolve, reject) => {
      const id = new Date().getTime()
      console.log('evm_increaseTime bef', id, time);
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [time], // 86400 is num seconds in day
        id
      }, (err, result) => {
        if(err){ return reject(err) }
        const id = new Date().getTime();
        console.log('evm_increaseTime aft', id);
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
  });

  it("MultiSwapToken Tests", async () => {
    
    console.log(`
      Check minting is correct
    `)

    const PRESALE_FUND = toWei('5000000');
    const LGE_FUND = toWei('5000000');
    const FOUNDERS_FUND = toWei('15000000');
    const FUNDRAISING_FUND = toWei('5000000');
    const GENERAL_FUND = toWei('5000000');
    const COMMUNITY_FUND = toWei('65000000');

    const presaleBal = await MULTI.balanceOf(presale);
    assert.equal(presaleBal.toString(), PRESALE_FUND.toString());
    const lgeBal = await MULTI.balanceOf(lge);
    assert.equal(lgeBal.toString(), LGE_FUND.toString());
    const foundersBal = await MULTI.balanceOf(founders);
    assert.equal(foundersBal.toString(), FOUNDERS_FUND.toString());
    const fundraisingBal = await MULTI.balanceOf(fundraising);
    assert.equal(fundraisingBal.toString(), FUNDRAISING_FUND.toString());
    const generalBal = await MULTI.balanceOf(general);
    assert.equal(generalBal.toString(), GENERAL_FUND.toString());
    const communityBal = await MULTI.balanceOf(community);
    assert.equal(communityBal.toString(), COMMUNITY_FUND.toString());
  });

});