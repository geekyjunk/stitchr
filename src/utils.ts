
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

module.exports = { resolveFilePath }