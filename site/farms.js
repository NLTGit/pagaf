;(async function () {
'use strict'

let config = await (await fetch('/config.json')).json()
  , auth = await authentication
  , home = new AWS.S3({params: {Bucket: config.aws.homeBucket} })
  , userId = (await auth.auth0.getIdTokenClaims()).sub

home.config.credentials = auth.awsCredentials

// todo: create farmer home if it doesn't exist

home.listObjects({Prefix: userId+'/'}, console.log)

})()
