const MultiSwapToken = artifacts.require("MultiSwapToken");
const MultiSwapVesting = artifacts.require("MultiSwapVesting");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {

    const multiSwapToken = await MultiSwapToken.deployed();
    const multiSwapVesting = await MultiSwapVesting.deployed();

    if (addrs.isProduction) {
      const recipient = '0x8C02706eAb529Da24f91e117d027Ea4D72970e5d';
      const amount = '1000000000000000000000000'; // 1M
      await multiSwapVesting.addTokenGrant(recipient, 0, amount, addrs.foundersFund, 365, 30);
    }

  });
};
