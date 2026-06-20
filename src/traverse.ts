const traverse = require("@babel/traverse").default
const path = require('path')
const fs = require('fs');
const { createAst } = require('./ast')
const { PARSER_OPTIONS } = require('./constants')
const { resolveFilePath } = require('./utils')

function resolveRelativeImports(importPath: string, rootPath: string, filePath: string) {
  const pathForImport = path.resolve(path.dirname(filePath), importPath)
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
function traverseImports(ast: any, rootpath: string, filePath: string) {
  traverse(ast, {
    // For ES6 import statememts
    ImportDeclaration(nodePath: any) {
      const node = nodePath.node
      console.log(resolveRelativeImports(node.source.value, rootpath, filePath))
    },
    // CallExpression represents function/ method call node in AST => For require method
    CallExpression(nodePath: any) {
      const node = nodePath.node
      if (
        nodePath.node.callee.type === "Identifier" &&
        nodePath.node.callee.name === "require"
      ) {
        const resolvedFilePath = resolveRelativeImports(node.arguments[0].value, rootpath, filePath);

        const resolvedPathWithExtension = resolveFilePath(rootpath, resolvedFilePath)
        const fileContent = fs.readFileSync(resolvedPathWithExtension, 'utf-8')
        const resolvedFileAst = createAst(fileContent, PARSER_OPTIONS)
        console.log(resolvedFilePath, resolvedFileAst)
        traverseImports(resolvedFileAst, rootpath, resolvedFilePath);
      }
    },
  })
}
module.exports = { traverseImports }