// Markdown

// const mime = require('mime')
const debug = require('debug')('express-markdown-pages')
const path = require('path')
const yamlFront = require('yaml-front-matter')
const { promisify } = require('util')
const fs = require('fs')
const accessAsync = promisify(fs.access)
const readFileAsync = promisify(fs.readFile)

const markdownServe = (app, markdownPath, markdownDir, render) => {
  app.get(markdownPath, async (req, res, next) => {
    try {
      let filename = req.path
      if (filename.endsWith('.md')) {
        if (!req.user) {
          return res.render('403')
        } else {
          return next()
        }
      }
      if (filename === '/') {
        filename = 'index'
      }
      const parts = filename.split('/')
      const last = parts[parts.length - 1]
      debug('Last:', last, req.user)
      // const lastParts = last.split('.')
      // const ext = lastParts[lastParts.length - 1]
      if (!last.includes('.') || last.endsWith('.draft')) {
        filename += '.md'
      // } else if (last.endsWith('.draft.md')) {
      //   if (req.user && req.user.admin && req.user.admin === true) {
      //     debug('Signed in:', req.user)
      //     filename += ''
      //   } else {
      //     debug('User:', req.user)
      //     return res.render('403')
      //   }
      // } else {
      //   return next()
      }
      // if (!(filename.endsWith('.md') || (!req.user && !filename.endsWith('.draft'))) {
      //
      //   return next()
      // }

      if (last.endsWith('.draft') && !(req.user && req.user.admin && req.user.admin === true)) {
        debug('Rendering draft')
        return res.render('403')
      }
      if (!filename.endsWith('.md')) {
        debug('Not markdown')
        return next()
      }

      debug('Trying path', filename, '...')
      const localPath = path.join(markdownDir, filename)
      try {
        await accessAsync(localPath, fs.constants.R_OK)
      } catch (e) {
        debug('Cannot read local path', localPath, e)
        return next()
      }
      const fileContent = await readFileAsync(localPath, { 'encoding': 'utf8' })
      let { __content: md, template = 'content', ...rest } = yamlFront.loadFront(fileContent)
      const content = await render(md)
      res.render(template, { content, ...rest })
    } catch (e) {
      debug(e)
      return next(e)
    }
  })
}

module.exports = {
  markdownServe
}
