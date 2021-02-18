const MultiSwapToken = artifacts.require("MultiSwapToken");
const MultiSwapVesting = artifacts.require("MultiSwapVesting");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {

    const multiSwapToken = await MultiSwapToken.deployed();
    const multiSwapVesting = await MultiSwapVesting.deployed();

    if (addrs.isProduction) {
      const recipient = '0xB23bF2b33eB8036EE3c507dB5ef2F744b09eA76c';
      const amount = '1000000000000000000000'; // 1K
      await multiSwapVesting.addTokenGrant(recipient, 0, amount, addrs.foundersFund, 365, 60);
    }

  });
};
