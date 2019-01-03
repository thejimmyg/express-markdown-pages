const cookieParser = require('cookie-parser')
const debug = require('debug')('express-markdown-pages')
const express = require('express')
const path = require('path')
const { prepareMustacheOverlays, setupErrorHandlers } = require('express-mustache-overlays')
const { makeStaticWithUser, setupMiddleware } = require('express-mustache-jwt-signin')
const { markdownServe, prepareOptions } = require('../lib/markdown-serve')
const markdownRender = require('../lib/markdown-render')
const chokidar = require('chokidar')
const fetch = require('isomorphic-fetch')

const port = process.env.PORT || 80
const scriptName = process.env.SCRIPT_NAME || ''
if (scriptName.endsWith('/')) {
  throw new Error('SCRIPT_NAME should not end with /.')
}
let rootDir = process.env.ROOT_DIR
if (!rootDir) {
  throw new Error('No ROOT_DIR environment variable set to specify the path of the editable files.')
}
rootDir = path.normalize(rootDir)
const secret = process.env.SECRET
const signInURL = process.env.SIGN_IN_URL || '/user/signin'
const signOutURL = process.env.SIGN_OUT_URL || '/user/signout'
const disableAuth = ((process.env.DISABLE_AUTH || 'false').toLowerCase() === 'true')
if (!disableAuth) {
  if (!secret || secret.length < 8) {
    throw new Error('No SECRET environment variable set, or the SECRET is too short. Need 8 characters')
  }
  if (!signInURL) {
    throw new Error('No SIGN_IN_URL environment variable set')
  }
} else {
  debug('Disabled auth')
}
const disabledAuthUser = process.env.DISABLED_AUTH_USER
const mustacheDirs = process.env.MUSTACHE_DIRS ? process.env.MUSTACHE_DIRS.split(':') : []
const publicFilesDirs = process.env.PUBLIC_FILES_DIRS ? process.env.PUBLIC_FILES_DIRS.split(':') : []
const publicURLPath = process.env.PUBLIC_URL_PATH || scriptName + '/public'
const searchAuthorization = process.env.SEARCH_AUTHORIZATION
const searchIndexURL = process.env.SEARCH_INDEX_URL
if (searchIndexURL && !searchAuthorization) {
  throw new Error('SEARCH_INDEX_URL environment variable specified without SEARCH_AUTHORIZATION')
}
if (!searchIndexURL && searchAuthorization) {
  throw new Error('SEARCH_AUTHORIZATION environment variable specified without SEARCH_INDEX_URL')
}

const codeBlockSwaps = {}
codeBlockSwaps['youtube'] = (input) => {
  return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${input.replace(/^\s+|\s+$/g, '')}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
}

const main = async () => {
  const app = express()
  app.use(cookieParser())

  const overlays = await prepareMustacheOverlays(app, { scriptName, publicURLPath })

  app.use((req, res, next) => {
    // debug('Setting up locals')
    res.locals = Object.assign({}, res.locals, { publicURLPath, scriptName, title: 'Express Markdown Browse', signOutURL: signOutURL, signInURL: signInURL })
    next()
  })

  let { withUser } = await setupMiddleware(app, secret, { overlays, signOutURL, signInURL })
  if (disableAuth) {
    withUser = makeStaticWithUser(JSON.parse(disabledAuthUser || 'null'))
  }

  app.use(withUser)

  // overlays.overlayMustacheDir(path.join(__dirname, '..', 'views'))
  // overlays.overlayPublicFilesDir(path.join(__dirname, '..', 'public'))

  // Set up any other overlays directories here
  mustacheDirs.forEach(dir => {
    debug('Adding mustache dir', dir)
    overlays.overlayMustacheDir(dir)
  })
  publicFilesDirs.forEach(dir => {
    debug('Adding publicFiles dir', dir)
    overlays.overlayPublicFilesDir(dir)
  })

  // app.all('/', function(req, res, next) {
  //   console.log('hello')
  //   next()
  // })
  // app.all('/', function(req, res, next) {
  //   console.log('world')
  // })

  // app.use(bodyParser.urlencoded({ extended: true }))

  markdownServe(app, '*', rootDir, async (input) => {
    return markdownRender(input, { codeBlockSwaps })
  })
  // app.get(scriptName, async (req, res, next) => {
  //   try {
  //     res.render('list', { title: 'file' })
  //   } catch (e) {
  //     debug(e)
  //     next(e)
  //   }
  // })

  const { renderView } = await overlays.setup()

  app.use(express.static(rootDir, {}))

  setupErrorHandlers(app)

  app.listen(port, () => console.log(`Example app listening on port ${port}`))
  if (searchIndexURL) {
    // Look for changes to mark down files that might need indexing
    const globs = [path.join(rootDir, '*.md')]
    debug('Watching these globs:', globs.join(','))
    const onEvent = async (event, path_) => {
      try {
        let pub = true
        let html = ''
        let action = 'put'
        const changed = path.normalize(path_)
        // Strip the directory path, and the .md
        const id = changed.slice(rootDir.length, changed.length - 3)
        if (event === 'unlink') {
          action = 'remove'
        } else {
          debug(`Sending ${changed} to the search index due to ${event} ...`)
          const { template, md, options } = await prepareOptions(changed)
          options.content = await markdownRender(md, { codeBlockSwaps })
          html = await renderView(template, options)
          if (changed.endsWith('.draft.md')) {
            pub = false
          }
        }
        debug('ID: ' + id + ', Action: ' + action + ', HTML length: ' + html.length, ', Public: ' + pub)
        const response = await fetch(searchIndexURL, {
          method: 'POST',
          body: JSON.stringify({
            id,
            action,
            html,
            pub
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': searchAuthorization
          }
          // credentials: "same-origin"
        })
        debug(response.url, response.status, response.statusText)
        debug(response.headers)
        const text = await response.text()
        debug(text)
      } catch (e) {
        debug(e.message, e)
        throw (e)
      }
    }
    // const throttledEvent = _.throttle(onEvent, 200, { 'trailing': true, 'leading': false })
    chokidar.watch(rootDir, { ignoreInitial: true, ignored: /(^|[/\\])\../ }).on('all', (event, path_) => {
      setTimeout(() => onEvent(event, path_), 200)
    })
  }
}

main()

// Better handling of SIGINT and SIGTERM for docker
process.on('SIGINT', function () {
  console.log('Received SIGINT. Exiting ...')
  process.exit()
})

process.on('SIGTERM', function () {
  console.log('Received SIGTERM. Exiting ...')
  process.exit()
})
