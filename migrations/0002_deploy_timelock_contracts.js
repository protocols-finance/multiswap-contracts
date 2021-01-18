const Timelock2Days = artifacts.require("Timelock2Days");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);
  console.log('accounts', addrs);

  deployer.then(async () => {
    // Timelocks
    const timelock2Days = await deployer.deploy(Timelock2Days, addrs.timelock);
    console.log(`Timelock2Days: '${timelock2Days.address}',`);
  });
};
