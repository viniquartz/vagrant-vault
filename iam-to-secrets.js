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

// secrets manager
//const prefixPath = "service_accounts/"
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

ddb.batchGetItem(paramsDynamoDB, function(err, data) {
    if (err) {
        console.log("Error", err.message);
    } else {
        data.Responses.service_accounts.forEach(function(element, index, array) {
            var users = [
                {UserName: element.name.S},
            ];
            users.forEach(user => {
                // get tags - time_rotation - time_inactive - whereupdate
                iam.listUserTags(user, function(err, data) {
                    //console.log("[Tags]");
                    if (err) {
                        console.log("Error get tags", err.message);
                    } else {
                        //console.log("####", user.UserName, "####");
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

                        //console.log("\n");
                        iam.listAccessKeys(user, function(err, data) {
                            if (err) {
                                console.log("Error", err.message);
                            } else {
                                nAccessKey = data.AccessKeyMetadata.length;
                                //function create when there is no AccessKey
                                if(nAccessKey == 0){
                                    outputUserName = user.UserName;
                                    iam.createAccessKey({UserName: outputUserName}, function(err, data) {
                                        if (err) {
                                            console.log(outputUserName, err.message);
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
                                            listCreateUpdate(element.path.S+"/"+data.AccessKey.UserName, prefixSecretStringOne+data.AccessKey.AccessKeyId+prefixSecretStringTwo+data.AccessKey.SecretAccessKey+prefixSecretStringThree);
                                        }
                                    });
                                }

                                outputListAccessKeys = data.AccessKeyMetadata;
                                outputListAccessKeys.forEach(element => {
                                    // Function Delete
                                    var paramDeleteAccessKey = {
                                        UserName: element.UserName,
                                        AccessKeyId: element.AccessKeyId
                                    };

                                    if (element.Status == 'Inactive' && nAccessKey == 2){
                                        iam.deleteAccessKey(paramDeleteAccessKey, function(err, data) {
                                            if (err) {
                                            console.log("Error", err);
                                            } else {
                                            console.log("Delete this AccessKey", paramDeleteAccessKey, "\n", data);
                                            }
                                        });
                                    } else {

                                        //Function keep
                                        if(element.CreateDate >= calculetedDateRotation) {
                                            outputAccessKeyId = element.AccessKeyId;
                                            outputUserName = element.UserName;
                                            outputCreateDate = element.CreateDate;
                                            
                                            // Console
                                            console.log("####", user.UserName, "####");
                                            console.log("AccessKeyId:" ,outputAccessKeyId, "CreatedDate:" ,outputCreateDate, "Status:", element.Status);
                                            console.log("Keep this AccessKey", "\n");

                                        } else {
                                            outputAccessKeyId = element.AccessKeyId;
                                            outputUserName = element.UserName;
                                            outputCreateDate = element.CreateDate;

                                            //function create when there is already one AccessKey 
                                            if (nAccessKey < 2){
                                                iam.createAccessKey({UserName: outputUserName}, function(err, data) {
                                                    if (err) {
                                                        console.log(outputUserName, err.message);
                                                    } else {
                                                        var newAccessKey = {
                                                            UserName: data.AccessKey.UserName,
                                                            AccessKeyId: data.AccessKey.AccessKeyId,
                                                            SecretAccessKey: data.AccessKey.SecretAccessKey,
                                                            CreateDate: data.AccessKey.CreateDate
                                                        };ß
                                                        // Console
                                                        console.log("New AccessKey created to", data.AccessKey.UserName, "user");
                                                        console.log(newAccessKey);
                                                        listCreateUpdate(element.path.S+"/"+data.AccessKey.UserName, prefixSecretStringOne+data.AccessKey.AccessKeyId+prefixSecretStringTwo+data.AccessKey.SecretAccessKey+prefixSecretStringThree);
                                                    }
                                                });
                                            }
                                        }
                                        
                                        if(outputCreateDate <= calculetedDateInactive) {
                                            iam.getAccessKeyLastUsed({AccessKeyId: outputAccessKeyId}, function(err, data) {
                                                if (err) {
                                                    console.log("Error", err);
                                                } else {
                                                    // lastused
                                                    outputLastUsed = data.AccessKeyLastUsed.LastUsedDate;
                                
                                                    if (outputLastUsed > calculetedDateInactive || outputLastUsed == '') {
                                                        console.log("Access Key ID is in use")
                                                    } else {            
                                                        var params = {
                                                            Status: 'Inactive',
                                                            UserName: outputUserName,
                                                            AccessKeyId: outputAccessKeyId
                                                        };
                                
                                                        iam.updateAccessKey(params, function(err, data) {
                                                            if (err) {
                                                                console.log("Error", err);
                                                            } else {
                                                                // Console
                                                                //console.log("####", user.UserName, "####");
                                                                console.log("Disable this AccessKey");
                                                                console.log("service_account:", outputUserName, "AccessKeyId:" ,outputAccessKeyId, "CreatedDate:" ,outputCreateDate, "Status:", element.Status);
                                                                console.log("LastUsed:", outputLastUsed);
                                                                console.log("CurrentDate:", currentDate);
                                                                console.log("Access Key ID is not in use")
                                                                console.log("Inactive", data);
                                                                console.log("\n");
                                                            }
                                                        });
                                                    }
                                                }
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    }
                });
            });
        });
    }
});