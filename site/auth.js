;(async function () {
  // Auth0 api docs are a bit hard to find https://auth0.github.io/auth0-spa-js/

  // This is proof-of-concept, *not* production-quality code

  let config = await (await fetch('/auth0.config.json')).json()
  config.redirect_uri = window.location.origin + '/home.html'
  let auth0 = await createAuth0Client(config)

  if ( ! await auth0.isAuthenticated()) {
    let q = window.location.search
    if (/\bcode=/.test(q) && /\bstate=/.test(q)) {
      await auth0.handleRedirectCallback()
      window.history.replaceState(null, '', window.location.pathname)
    }
    else {
      await auth0.loginWithRedirect({redirect_uri: config.redirect_uri})
    }
  }

  document.querySelector('a.logout').onclick = async click => {
    click.preventDefault()  // auth0.logout() redirects when complete
    document.body.setAttribute('aria-busy', true)
    auth0.logout()
  }

  document.body.removeAttribute('aria-busy')

})()
