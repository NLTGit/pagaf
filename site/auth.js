;(async function () {
'use strict'
// Auth0 api docs are a bit hard to find https://auth0.github.io/auth0-spa-js/

// This is proof-of-concept, *not* production-quality code

async function login() {
  let config = await (await fetch('/config.json')).json()
    , auth0 = await createAuth0Client(config.auth0)

  if ( ! await auth0.isAuthenticated()) {
    let q = window.location.search
    if (/\bcode=/.test(q) && /\bstate=/.test(q)) {
      await auth0.handleRedirectCallback()
      // todo: seems this replaceState isn't always getting called, why?
      window.history.replaceState(null, '', window.location.pathname)
    }
    else
      await auth0.loginWithRedirect({redirect_uri: config.redirect_uri})
  }

  return { auth0: auth0
         , awsCredentials: new AWS.WebIdentityCredentials(
            { RoleArn: config.aws.farmerRoleArn
            , WebIdentityToken: await auth0.getTokenSilently()
            })
         }
}

window.authentication = login()
let auth = await authentication

document.querySelector('.username').innerText = (await auth.auth0.getUser()).name

document.querySelector('a.logout').onclick = async click => {
  click.preventDefault()  // auth0.logout() redirects when complete
  document.body.setAttribute('aria-busy', true)
  auth.auth0.logout()
}

document.body.removeAttribute('aria-busy')

})()
