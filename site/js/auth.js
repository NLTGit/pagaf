;(async function () {
'use strict'
/*** Proof-of-concept, not production-quality code ***/

/* This creates a global Promise `authentication` for getting credentials and
handles login workflow if needed. See
https://github.com/NLTGit/pagaf/wiki/Auth0-and-Amazon-setup for the required
Auth0 and Amazon setup.

How to view your jwt in the browser's JavaScript console:

 auth = await authentication
 encoded = await auth.auth0.getTokenSilently()
 encoded
   .split('.')
   .slice(0,2)
   .map(p => p.replace(/-/g, '+').replace(/_/g, '/'))
   .map(atob)
   .map(JSON.parse)

*/
window.authentication = login()
let auth = await authentication

document.getElementById('organization').innerText = (await auth.auth0.getUser()).name
document.getElementById('logout').onclick = async click => {
  click.preventDefault()  // auth0.logout() redirects when complete
  document.body.setAttribute('aria-busy', true)
  auth.auth0.logout({returnTo: window.location.origin})
}

document.body.removeAttribute('aria-busy')


async function login() {
  // Auth0 api docs are a bit hard to find https://auth0.github.io/auth0-spa-js/
  if (/\berror/.test(window.location.search)) {
    // Auth0 redirects to an url containing an 'error' parameter if there's a
    // problem with the login. Most likely a programming error on our side.
    alert('Error: ' + decodeURIComponent(window.location.search))
    window.history.replaceState(null, '', window.location.pathname)
    return
  }

  let config = await (await fetch('/config.json')).json()
    , redirectUri = window.location.origin + '/home.html'
    , auth0 = await createAuth0Client(
      { domain:    config.auth0.domain
        , client_id: config.auth0.client_id
        , audience:  config.auth0.audience
        , redirect_uri: redirectUri
        })

  if ( ! await auth0.isAuthenticated()) {
    let q = window.location.search
    if (/\bcode=/.test(q) && /\bstate=/.test(q)) {
      try { await auth0.handleRedirectCallback() }
      finally { window.history.replaceState(null, '', window.location.pathname) }
    }
    else
      await auth0.loginWithRedirect(
        // In a real application, we'd redirect to different urls depending
        // on the context. For now, it's ok to home home on every refresh.
        {redirect_uri: redirectUri})
  }

  return { auth0: auth0
         , awsCredentials: new AWS.WebIdentityCredentials(
            { RoleArn: config.aws.farmerRoleArn
            , WebIdentityToken: await auth0.getTokenSilently()
            })
         }
}

})()
