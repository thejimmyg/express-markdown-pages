# Express Markdown Pages

There are three parts to this package:

* `lib/render` - Render markdown
* `lib/serve` - Serve rendered markdown files (`.md`) to the public, serve draft markdown files (`.draft.md`) to signed-in users
* `lib/hook` - Watch the directory of markdown files and post to a search index URL when files are added or change


Core API looks like this:

```
const rootDir = path.normalize(process.env.ROOT_DIR)

const codeBlockSwaps = {}
codeBlockSwaps['youtube'] = (input) => {
  return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${input.replace(/^\s+|\s+$/g, '')}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
}

markdownServe(app, '*', rootDir, async (input) => {
  return markdownRender(input, { codeBlockSwaps })
})
```

This will render all normal markdown, but will also turn this block into an iframe showing a YouTube video because of the `codeBlockSwaps` configuration:

~~~
``` youtube
m55wVQx9oJs
```
~~~


## Environment Variables

You can configure where the markdown files are like this:

* `ROOT_DIR` - The directory containing the markdown files


## Setup

The functionality depends on the set up of lots of other modules so see the example for how this is done.


## Example

See `./example` for a full example, including Docker and Docker Compose.


## Development

```
npm run fix
```


## Changelog

### 0.2.0 2019-02-09

* Upgraded all dependant libraries to their latest versions
* Improved the Docker example
* Renamed the files in the `lib` directory

### 0.1.6 2019-01-19

* Refactored into middleware
* Upgraded express-mustache-overlays and express-mustache-jwt-signin

### 0.1.5 2019-01-02

* Handle SIGTERM

### 0.1.4 2018-12-29

* Introduced a 200ms delay on watched file events before sending them to the search index to allow all filsystem layers to be aware of the changes. Without this, you sometimes see HTML pages without the rendered markdown content being posted to the search index when the volume being changed is mounted in Docker.

### 0.1.3 2018-12-29

* Send `remove` requests to the search index if a file is deleted or moved.

### 0.1.2 2018-12-29

* Upgrade to `express-mustache-overlays` 0.3.3 to use `renderView()`.
* Differentiate between private `.draft.md` pages and public `.md` pages when sending them to the search index.

### 0.1.1 2018-12-29

* Added `prepareOptions` to `lib/markdown-serve.js`
* Example now watches markdown files and publish them to a search index if `SEARCH_INDEX_URL` and `SEARCH_AUTHORIZATION` are published.

### 0.1.0 2018-12-12

* Initial release
