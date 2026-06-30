# stitchr

Stitchr is a small JavaScript/TypeScript bundler experiment. It reads an entry
file, follows local CommonJS `require()` calls, assigns module IDs, rewrites
those `require()` calls to point at the generated IDs, and writes a self-contained
runtime bundle.

**Current status:** early-stage. Stitchr can bundle local CommonJS dependency
graphs, but it does not yet resolve npm packages or transform ESM imports.

## Install

```bash
npm install
npm run build
```

Optional, if you want to run the CLI as `stitchr` from anywhere:

```bash
npm link
```

## CLI

```bash
stitchr build <entry-file> [options]
```

Options:

```bash
--show-graph       Print the resolved dependency graph
-o, --out <file>   Output bundle path, defaults to dist/bundle.js
```

Examples:

```bash
stitchr build src/example/index.js
stitchr build src/example/index.js --show-graph
stitchr build src/example/index.js -o dist/example.bundle.js
```

You can also pass an absolute entry path:

```bash
stitchr build /path/to/project/src/index.js
```

## What Stitchr Does

1. Resolves the entry file from the current working directory.
2. Finds the nearest project root by walking upward until it finds
   `package.json`.
3. Parses each visited source file with Babel.
4. Traverses local CommonJS `require("./...")` calls recursively.
5. Resolves extensionless imports using:
   `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`.
6. Resolves directory imports through `index` files.
7. Detects circular dependencies and logs a warning.
8. Builds a dependency graph and module ID map.
9. Rewrites local `require()` string paths to numeric module IDs.
10. Writes a runtime bundle to the configured output path.

## Bundle Output

The generated bundle wraps all discovered modules in a small CommonJS-style
runtime:

- modules are stored by numeric ID
- each module receives `require`, `module`, and `exports`
- module results are cached after the first execution
- execution starts from the entry module

By default, bundles are written to:

```bash
dist/bundle.js
```

Run the output with Node:

```bash
node dist/bundle.js
```

## Dependency Graph

Use `--show-graph` to inspect what Stitchr resolved:

```bash
stitchr build src/example/index.js --show-graph
```

The graph is printed as JSON with one entry per module:

```json
{
  "src/example/index.js": {
    "file": "src/example/index.js",
    "id": 0,
    "deps": ["src/example/modules/greet.js"]
  }
}
```

## Project Structure

```text
index.ts              CLI entry point
src/
  parser.ts           coordinates graph creation and bundle writing
  traverse.ts         walks ASTs, resolves imports, creates module registry
  runtime.ts          generates the bundle runtime wrapper
  ast.ts              Babel parser helper
  utils.ts            project root and file path resolution helpers
  constants.ts        parser options and supported extensions
  types/              shared TypeScript types
  example/            local CommonJS example files
```

## Limitations

- Only local CommonJS `require()` calls are bundled.
- ESM `import` declarations are parsed, but they are not bundled yet.
- npm package imports such as `require("lodash")` are not supported yet.
- Dynamic `require()` calls are not supported.
- The bundler does not transpile source syntax for older runtimes.

## Roadmap

- [ ] Support ESM `import` / `export`
- [ ] Resolve npm packages from `node_modules`
- [ ] Add source maps
- [ ] Add automated tests
- [ ] Add richer CLI errors and diagnostics

## License

ISC
