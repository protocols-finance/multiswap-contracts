const MultiSwapToken = artifacts.require("MultiSwapToken");
const MultiSwapVesting = artifacts.require("MultiSwapVesting");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {
    // MultiSwapToken contract
    const multiSwapToken = await MultiSwapToken.deployed();
    const multiSwapVesting = await deployer.deploy(MultiSwapVesting, multiSwapToken.address, addrs.deployer);
    console.log(`MultiSwapVesting: '${multiSwapVesting.address}',`);

  });
};
