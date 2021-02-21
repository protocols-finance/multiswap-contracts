require('dotenv').config();

module.exports = function(accounts, network) {
  const isProduction = network === 'mainnet';
  const isDev = !isProduction;
  let dev;
  let presaleFund;
  let lgeFund;
  let foundersFund;
  let fundraisingFund;
  let generalFund;
  let communityFund;
  let timelock;
  let deployer = accounts[0]
  switch (network) {
    case 'mainnet':
      presaleFund = process.env.MAINNET_PRESALE_FUND;
      lgeFund = process.env.MAINNET_LGE_FUND;
      foundersFund = process.env.MAINNET_FOUNDERS_FUND;
      fundraisingFund = process.env.MAINNET_FUNDRAISING_FUND;
      generalFund = process.env.MAINNET_GENERAL_FUND;
      communityFund = process.env.MAINNET_COMMUNITY_FUND;
      timelock = process.env.MAINNET_TIMELOCK;
      break;
    case 'rinkeby':
      dev = accounts[0];
      presaleFund = accounts[1];
      lgeFund = accounts[2];
      foundersFund = accounts[3];
      fundraisingFund = accounts[4];
      generalFund = accounts[5];
      communityFund = accounts[6];
      timelock = accounts[0];
      break;
    default:
      dev = accounts[0];
      presaleFund = accounts[1];
      lgeFund = accounts[2];
      foundersFund = accounts[3];
      fundraisingFund = accounts[4];
      generalFund = accounts[5];
      communityFund = accounts[6];
      timelock = accounts[0];
  }

  return {
    isProduction,
    isDev,
    dev,
    presaleFund,
    lgeFund,
    foundersFund,
    fundraisingFund,
    generalFund,
    communityFund,
    timelock,
    deployer,
  };
}
