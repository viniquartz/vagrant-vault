const VaultClient = require('node-vault-client');

const vaultClient = VaultClient.boot('main', {
    api: { url: 'http://0.0.0.0:8200/' },
    auth: { 
        type: 'token', // appRole or 'token', 'iam'
        config: { token: process.env.VAULT_TOKEN } 
    },
});

const prefixReadWriteSecret = "service_accounts/data/";
const prefixListSecret = "service_accounts/metadata/";
const sa_account_name = "sa_rotation7";

const AccessKeyId = "update";
const SecretAccessKey = "update";

function readSecret(nameSecret) {
  vaultClient.read(prefixReadWriteSecret+nameSecret).then(v => {
      console.log(v.__data.data);
  }).catch(e => console.log(e.statusCode));
}

function writeUpdateSecret(nameSecret) {
  vaultClient.write(prefixReadWriteSecret+nameSecret, { "data": {"AccessKeyId":AccessKeyId, "SecretAccessKey":SecretAccessKey }} ).then(v => {
      console.log(v);
  }).catch(e => console.error(e));
}

function listSecret(nameSecret) {
  vaultClient.list(prefixListSecret).then(v => {
      //console.log(v.__data.keys);
      const sa = v.__data.keys;
      console.log(sa);
      // sa.forEach(element => {
      //   //console.log(element);
      //   if(element == nameSecret) {
      //     //readSecret(element);
      //     console.log(element, "There is already a secret, let's Update it");
      //     writeUpdateSecret(element);
      //   } 
      //   // if () {
      //   //   console.log(element, "There is no secret, let's Create it");
      //   //   writeUpdateSecret(element);
      //   // }
      // });
  }).catch(e => console.error(e));
}

//listSecret(sa_account_name);
readSecret(sa_account_name);
//writeUpdateSecret(sa_account_name);