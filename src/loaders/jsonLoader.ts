import type { Loader } from './loader'

/**
 * Turns JSON into a CommonJS module that exports the JSON as a string.
 *
 *   import data from './data.json'  →  const data = require(id)  →  "..."
 */
const jsonLoader: Loader = {
  transform(module) {
    return {
      ...module,
      transformedSource: `
      const json = ${module.source};\n
      module.exports = json;\n
      `,
    }
  },
}

module.exports = { jsonLoader }
