// SPDX-License-Identifier: Apache-2.0-with-multiswap-clause
pragma solidity >=0.6.12;

import "@openzeppelin/contracts/utils/Address.sol";
import '../Ownable.sol';

contract Whitelist is Ownable {
  using Address for address;

  bool _startWhitelist;
  mapping (address => bool) _whitelist;
  mapping (address => bool) _blacklist;

  constructor (address owner, bool startWhitelist) public Ownable(owner) {
    _startWhitelist = startWhitelist;
  }

  modifier onlyWhitelist() {
    require(!_blacklist[msg.sender] && (!_startWhitelist || !Address.isContract(msg.sender) || _whitelist[msg.sender]), "!whitelist");
    _;
  }

  function stopWhitelist() onlyOwner external {
    _startWhitelist = false;
  }

  function startWhitelist() onlyOwner external {
    _startWhitelist = true;
  }

  function addWhitelist(address c) onlyOwner external {
    _addWhitelist(c);
  }

  function _addWhitelist(address c) internal {
    require(c != address(0), '!contract');
    _whitelist[c] = true;
  }

  function removeWhitelist(address c) onlyOwner external {
    _removeWhitelist(c);
  }
  
  function _removeWhitelist(address c) internal {
    require(c != address(0), '!contract');
    _whitelist[c] = false;
  }

  function _isWhitelisted(address c) internal view returns (bool){
    require(c != address(0), '!contract');
    return _whitelist[c];
  }
  
  function addBlacklist(address c) onlyOwner external {
    _addBlacklist(c);
  }
  
  function _addBlacklist(address c) internal {
    require(c != address(0), '!contract');
    _blacklist[c] = true;
  }
  
  function removeBlacklist(address c) onlyOwner external {
    _removeWhitelist(c);
  }

  function _removeBlacklist(address c) internal {
    require(c != address(0), '!contract');
    _blacklist[c] = false;
  }

  function _isBlacklisted(address c) internal view returns (bool) {
    require(c != address(0), '!contract');
    return _blacklist[c];
  }
  
}
