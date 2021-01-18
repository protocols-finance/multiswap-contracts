require('dotenv').config();

module.exports = function(accounts, network) {
  const isProduction = network === 'mainnet';
  const isDev = !isProduction;
  let dev;
  let timelock;
  let deployer = accounts[0]
  switch (network) {
    case 'mainnet':
      dev = process.env.MAINNET_DEV;
      general = process.env.MAINNET_GENERAL;
      timelock = process.env.MAINNET_TIMELOCK;
      break;
    case 'rinkeby':
      dev = accounts[0];
      general = accounts[0];
      timelock = accounts[0];
      break;
    default:
      dev = accounts[0];
      general = accounts[0];
      timelock = accounts[0];
  }

  return {
    isProduction,
    isDev,
    dev,
    general,
    timelock,
    deployer,
  };
}
