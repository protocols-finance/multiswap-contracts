const MultiSwapToken = artifacts.require("MultiSwapToken");
const LGEContract = artifacts.require("LGE");

module.exports = async function (deployer, network, accounts) {
  const addrs = require('./utils/accounts.js')(accounts, network);

  deployer.then(async () => {
    const multiSwapToken = await MultiSwapToken.deployed();
    const LGE = await deployer.deploy(LGEContract, multiSwapToken.address, addrs.deployer, addrs.lgeFund);
    console.log(`LGE: '${LGE.address}',`);
  });
};
