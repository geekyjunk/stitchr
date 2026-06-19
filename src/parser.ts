const { traverseImports } = require('./traverse')
const path = require('path');
const fs = require("fs")
const { PARSER_OPTIONS } = require('./constants')
const { createAst } = require('./ast')

function parseFile(filePath: string = "") {

    /** We need to only look in root src/ directory not dist/ */
    const basePath = path.join(__dirname, "../", '../');
    const resolvedFilePath = path.join(basePath, filePath)
    const entryFileContent = fs.readFileSync(resolvedFilePath, "utf-8")
    const ast = createAst(entryFileContent, PARSER_OPTIONS)
    const fileExtension = path.extname(resolvedFilePath)
    traverseImports(ast, basePath, filePath + fileExtension)
}

module.exports = { parseFile }