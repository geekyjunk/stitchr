const { traverseImports } = require('./traverse')
const path = require('path');
const fs = require("fs")
const { PARSER_OPTIONS } = require('./constants')
const { createAst } = require('./ast')
const { resolveFilePath, getRootPath } = require('./utils')
import type { DependencyGraph } from './types'

function parseFile(filePath: string = "", options: { showGraph?: boolean } = {}) {
    const absoluteEntryPath = path.resolve(process.cwd(), filePath)
    const projectRoot = getRootPath(absoluteEntryPath)
    const relativeEntryPath = path.relative(projectRoot, absoluteEntryPath)
    const resolvedEntryPath = resolveFilePath(projectRoot, relativeEntryPath)
    const entryFileContent = fs.readFileSync(resolvedEntryPath, "utf-8")
    const ast = createAst(entryFileContent, PARSER_OPTIONS)
    const relativeFilePath = path.relative(projectRoot, resolvedEntryPath).split(path.sep).join("/")

    const visitedSet = new Set<string>()
    const visitedInCurrentCycle = new Set<string>()

    visitedInCurrentCycle.add(resolvedEntryPath)
    const dependencyGraph: DependencyGraph = {};

    traverseImports(ast, projectRoot, relativeFilePath, visitedSet, visitedInCurrentCycle, dependencyGraph)

    if (options.showGraph) {
        console.log(JSON.stringify(dependencyGraph, null, 2))
    }

    visitedInCurrentCycle.delete(resolvedEntryPath)
    visitedSet.add(resolvedEntryPath)
}

module.exports = { parseFile }