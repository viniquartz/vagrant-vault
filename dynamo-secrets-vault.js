const roleIAM = 'Role4SARtoSecretsManagerToVault';
const VaultClient = require('node-vault-client');
// Function Connection Vault
function connectionVault(namespaceVault){
    const vaultClient = VaultClient.boot(namespaceVault, {
        api: { url: 'http://0.0.0.0:8200/' },
        auth: { 
            type: 'token', // appRole or 'token', 'iam'
            config: { token: process.env.VAULT_TOKEN }
            // type: 'iam',
            // config: {
            //     role: roleIAM,
            //     iam_server_id_header_value: 'vault.service.cnqr.tech',
            //     namespace: namespaceVault, // new option added in my pull request
            //     credentials: new AWS.Credentials({
            //         accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            //         secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            //         sessionToken: process.env.AWS_SESSION_TOKEN,
            //     }),
            // },
        },
    });
    return vaultClient;
}

// Function Disconnect Vault
function disconnectVault(nameVaultClient){
    VaultClient.clear(nameVaultClient);
    console.log(nameVaultClient, "Disconectou!!!");
}

function readSecretVault(nameSecretSM, AccessKeyIdSM, SecretAccessKeySM, namespaceVault, pathSM){
    //connectionVault(process.env.VAULT_TOKEN);
    console.log(namespaceVault+"/"+pathSM+"/"+nameSecretSM);
    connectionVault(namespaceVault).read(namespaceVault+"/"+pathSM+"/"+nameSecretSM).then(v => {
    //vaultClient.read(namespaceVault+"/"+pathSM+"/"+nameSecretSM).then(v => {
        //console.log(v.__data.data);
        console.log(namespaceVault, "Conectou!!!");
        if (v.__data.data.AccessKeyId == AccessKeyIdSM) {
            console.log(nameSecretSM, "Keep this version");
            disconnectVault(namespaceVault);
        } else {
            writeUpdateSecret(nameSecretSM, AccessKeyIdSM, SecretAccessKeySM, pathSM);
            //console.log(nameSecretSM, AccessKeyIdSM, SecretAccessKeySM, pathSM);
            //disconnectVault(namespaceVault);
        }
    }).catch(e => {
        console.log(nameSecretSM, "There is no secret in Vault", e.statusCode, "Creating");
        writeUpdateSecret(nameSecretSM, AccessKeyIdSM, SecretAccessKeySM, pathSM);
        //disconnectVault(namespaceVault);    
    });

    function writeUpdateSecret(nameSecretVault, AccessKeyIdVault, SecretAccessKeyVault, pathVault) {
        connectionVault(process.env.VAULT_TOKEN).write(namespaceVault+"/"+pathVault+"/"+nameSecretVault, { "data": {"AccessKeyId":AccessKeyIdVault, "SecretAccessKey":SecretAccessKeyVault }} ).then(v => {
            console.log(nameSecretVault, "Created");
            disconnectVault(namespaceVault);
        }).catch(e => console.error(e));
    }
}

// AWS
var AWS = require("aws-sdk");
AWS.config.update({region: 'us-east-1'});
AWS.config.getCredentials(function(err) {
if (err) {
    console.log(err.stack);
} else {
    //console.log("Connected");
}
});

// query dynamodb to get service_accounts
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
var paramsDynamoDB = {
    RequestItems: {
    'service_accounts': {
        Keys: [
        {'id': {N: '1'}},
        {'id': {N: '2'}},
        {'id': {N: '3'}}
        ],
    }
    }
};

// SecretsManager
var sm = new AWS.SecretsManager({apiVersion: '2017-10-17'});
function getSecretsManager(valueSMName, valueNamespace, valuePath) {
    var paramsGet = {
        SecretId: valueSMName
    };
    sm.getSecretValue(paramsGet, function(err, data) {
        if (err) {
            console.log("Error", err.message);
        } else {
            let valueSecret = data.SecretString.split(',');
            // AccessKeyId Split
            let valueAccessKeyID = valueSecret[0].split(':',2);
            valueAccessKeyID = valueAccessKeyID[1];
            // SecretAccessKey split
            let valueSecretAccessKey = valueSecret[1].split(':',2);
            valueSecretAccessKey = valueSecretAccessKey[1].split('}',1).toString();

            valueSMName = valueSMName.split('/');
            readSecretVault(valueSMName[1], valueAccessKeyID, valueSecretAccessKey, valueNamespace, valuePath);
            //console.log(valueSMName[1], valueAccessKeyID, valueSecretAccessKey, valueNamespace, valuePath);
        }
    });
}

ddb.batchGetItem(paramsDynamoDB, function(err, data) {
    if (err) {
        console.log("Error", err.message);
    } else {
        //service_accounts is table name in dynamodb
        // for (let element = 0; element < data.Responses.service_accounts.length; element++){
        //     let saName = data.Responses.service_accounts[element].name.S;
        //     let saNamespace = data.Responses.service_accounts[element].namespace.S;
        //     let saPath = data.Responses.service_accounts[element].path.S;
        //     getSecretsManager(saPath+"/"+saName, saNamespace, saPath);
        // }
        data.Responses.service_accounts.forEach(function(element, index, array) {
            let saName = element.name.S;
            let saNamespace = element.namespace.S;
            let saPath = element.path.S;
            getSecretsManager(saPath+"/"+saName, saNamespace, saPath);
        });
    }
});