import type { Loader } from './loader'

/**
 * Turns CSS into a CommonJS module that exports the stylesheet as a string.
 *
 *   import styles from './app.css'  →  const styles = require(id)  →  "...css..."
 *   import './app.css'              →  require(id)  (side effect)
 */
const cssLoader: Loader = {
  transform(module) {
    return {
      ...module,
      transformedSource: `module.exports = ${JSON.stringify(module.source)};\n`,
    }
  },
}

module.exports = { cssLoader }
