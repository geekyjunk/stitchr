const { jsLoader } = require('./jsLoader')
const { cssLoader } = require('./cssLoader')
const { JS_EXTENSIONS, CSS_EXTENSIONS } = require('../constants')
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
 * Registry with built-in loaders:
 * - identity JS loader for .js / .mjs / .cjs
 * - CSS → string export for .css
 */
function createDefaultLoaderRegistry() {
  const registry = new LoaderRegistry()
  for (const ext of JS_EXTENSIONS) {
    registry.registerLoader(ext, jsLoader)
  }
  for (const ext of CSS_EXTENSIONS) {
    registry.registerLoader(ext, cssLoader)
  }
  return registry
}

module.exports = { LoaderRegistry, createDefaultLoaderRegistry, jsLoader, cssLoader }
