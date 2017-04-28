# Vault HFC KeyValueStore
This node module provides KeyValueStore implementation backed by [hashicorp vault](https://www.vaultproject.io/) for [Hyperledger Fabric Client SDK](https://www.npmjs.com/package/hfc). This allows the nodejs clients of hyperledger to store the ECerts in vault instead of on file system thereby making it more secure and cloud friendly.

## How to use it
1. Install the node module
    ```
    npm install vault-hfc-kvstore
    ```
1. Import the module
    ```
    var vaultkv = require('vault-hfc-kvstore');
    ```
1. Create an instance of vault KeyValueStore
    ```
    var vault = vaultkv.newVaultKeyValStore(vaultUrl, vaultToken);
    ```
1. Set the keyValueStore on chain instance
    ```
    var chain = hfc.newChain(chainName);
    // Other initializations for chain
    chain.setKeyValStore(vault);∏
    ```