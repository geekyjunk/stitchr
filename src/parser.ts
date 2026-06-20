const { traverseImports } = require('./traverse')
const path = require('path');
const fs = require("fs")
const { PARSER_OPTIONS } = require('./constants')
const { createAst } = require('./ast')
const { resolveFilePath, getRootPath } = require('./utils')

function parseFile(filePath: string = "") {
    const absoluteEntryPath = path.resolve(process.cwd(), filePath)
    const projectRoot = getRootPath(absoluteEntryPath)
    const relativeEntryPath = path.relative(projectRoot, absoluteEntryPath)
    const resolvedEntryPath = resolveFilePath(projectRoot, relativeEntryPath)
    const entryFileContent = fs.readFileSync(resolvedEntryPath, "utf-8")
    const ast = createAst(entryFileContent, PARSER_OPTIONS)
    const relativeFilePath = path.relative(projectRoot, resolvedEntryPath).split(path.sep).join("/")

    traverseImports(ast, projectRoot, relativeFilePath)
}

module.exports = { parseFile }