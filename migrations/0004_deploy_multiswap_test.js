const MultiSwap = artifacts.require("MultiSwap");
const DummyBTC = artifacts.require("DummyBTC");
const DummyETH = artifacts.require("DummyETH");
const DummyUSDC = artifacts.require("DummyUSDC");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {

    if (addrs.isDev) {
      const multiSwap = await deployer.deploy(MultiSwap, "MultiSwap", "MSWP", addrs.deployer);
      console.log(`MultiSwap: '${multiSwap.address}',`);
      const dummyBTC = await deployer.deploy(DummyBTC, "DummyBTC", "DBTC", 18, addrs.deployer);
      console.log(`DummyBTC: '${dummyBTC.address}',`);
      const dummyETH = await deployer.deploy(DummyETH, "DummyETH", "DETH", 18, addrs.deployer);
      console.log(`DummyETH: '${dummyETH.address}',`);
      const dummyUSDC = await deployer.deploy(DummyUSDC, "DummyUSDC", "DUSDC", 6, addrs.deployer);
      console.log(`DummyUSDC: '${dummyUSDC.address}',`);
    }
  });
};
