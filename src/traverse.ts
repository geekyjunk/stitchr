const traverse = require("@babel/traverse").default
const path = require('path')
const fs = require('fs');
const { createAst } = require('./ast')
const { PARSER_OPTIONS } = require('./constants')
const { resolveFilePath } = require('./utils')
import type { DependencyGraph } from './types'

function toRelativePath(rootpath: string, absolutePath: string) {
  return path.relative(rootpath, absolutePath).split(path.sep).join("/")
}

function ensureModule(
  dependencyGraph: DependencyGraph,
  filePath: string,
  nextId: { value: number },
  moduleMap: { [filePath: string]: number }
) {
  if (!dependencyGraph[filePath]) {
    dependencyGraph[filePath] = {
      file: filePath,
      id: nextId.value,
      deps: [],
    }
    moduleMap[filePath] = nextId.value++;
  }
  return dependencyGraph[filePath]
}

function resolveRelativeImports(importPath: string, rootPath: string, filePath: string) {
  const calleeFilePath = path.resolve(rootPath, path.dirname(filePath))

  const pathForImport = path.resolve(calleeFilePath, importPath)

  let relativePath = path.relative(rootPath, pathForImport)

  if (relativePath.startsWith("dist/")) {
    relativePath = relativePath.slice("dist/".length);
  }

  return relativePath
}

/**
 * 
 * @param ast AST for the entry file
 * @param rootpath root path of project directory
 * @param filePath path for file in process (on first run -> entry file, then subsequently resolved path for imports)
 * @param visitedSet set for maintaining visited nodes
 * @param visitedInCurrentCycle set for maintaining visited nodes in current cycle path (to detect circular deps)
 * @param dependencyGraph output deps graph
 * @param nextId module id for imports
 */
function traverseImports(
  ast: any,
  rootpath: string,
  filePath: string,
  visitedSet: Set<string>,
  visitedInCurrentCycle: Set<string>,
  dependencyGraph: DependencyGraph,
  nextId: { value: number },
  moduleMap: { [filePath: string]: number }
) {
  const moduleEntry = ensureModule(dependencyGraph, filePath, nextId, moduleMap)

  traverse(ast, {
    // For ES6 import statememts
    ImportDeclaration(nodePath: any) {
      const node = nodePath.node
      console.log(node.source.value)
    },
    // CallExpression represents function/ method call node in AST => For require method
    CallExpression(nodePath: any) {
      const node = nodePath.node
      if (
        node.callee.type === "Identifier" &&
        node.callee.name === "require" &&
        node.arguments[0]?.type === "StringLiteral"
      ) {
        const resolvedFilePath = resolveRelativeImports(node.arguments[0].value, rootpath, filePath);
        const resolvedPathWithExtension = resolveFilePath(rootpath, resolvedFilePath)
        const relativePath = toRelativePath(rootpath, resolvedPathWithExtension)

        moduleEntry.deps.push(relativePath);

        if (visitedInCurrentCycle.has(resolvedPathWithExtension)) {
          console.warn(`Circular dependency detected: ${relativePath}`)
          return
        }

        if (visitedSet.has(resolvedPathWithExtension)) {
          return
        }

        visitedInCurrentCycle.add(resolvedPathWithExtension)
        const fileContent = fs.readFileSync(resolvedPathWithExtension, 'utf-8')
        const resolvedFileAst = createAst(fileContent, PARSER_OPTIONS)

        traverseImports(
          resolvedFileAst,
          rootpath,
          relativePath,
          visitedSet,
          visitedInCurrentCycle,
          dependencyGraph,
          nextId,
          moduleMap
        )

        visitedInCurrentCycle.delete(resolvedPathWithExtension)
        visitedSet.add(resolvedPathWithExtension)
      }
    },
  })
}
module.exports = { traverseImports }
