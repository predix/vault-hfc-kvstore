'use strict';

var bluebird = require('bluebird');
var request = require('request');
var debug = require('debug')('vault-hfc-kv');
const defaultTimeout = 5000;

module.exports = {
    newVaultKeyValStore: newVaultKeyValStore
}

var pGet = bluebird.promisify(request.get);
var pPost = bluebird.promisify(request.post);

function VaultKeyValueStore(vaultUrl, vaultToken, timeout) {
    this.timeout = timeout;
    this.vaultUrl = vaultUrl;
    this.vaultHeaders = {
        'X-Vault-Token': vaultToken
    };
}

VaultKeyValueStore.prototype.setValue = function (name, value, cb) {
    debug('Setting value for', name);
    var path = this.vaultUrl + '/' + name;
    var body = {
        'state': value
    };
    pPost({
        url: path,
        json: body,
        headers: this.vaultHeaders,
        timeout: this.timeout
    }).then(function (response) {
        debug('Received response from vault', response.statusCode);
        if (response.statusCode != 204) {
            cb(new Error('Failed to persist with status code ' + response.statusCode));
        } else {
            cb();
        }
    }).catch(function (err) {
        debug('Error when saving in vault', err);
        cb(err);
    })
    debug('Setting value for', name, 'done');
}

VaultKeyValueStore.prototype.getValue = function (name, cb) {
    debug('Getting value for', name);
    var path = this.vaultUrl + '/' + name;
    pGet({
        url: path,
        headers: this.vaultHeaders,
        timeout: this.timeout
    }).then(function (response) {
         debug('Received response from vault', response.statusCode);
         if (response.statusCode == 404) {
             cb(null, null);
         } else if (response.statusCode != 200) {
             cb(new Error('Failed to read from vault with status code ' + response.statusCode));
         } else {
             var responseJson = JSON.parse(response.body);
             cb(null, responseJson.data.state);
         }
    }).catch(function (err) {
        debug('Error when getting state from vault', err);
        cb(err);
    })
}

/**
 * Initialize a new instance of VaultKeyValueStore. It provides the same interface as expected by hfc.
 * 
 * @param {String} vaultUrl URL of hashicorp vault in following format <scheme>://<hostname>:<port>/<path>
 * @param {String} vaultToken Token to be used in header to store and retrieve certs
 */
function newVaultKeyValStore(vaultUrl, vaultToken, timeout=defaultTimeout) {
    return new VaultKeyValueStore(vaultUrl, vaultToken, timeout);
}