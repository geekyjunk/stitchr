# stitchr

A JavaScript/TypeScript bundler.

**Current status:** stitchr is early-stage. Today it ships as a CLI that parses entry files and walks their `require()` dependency graph using Babel. Bundling output is the end goal.

## Install

```bash
npm install
npm run build
npm link   # optional: use `stitchr` globally
```

## Usage

From your project root:

```bash
stitchr build src/example/index.js
```

Or with an absolute path (works from any directory):

```bash
stitchr build /path/to/project/src/example/index.js
```

## What it does today

1. Resolves the entry file and finds the project root via `package.json`
2. Parses the file into an AST
3. Follows `require('./...')` imports recursively
4. Resolves relative paths (`.ts`, `.tsx`, `.js`, etc.)
5. Detects circular dependencies and logs a warning

## Roadmap

- [ ] Bundle resolved modules into a single output file
- [ ] Support ESM `import` / `export`
- [ ] Resolve npm packages from `node_modules`

## Example

```
src/example/
  index.js          → require('./modules/greet')
  modules/
    greet.js          → require('./hello-world')
    hello-world.js
  helpers/
    utils.js
```

```bash
stitchr build src/example/index.js
```

## Project structure

```
index.ts          CLI entry point
src/
  parser.ts       reads entry file, kicks off traversal
  traverse.ts     walks AST, resolves imports
  ast.ts          Babel parse helper
  utils.ts        project root + file path resolution
  constants.ts    parser options
```

## Notes

- Run from your project root, or pass an absolute path to the entry file
- Supports `.js` and `.ts` source files
- Package imports (`require('lodash')`) are not supported yet
- ESM `import` statements are not traversed yet

## License

ISC
