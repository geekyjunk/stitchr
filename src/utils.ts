
const path = require('path');
const fs = require("fs")
const { PARSER_OPTIONS, EXTENSIONS } = require('./constants')

function resolveFilePath(rootPath: string, relativePath: string = './') {
    const absoluteBase = path.resolve(rootPath, relativePath)
    if (fs.existsSync(absoluteBase) && fs.statSync(absoluteBase).isFile()) {
        return absoluteBase
    }

    if (!path.extname(relativePath)) {
        for (const ext of EXTENSIONS) {
            const candidate = absoluteBase + ext
            if (fs.existsSync(candidate)) {
                return candidate
            }
        }

        for (const ext of EXTENSIONS) {
            const candidate = path.join(absoluteBase, "index" + ext)
            if (fs.existsSync(candidate)) {
                return candidate
            }
        }
    }

    throw new Error(`Could not resolve file: ${relativePath}`)
}

function getRootPath(entryPath: string) {
    let dir = path.dirname(path.resolve(entryPath))
    const filesystemRoot = path.parse(dir).root

    while (true) {
        if (fs.existsSync(path.join(dir, "package.json"))) {
            return dir
        }

        if (dir === filesystemRoot) {
            throw new Error(
                `Could not find package.json near ${entryPath}. ` +
                `Run stitchr from your project root or pass an absolute path to the entry file.`
            )
        }

        dir = path.dirname(dir)
    }
}

module.exports = { resolveFilePath, getRootPath }