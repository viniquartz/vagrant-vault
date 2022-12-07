var AWS = require("aws-sdk");
AWS.config.getCredentials(function(err) {
if (err) console.log(err.stack);
else {
    console.log("Connected");
}
});

AWS.config.update({region: 'us-east-1'});

var sm = new AWS.SecretsManager({apiVersion: '2017-10-17'});
const prefix = "service_accounts/"

function createSecret(nameCreate) {
    var paramsCreate = {
        Name: nameCreate,
        Description: "my secret test",
        SecretString: "{\'AccessKeyId\':\'id\',\SecretAccessKey\':\'secret\'}"
    };

    sm.createSecret(paramsCreate, function(err, data) {
        if (err) {
            console.log("Error", err.message);
        } else {
            console.log(data);
        }
    });
}

function getSecret(nameGet) {
    var paramsGet = {
        SecretId: nameGet
    };

    sm.getSecretValue(paramsGet, function(err, data) {
        if (err) {
            console.log("Error", err.message);
        } else {
            console.log(data.Name, data.SecretString);
        }
    });
}

function updateSecret(nameWrite) {
    var paramsPut = {
        SecretId: nameWrite,
        SecretString: "{\AccessKeyId\:\id_write2\, \SecretAccessKey\:\secret_write2\}"
    };

    sm.putSecretValue(paramsPut, function(err, data) {
        if (err) {
            console.log("Error", err.message);
        } else {
            console.log(data);
        }
    });
}

function deleteSecret(nameDelete) {
    var paramsDelete = {
        RecoveryWindowInDays: 7, 
        SecretId: nameDelete
    };

    sm.deleteSecret(paramsDelete, function(err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log(data);
        }
    });
}

function listCreateUpdate(nameList) {
    var paramsListCreateUpdate = {
        Filters:[
            {
                Key: "all",
                Values: [
                    nameList,
                ]
            },
        ]
    };

    sm.listSecrets(paramsListCreateUpdate, function(err, data) {
        if (err) {
            console.log("Error", err.message);
        } else {
            //console.log(data.SecretList[0].Name);
            //console.log(data);
            if(data.SecretList[0]){
                //console.log(data.SecretList[0]);
                console.log("existe, vamos alterar");
                updateSecret(nameList);
            } else {
                console.log("nao existe, vamos criar");
                createSecret(nameList);
            }
        }
    });
}

//createSecret();
//getSecret();
// updateSecret(prefix+"sa_rotation2");
// updateSecret(prefix+"sa_rotation3");
// updateSecret(prefix+"sa_rotation8");
//deleteSecret(prefix+"sa_rotation4");
listCreateUpdate(prefix+"sa_rotation2");
listCreateUpdate(prefix+"sa_rotation3");
listCreateUpdate(prefix+"sa_rotation8");