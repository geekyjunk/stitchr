const traverse = require("@babel/traverse").default
const path = require('path')
const fs = require('fs');
const { createAst } = require('./ast')
const { PARSER_OPTIONS } = require('./constants')
const { resolveFilePath } = require('./utils')

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
 */
function traverseImports(ast: any, rootpath: string, filePath: string, visitedSet: Set<string>, visitedInCurrentCycle: Set<string>) {
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

        if (visitedInCurrentCycle.has(resolvedPathWithExtension)) {
          const relativePath = path.relative(rootpath, resolvedPathWithExtension).split(path.sep).join("/")
          console.warn(`Circular dependency detected: ${relativePath}`)
          return
        }

        if (visitedSet.has(resolvedPathWithExtension)) {
          return
        }

        visitedInCurrentCycle.add(resolvedPathWithExtension)
        const fileContent = fs.readFileSync(resolvedPathWithExtension, 'utf-8')
        const resolvedFileAst = createAst(fileContent, PARSER_OPTIONS)
        traverseImports(resolvedFileAst, rootpath, resolvedFilePath, visitedSet, visitedInCurrentCycle)

        visitedInCurrentCycle.delete(resolvedPathWithExtension)
        visitedSet.add(resolvedPathWithExtension)
      }
    },
  })
}
module.exports = { traverseImports }