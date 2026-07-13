import type { Loader } from './loader'

/**
 * Default JS loader — passes source through unchanged.
 */
const jsLoader: Loader = {
  transform(module) {
    return {
      ...module,
      transformedSource: module.source,
    }
  },
}

module.exports = { jsLoader }
