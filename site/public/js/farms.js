;(async function () {
'use strict'

let config = await (await fetch('/auth_config.json')).json()
  , auth = await authentication
  , home = new AWS.S3({params: {Bucket: config.aws.homeBucket} })
  , userId = (await auth.auth0.getIdTokenClaims()).sub

home.config.credentials = auth.awsCredentials

// todo: create farmer home if it doesn't exist
console.log(userId);
home.listObjects({Prefix: userId+'/'}, console.log)

let tileBucket = new AWS.S3({params: {Bucket: "pagaf.nltgis.com"} });
tileBucket.config.credentials = auth.awsCredentials;
tileBucket.listObjects({Prefix:'r/corn/si/current/'}, console.log);

})()
