// Date
let currentDate = new Date();
// Format date object into a YYYY-MM-DD string
const formatDate = (currentDate) => (currentDate.toISOString().split('T'[0]));
// Values in milliseconds
const currentDateInMS = currentDate.valueOf();
let timeInactiveInMs;
let calculetedDateInactive;
let timeRotationInMs;
let calculetedDateRotation;

var AWS = require("aws-sdk");
AWS.config.update({region: 'us-east-1'});
AWS.config.getCredentials(function(err) {
    if (err) {
        console.log(err.stack);
    }
    else {
    }
});
var iam = new AWS.IAM({apiVersion: '2010-05-08'});

// query dynamodb to get service_accounts
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
var paramsDynamoDB = {
    RequestItems: {
    'service_accounts': {
        Keys: [
        {'id': {N: '1'}}//,
        //{'id': {N: '2'}},
        //{'id': {N: '3'}}
        ],
    }
    }
};

// SecretsManager
const prefixSecretStringOne = "{\'AccessKeyId\':\'";
const prefixSecretStringTwo = "\',\SecretAccessKey\':\'";
const prefixSecretStringThree = "\'}";
var sm = new AWS.SecretsManager({apiVersion: '2017-10-17'});
// Function create secret manager
function createSecret(secretNameCreate, valueSecreStringCreate) {
    var paramsCreate = {
        Name: secretNameCreate,
        Description: "AccessKeyId and SecretAccessKey of "+secretNameCreate,
        SecretString: valueSecreStringCreate
    };
    //console.log(secretNameCreate, valueSecreStringCreate);
    sm.createSecret(paramsCreate, function(err, data) {
        if (err) {
            console.log("Error", err.message);
        } else {
            console.log(data);
        }
    });
}
// Function update secret manager
function updateSecret(secretNameWrite, valueSecreStringWrite) {
    var paramsPut = {
        SecretId: secretNameWrite,
        SecretString: valueSecreStringWrite
    };
    //console.log(secretNameWrite, valueSecreStringWrite);
    sm.putSecretValue(paramsPut, function(err, data) {
        if (err) {
            console.log("Error", err.message);
        } else {
            console.log(data);
        }
    });
}
// Function manage
function listCreateUpdate(nameList, valueSecreString) {
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
    //console.log(nameList, valueSecreString);
    sm.listSecrets(paramsListCreateUpdate, function(err, data) {
        if (err) {
            console.log("Error", err.message);
        } else {
            //console.log(data.SecretList[0].Name);
            //console.log(data);
            if(data.SecretList[0]){
                //console.log(data.SecretList[0]);
                console.log("There is already a secret, let's change it");
                updateSecret(nameList, valueSecreString);
            } else {
                console.log("There is no secret, let's create");
                createSecret(nameList, valueSecreString);
            }
        }
    });
}

// Function TAGS
function getTags(saName, saPath){
    var users = [
        {UserName: saName},
    ];
    users.forEach(user => {
        iam.listUserTags(user, function(err, data) {
            if (err) {
                console.log("Error get tags", err.message);
            } else {
                //console.log("####", saName, "####");
                var listTags = data.Tags || [];
                listTags.forEach(function(tag) {
                    if(tag.Key == 'timeToInactive') {
                        timeInactive = tag.Value;
                        //console.log("Time to Inactive:", timeInactive);
                        timeInactiveInMs = 1000 * 60 * 60 * 24 * timeInactive;
                        calculetedDateInactive = new Date(currentDateInMS - timeInactiveInMs);
                    }
                    if (tag.Key == 'timeToRotation'){
                        timeRotation = tag.Value;
                        //console.log("Time to Rotation:", timeRotation);
                        timeRotationInMs = 1000 * 60 * 60 * 24 * timeRotation;
                        calculetedDateRotation = new Date(currentDateInMS - timeRotationInMs);
                    }
                    if (tag.Key == 'whereToUpdate'){
                        whereUpdate = tag.Value;
                        //console.log("Where to Update:", whereUpdate);
                    }
                });
                listAccessKeys(saName, saPath);
            }
        });
    });
    //return calculetedDateInactive, calculetedDateRotation;
    //console.log(saName, saPath); 
}

// Function Delete AccessKey
function deleteAccessKey(saName, saAccessKeyId){
    var paramDeleteAccessKey = {
        UserName: saName,
        AccessKeyId: saAccessKeyId
    };
    iam.deleteAccessKey(paramDeleteAccessKey, function(err, data) {
        if (err) {
        console.log("Error", err);
        } else {
        console.log("Delete this AccessKey", paramDeleteAccessKey, "\n", data);
        }
    });
}

// Function Create AccessKey
function createAccessKey(saName, saPath){
    var paramCreateAccessKey = {
        UserName: saName,
    };
    iam.createAccessKey(paramCreateAccessKey, function(err, data) {
        if (err) {
            console.log(saName, err.message);
        } else {
            var newAccessKey = {
                UserName: data.AccessKey.UserName,
                AccessKeyId: data.AccessKey.AccessKeyId,
                SecretAccessKey: data.AccessKey.SecretAccessKey,
                CreateDate: data.AccessKey.CreateDate
            };
            // Console
            console.log("New AccessKey created to", data.AccessKey.UserName, "user");
            console.log(newAccessKey);
            listCreateUpdate(saPath+"/"+data.AccessKey.UserName, prefixSecretStringOne+data.AccessKey.AccessKeyId+prefixSecretStringTwo+data.AccessKey.SecretAccessKey+prefixSecretStringThree);
        }
    });
}

// Function Keep AccessKey
function KeepAccessKey(saName, AccessKeyId, createDate, status){
    console.log("####", saName, "####");
    console.log("AccessKeyId:", AccessKeyId, "CreatedDate:", createDate, "Status:", status);
    console.log("Keep this AccessKey", "\n");
}

// Function Update Status AccessKey
function updateStatusAccessKey(saName, AccessKeyId, lastUsed){
    console.log("update");
    var paramsUpdateStatusAccessKey = {
        Status: 'Inactive',
        UserName: saName,
        AccessKeyId: AccessKeyId
    };
    iam.updateAccessKey(paramsUpdateStatusAccessKey, function(err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Access Key ID is not in use");
            console.log("Disable this AccessKey");
            console.log("service_account:", saName, "AccessKeyId:", AccessKeyId, "LastUsed:", lastUsed, "\n");
            console.log("Inactive", data);
        }
    });
}

// Function Last Used AccessKey
function lastUsedAccessKey(saName, AccessKeyId){
    var paramlastUsedAccessKey = {
        AccessKeyId: AccessKeyId,
    };
    console.log("estamos em last used");
    iam.getAccessKeyLastUsed(paramlastUsedAccessKey, function(err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            outputLastUsed = data.AccessKeyLastUsed.LastUsedDate;
            if (outputLastUsed > calculetedDateInactive || outputLastUsed == '') {
                console.log("Access Key ID is in use");
            } else { 
                updateStatusAccessKey(saName, AccessKeyId, outputLastUsed);
            }
        }
    });
}

// Function listAccessKeys
function listAccessKeys(saName, saPath){
    var users = [
        {UserName: saName},
    ];
    users.forEach(user => {
        iam.listAccessKeys(user, function(err, data) {
            if (err) {
                console.log("Error", err.message);
            } else {
                nAccessKey = data.AccessKeyMetadata.length;
                //function create when there is no AccessKey
                if(nAccessKey == 0){
                    createAccessKey(user.UserName, saPath);
                } else if (nAccessKey == 2){
                    outputListAccessKeys = data.AccessKeyMetadata;
                    outputListAccessKeys.forEach(element => {
                        // Function Delete
                        if (element.Status == 'Inactive'){
                            deleteAccessKey(element.UserName, element.AccessKeyId);
                        } else {
                            //Function keep
                            if(element.CreateDate >= calculetedDateRotation) {
                                KeepAccessKey(user.UserName, element.AccessKeyId, element.CreateDate, element.Status);
                            } else {
                                createAccessKey(user.UserName, saPath);
                            }
                        }
                    });
                } else {
                    outputListAccessKeys = data.AccessKeyMetadata;
                    outputListAccessKeys.forEach(element => {
                        //Function keep
                        console.log("chamando keep", element.CreateDate, calculetedDateRotation, element.UserName);
                        if(element.CreateDate >= calculetedDateRotation) {
                            //console.log(user.UserName, element.AccessKeyId, element.CreateDate, element.Status);
                            KeepAccessKey(user.UserName, element.AccessKeyId, element.CreateDate, element.Status);
                        } else {
                            if(element.createDate <= calculetedDateInactive) {
                                //console.log(element.UserName, element.AccessKeyId);
                                lastUsedAccessKey(element.UserName, element.AccessKeyId);
                            } else {
                                console.log(element.UserName, element.AccessKeyId, "no Inactive");
                            }
                        }
                    });
                }
            }
        });
    });
}

ddb.batchGetItem(paramsDynamoDB, function(err, data) {
    if (err) {
        console.log("Error", err.message);
    } else {
        data.Responses.service_accounts.forEach(function(element, index, array) {
            let saName = element.name.S;
            let saNamespace = element.namespace.S;
            let saPath = element.path.S;
            //console.log(saPath+"/"+saName, saNamespace, saPath);
            getTags(saName, saPath);
        });
    }
});