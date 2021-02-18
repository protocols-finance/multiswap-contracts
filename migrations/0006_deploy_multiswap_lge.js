const MultiSwapToken = artifacts.require("MultiSwapToken");
const MultiSwapLGE = artifacts.require("MultiSwapLGE");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {
    const multiSwapToken = await MultiSwapToken.deployed();
    const multiSwapLGE = await deployer.deploy(MultiSwapLGE, multiSwapToken.address, addrs.deployer, addrs.lgeFund);
    console.log(`MultiSwapLGE: '${multiSwapLGE.address}',`);
  });
};
