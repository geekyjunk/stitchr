const traverse = require("@babel/traverse").default
const path = require('path')
const fs = require('fs');
const { createAst } = require('./ast')
const { PARSER_OPTIONS } = require('./constants')
const { resolveFilePath } = require('./utils')
const { generate } = require("@babel/generator")

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

function resolveDependencyPath(importPath: string, rootpath: string, filePath: string) {
  const resolvedFilePath = resolveRelativeImports(importPath, rootpath, filePath)
  const resolvedPathWithExtension = resolveFilePath(rootpath, resolvedFilePath)
  return toRelativePath(rootpath, resolvedPathWithExtension)
}

function isRequireCall(node: any) {
  return (
    node.callee.type === "Identifier" &&
    node.callee.name === "require" &&
    node.arguments[0]?.type === "StringLiteral"
  )
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
      if (isRequireCall(node)) {
        const relativePath = resolveDependencyPath(node.arguments[0].value, rootpath, filePath)
        const resolvedPathWithExtension = path.resolve(rootpath, relativePath)

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

/**
 * 
 * @param moduleRegistry Mapping of module ID and its generated code
 * @param dependencyGraph dependency graph of all resolved imports
 * @param moduleMap mapping of module with its module ID
 */
function createModuleRegistry(
  moduleRegistry: Record<number, string>,
  dependencyGraph: DependencyGraph,
  moduleMap: Record<string, number>,
  projectRoot: string
) {
  for (const filePath of Object.keys(dependencyGraph)) {
    const moduleEntry = dependencyGraph[filePath]
    if (!moduleEntry) {
      continue
    }

    const { id } = moduleEntry
    const absoluteFilePath = path.resolve(projectRoot, filePath)
    const fileContent = fs.readFileSync(absoluteFilePath, 'utf-8')
    const ast = createAst(fileContent, PARSER_OPTIONS)

    traverse(ast, {
      CallExpression(nodePath: any) {
        const node = nodePath.node
        if (!isRequireCall(node)) {
          return
        }

        const depPath = resolveDependencyPath(node.arguments[0].value, projectRoot, filePath)
        const depId = moduleMap[depPath]

        if (depId === undefined) {
          throw new Error(`Could not resolve module id for "${depPath}" imported from "${filePath}"`)
        }


        nodePath.get('arguments.0').replaceWith({
          type: 'NumericLiteral',
          value: depId,
        })

      },
    })

    const { code: body } = generate(ast)
    moduleRegistry[id] = `function(require, module, exports) {\n${body}\n}`
  }
  console.log(moduleRegistry)
}

module.exports = { traverseImports, createModuleRegistry }
