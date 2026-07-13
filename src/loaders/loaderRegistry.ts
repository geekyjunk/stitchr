import type { Loader } from './loader'

class LoaderRegistry {
    private loaders = new Map<string, Loader>()

    registerLoader(ext: string, loader: Loader) {
        this.loaders.set(ext, loader)
    }

    getLoader(ext: string) {
        return this.loaders.get(ext)
    }
}

module.exports = LoaderRegistry 
