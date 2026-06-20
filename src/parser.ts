const { traverseImports } = require('./traverse')
const path = require('path');
const fs = require("fs")
const { PARSER_OPTIONS } = require('./constants')
const { createAst } = require('./ast')
const { resolveFilePath } = require('./utils')

function parseFile(filePath: string = "") {

    /** We need to only look in root src/ directory not dist/ */
    const basePath = path.join(__dirname, "../", '../');
    const absoluteEntryPath = path.join(basePath, filePath)
    const resolvedEntryPath=resolveFilePath(absoluteEntryPath)
    const entryFileContent = fs.readFileSync(resolvedEntryPath, "utf-8")
    const ast = createAst(entryFileContent, PARSER_OPTIONS)
    // console.log('base',basePath);
    // console.log("file",filePath)
    traverseImports(ast, basePath, filePath)
}

module.exports = { parseFile }