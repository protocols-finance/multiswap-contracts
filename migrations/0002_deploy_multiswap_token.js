const MultiSwapToken = artifacts.require("MultiSwapToken");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {
    // MultiSwapToken contract
    const multiSwapToken = await deployer.deploy(MultiSwapToken, "MultiSwap", "MULTI", addrs.presaleFund, addrs.lgeFund, addrs.foundersFund, addrs.fundraisingFund, addrs.generalFund, addrs.communityFund);
    console.log(`MultiSwapToken: '${multiSwapToken.address}',`);
  });
};
