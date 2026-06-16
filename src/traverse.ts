const traverse = require("@babel/traverse").default
function traverseImports(ast: any) {
    traverse(ast, {
        // For ES6 import statememts
        ImportDeclaration(path: any) {
            console.log(path.node.source.value)
        },
        // CallExpression represents function/ method call node in AST => For require method
        CallExpression(path: any) {
            if (
              path.node.callee.type === "Identifier" &&
              path.node.callee.name === "require"
            ) {
              console.log(path.node.argumens[0].value);
            }
          },
    })
}
module.exports = { traverseImports }