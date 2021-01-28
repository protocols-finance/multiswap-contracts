const MultiSwapToken = artifacts.require("MultiSwapToken");
const Timelock2Days = artifacts.require("Timelock2Days");
const IERC20 = artifacts.require("IERC20");
const MultiSwap = artifacts.require("MultiSwap");
const DummyBTC = artifacts.require("DummyBTC");
const DummyETH = artifacts.require("DummyETH");
const DummyUSDC = artifacts.require("DummyUSDC");
const AggregatorV3Interface = artifacts.require("AggregatorV3Interface");

const BN = require('bn.js');
const { assert } = require('chai');

contract("MultiSwap Test", async accounts => {

  let DETH;
  let DBTC;
  let DUSDC;
  let MULTI;
  let LINK;
  let mulitSwap;
  let timelock;

  const admin = accounts[0];
  const member1 = accounts[1];
  const member2 = accounts[2];
  const member3 = accounts[3];
  const fund = admin;
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

  const ETHUSD = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419'
  const BTCUSD = '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c'

  const getPrice = async (pair) => {
    const agg = await AggregatorV3Interface.at(pair);
    return await agg.latestRoundData();
  }

  const getPriceEthUsd = async () => {
    return (await getPrice(ETHUSD)).answer
  }

  const getPriceBtcUsd = async () => {
    return (await getPrice(BTCUSD)).answer
  }

  const getPriceUsdcUsd = async () => {
    return new BN('1')
  }

  const reservesShouldFail = async (token) => {
    try {
      await multiSwap.reserves(token);
      assert.isFalse(true, 'should have failed');
    } catch (e) {
    }
  }

  beforeEach(async () => {
    MULTI = await MultiSwapToken.deployed();
    console.log('MULTI', MULTI.address);
    timelock = await Timelock2Days.deployed();
    multiSwap = await MultiSwap.deployed();
    DBTC = await DummyBTC.deployed();
    DETH = await DummyETH.deployed();
    DUSDC = await DummyUSDC.deployed();
  });

  it("MultiSwap Tests", async () => {
    
    console.log(`
      Deposit collateral, do some swaps, withdraw
    `)

    let eth = await getPriceEthUsd();
    let btc = await getPriceBtcUsd();
    console.log('eth', usdFromWei(eth));
    console.log('btc', usdFromWei(btc));

    await DETH.mint(dev, toWei(new BN('100000')))
    await DBTC.mint(dev, toWei(new BN('100000')))
    await DUSDC.mint(dev, toWei(new BN('10000000000')))

    await DBTC.mint(member1, toWei(new BN('100000')))
    await DETH.mint(member1, toWei(new BN('100000')))
    await DUSDC.mint(member1, toWei(new BN('10000000000')))

    await DETH.approve(multiSwap.address, web3.utils.toWei('10000000'));
    await DETH.approve(multiSwap.address, web3.utils.toWei('10000000'), {from: member1});
    await DBTC.approve(multiSwap.address, web3.utils.toWei('10000000'));
    await DBTC.approve(multiSwap.address, web3.utils.toWei('10000000'), {from: member1});
    await DUSDC.approve(multiSwap.address, web3.utils.toWei('10000000000'));
    await DUSDC.approve(multiSwap.address, web3.utils.toWei('10000000000'), {from: member1});

    await multiSwap.allowCollateral(DETH.address);
    await multiSwap.allowCollateral(DBTC.address);
    await multiSwap.allowCollateral(DUSDC.address);

    const tokens = await multiSwap.tokens();
    console.log('tokens', tokens);
    const nTokens = tokens.length;

    const collaterals = [
      toWei(new BN('1000')),
      toWei(new BN('135')),
      toWei(new BN('4234567')),
    ];
    const amounts = [
      new BN('1000').mul(usdToWei(eth)),
      new BN('135').mul(usdToWei(btc)),
      toWei(new BN('4234567')),
    ]
    await multiSwap.initialize(collaterals, amounts);
    let dswpDev = await multiSwap.balanceOf(dev);
    logEther('dswp dev', dswpDev);

    const showReserves = async () => {
      const pairEth = await multiSwap.reserves(DETH.address);
      const pairBtc = await multiSwap.reserves(DBTC.address);
      const pairUsdc = await multiSwap.reserves(DUSDC.address);
      logEther('pairEth[0]', pairEth[0]);
      logEther('pairEth[1]', pairEth[1]);
      logEther('pairBtc[0]', pairBtc[0]);
      logEther('pairBtc[1]', pairBtc[1]);
      logEther('pairUsdc[0]', pairUsdc[0]);
      logEther('pairUsdc[1]', pairUsdc[1]);
    }
    await showReserves();

    const dbtcDep = await DBTC.balanceOf(multiSwap.address);
    logEther('DBTC Deposited', dbtcDep);
    const dethDep = await DETH.balanceOf(multiSwap.address);
    logEther('DETH Deposited', dethDep);
    const dusdcDep = await DUSDC.balanceOf(multiSwap.address);
    logEther('DUSDC Deposited', dusdcDep);

    const pct = new BN('2500');
    const pctBase = new BN('10000');
    const quotes = await multiSwap.quoteAmounts(pct);
    console.log('quoteAmounts', quotes);
    const liquidity = quotes[nTokens];
    logEther('liquidity', liquidity);

    // deposit 25% more
    // TODO need to check quotes to make sure they are within tollerances
    await multiSwap.deposit(pct, quotes, {from: member1});
    let dswpMember1 = await multiSwap.balanceOf(member1);
    logEther('member1', dswpMember1);

    const dbtcDepAft = await DBTC.balanceOf(multiSwap.address);
    logEther('DBTC Deposited', dbtcDep);
    const dethDepAft = await DETH.balanceOf(multiSwap.address);
    logEther('DETH Deposited', dethDep);
    const dusdcDepAft = await DUSDC.balanceOf(multiSwap.address);
    logEther('DUSDC Deposited', dusdcDep);

    const dbtcAmt = dbtcDepAft.sub(dbtcDep);
    const dethAmt = dethDepAft.sub(dethDep);
    const dusdcAmt = dusdcDepAft.sub(dusdcDep);

    const dbtcExp = dbtcDep.mul(pct).div(pctBase);
    const dethExp = dethDep.mul(pct).div(pctBase);
    const dusdcExp = dusdcDep.mul(pct).div(pctBase);
    
    assert.isTrue(dbtcExp.eq(dbtcAmt));
    assert.isTrue(dethExp.eq(dethAmt));
    assert.isTrue(dusdcExp.eq(dusdcAmt));

    console.log('----------------------')
    console.log('----------------------')
    console.log('----------------------')

    const amt = await multiSwap.getAmountOut(DETH.address, DUSDC.address, toWei('.5'));
    const slip = amt.mul(new BN('200')).div(pctBase); // 2% slippage
    await multiSwap.swap(DETH.address, DUSDC.address, toWei('.5'), amt.sub(slip));
    let dethBef = await DETH.balanceOf(dev);
    let dusdcBef = await DUSDC.balanceOf(dev);
    await multiSwap.swap(DETH.address, DUSDC.address, toWei('.01'), new BN('1'));
    let dusdcAft = await DUSDC.balanceOf(dev);
    let dethAft = await DETH.balanceOf(dev);
    logEther('DETH after', dethAft.sub(dethBef));
    logEther('DUSDC after', dusdcAft.sub(dusdcBef));

    const withDevs = await multiSwap.withdrawAmounts(dswpDev);
    withDevs.map(w => logEther('outDev', w))
    await multiSwap.withdraw(dswpDev, withDevs);
    const withMember1 = await multiSwap.withdrawAmounts(dswpMember1, {from: member1});
    withMember1.map(w => logEther('outMember1', w))
    await multiSwap.withdraw(dswpMember1, withMember1, {from: member1});
    const remDev = await multiSwap.balanceOf(dev);
    const remMember1 = await multiSwap.balanceOf(member1);
    assert.isTrue(remDev.isZero(), 'dev share should be 0');
    assert.isTrue(remMember1.isZero(), 'member1 share should be 0');

    await reservesShouldFail(DBTC.address);
    await reservesShouldFail(DETH.address);
    await reservesShouldFail(DUSDC.address);


    {
      console.log(`
        More deposits, partial withdrawals
      `)
      const collaterals = [
        toWei(new BN('1000')),
        toWei(new BN('135')),
        toWei(new BN('4234567')),
      ];
      const amounts = [
        new BN('1000').mul(usdToWei(eth)),
        new BN('135').mul(usdToWei(btc)),
        toWei(new BN('4234567')),
      ]
      await multiSwap.initialize(collaterals, amounts);
      let dswpDev = await multiSwap.balanceOf(dev);
      logEther('dswp dev', dswpDev);

      const pct = new BN('2500');
      const pctBase = new BN('10000');
      const quotes = await multiSwap.quoteAmounts(pct);
      console.log('quoteAmounts', quotes);
      const liquidity = quotes[nTokens];
      logEther('liquidity', liquidity);

      // deposit 25% more
      // TODO need to check quotes to make sure they are within tollerances
      await multiSwap.deposit(pct, quotes, {from: member1});
      let dswpMember1 = await multiSwap.balanceOf(member1);
      logEther('member1', dswpMember1);

      const half = dswpDev.div(new BN('2'))
      let withDevs = await multiSwap.withdrawAmounts(half);
      withDevs.map(w => logEther('outDev', w));
      await multiSwap.withdraw(half, withDevs);
      const rest = dswpDev.sub(half);
      withDevs = await multiSwap.withdrawAmounts(rest);
      withDevs.map(w => logEther('outDev', w));
      await multiSwap.withdraw(rest, withDevs);

      const withMember1 = await multiSwap.withdrawAmounts(dswpMember1, {from: member1});
      withMember1.map(w => logEther('outMember1', w))
      await multiSwap.withdraw(dswpMember1, withMember1, {from: member1});
  
      const remDev = await multiSwap.balanceOf(dev);
      const remMember1 = await multiSwap.balanceOf(member1);
      assert.isTrue(remDev.isZero(), 'dev share should be 0');
      assert.isTrue(remMember1.isZero(), 'member1 share should be 0');
  
      await reservesShouldFail(DBTC.address);
      await reservesShouldFail(DETH.address);
      await reservesShouldFail(DUSDC.address);
    }
  });



});