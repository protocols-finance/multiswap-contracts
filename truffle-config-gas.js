module.exports = {
  compilers: {
    solc: {
      version: "0.6.12",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  },
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8546,
      network_id: "*"
    },
    test: {
      host: "127.0.0.1",
      port: 8546,
      network_id: "*"
    }
  },
  mocha: {
    reporter: 'eth-gas-reporter',
    reporterOptions : { 
      currency: 'USD',
      url: 'http://127.0.0.1:8546'
    }
  },
  plugins: ["truffle-contract-size"]
};
