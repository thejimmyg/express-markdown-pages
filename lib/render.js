const debug = require('debug')('express-markdown-pages')
const commonmark = require('commonmark')
const Node = require('commonmark/lib/node')
const reader = new commonmark.Parser()
const writer = new commonmark.HtmlRenderer({ safe: false })

const transform = async (parsed, codeBlockSwaps) => {
  let walker = parsed.walker()
  let event, node
  debug(codeBlockSwaps)
  while ((event = walker.next())) {
    node = event.node
    if (node.type === 'code_block' && codeBlockSwaps[node.info.toLowerCase()]) {
      debug(node.type, node.info, node.literal)
      const newnode = new Node('html_block')
      newnode.literal = codeBlockSwaps[node.info.toLowerCase()](node.literal)

      // if (node.info.toLowerCase() === 'youtube') {
      //   newnode.literal = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${node.literal.replace(/^\s+|\s+$/g, '')}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
      // // } else if (node.info === 'rst') {
      // //   const [code, out] = await run(['/usr/local/bin/python', 'rst.py'], node.literal)
      // //   const out = 'RST not supported'
      // //   newnode.literal = out
      // }
      node.insertBefore(newnode)
      node.unlink()
    } else if (node.type === 'html_block' || node.type === 'html_inline') {
      node.literal = '<-- raw HTML omitted -->'
    } else {
      // debug('(', node.type, node.literal, ')')
    }
  }
  return parsed
}

const markdownRender = async (input, options) => {
  const { codeBlockSwaps, ...rest } = options || {}
  if (Object.keys(rest).length) {
    debug(rest)
    throw new Error('Unexpected extra options: ' + Object.keys(rest).join(', '))
  }
  const parsed = reader.parse(input)
  const transformed = await transform(parsed, codeBlockSwaps)
  return writer.render(transformed)
}

module.exports = { markdownRender }
