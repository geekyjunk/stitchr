const traverse = require("@babel/traverse").default
const path = require('path')

function resolveRelativeImports(importPath: string, rootPath: string, filePath: string) {
  const pathForImport = path.resolve(path.dirname(filePath), importPath)
  let relativePath = path.relative(rootPath, pathForImport)

  if (relativePath.startsWith("dist/")) {
    relativePath = relativePath.slice("dist/".length);
  }

  return relativePath
}

function traverseImports(ast: any, rootpath: string, filePath: string) {
  traverse(ast, {
    // For ES6 import statememts
    ImportDeclaration(path: any) {
      const node = path.node
      console.log(resolveRelativeImports(node.source.value, rootpath, filePath))
    },
    // CallExpression represents function/ method call node in AST => For require method
    CallExpression(path: any) {
      const node = path.node
      if (
        path.node.callee.type === "Identifier" &&
        path.node.callee.name === "require"
      ) {
        console.log(resolveRelativeImports(node.arguments[0].value, rootpath, filePath));
      }
    },
  })
}
module.exports = { traverseImports }