const MultiSwapToken = artifacts.require("MultiSwapToken");
const MultiSwapLGE = artifacts.require("MultiSwapLGE");
const Timelock2Days = artifacts.require("Timelock2Days");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {
    const timelock2Days = await Timelock2Days.deployed();
    // MultiSwapToken contract
    const multiSwapToken = await deployer.deploy(MultiSwapToken, "MultiSwap", "MULTI", addrs.deployer);
    console.log(`MultiSwapToken: '${multiSwapToken.address}',`);
    // MultiSwapTokenLGE contract
    const multiSwapLGE = await deployer.deploy(MultiSwapLGE, multiSwapToken.address, timelock2Days.address, addrs.general);
    console.log(`MultiSwapLGE: '${multiSwapLGE.address}',`);

    await multiSwapToken.setLGE(MultiSwapLGE.address);
    await multiSwapToken.transferOwnership(timelock2Days.address);
  });
};
