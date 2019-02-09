// Example:
//
// const rootDir = path.normalize(process.env.ROOT_DIR)
// const searchAuthorization = process.env.SEARCH_AUTHORIZATION
// const searchIndexUrl = process.env.SEARCH_INDEX_URL
// if (searchIndexUrl && !searchAuthorization) {
//   throw new Error('SEARCH_INDEX_URL environment variable specified without SEARCH_AUTHORIZATION')
// }
// if (!searchIndexUrl && searchAuthorization) {
//   throw new Error('SEARCH_AUTHORIZATION environment variable specified without SEARCH_INDEX_URL')
// }
// if (searchIndexUrl) {
//   // Look for changes to mark down files that might need indexing
//   triggerSearchHook(app, rootDir, searchIndexUrl, searchAuthorization, { debug, codeBlockSwaps })
// }

const chokidar = require('chokidar')
const fetch = require('isomorphic-fetch')
const path = require('path')
const { prepareOptions } = require('./serve')
const { markdownRender } = require('./render')

const triggerSearchHook = (app, rootDir, searchIndexUrl, searchAuthorization, { debug, codeBlockSwaps = {} }) => {
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
        const overlays = await app.locals.mustache.overlaysPromise
        html = await overlays.renderView(template, options)
        if (changed.endsWith('.draft.md')) {
          pub = false
        }
      }
      debug('ID: ' + id + ', Action: ' + action + ', HTML length: ' + html.length, ', Public: ' + pub)
      const response = await fetch(searchIndexUrl, {
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

module.exports = { triggerSearchHook }
