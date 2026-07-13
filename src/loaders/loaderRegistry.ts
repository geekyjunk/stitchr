const { jsLoader } = require('./jsLoader')
const { JS_EXTENSIONS } = require('../constants')
import type { Loader } from './loader'

export type LoaderRegistryLike = {
  getLoader(ext: string): Loader | undefined
}

class LoaderRegistry {
  private loaders = new Map<string, Loader>()

  registerLoader(ext: string, loader: Loader) {
    this.loaders.set(ext, loader)
  }

  getLoader(ext: string) {
    return this.loaders.get(ext)
  }
}

/**
 * Registry with the identity JS loader registered for .js / .mjs / .cjs.
 */
function createDefaultLoaderRegistry() {
  const registry = new LoaderRegistry()
  for (const ext of JS_EXTENSIONS) {
    registry.registerLoader(ext, jsLoader)
  }
  return registry
}

module.exports = { LoaderRegistry, createDefaultLoaderRegistry, jsLoader }
