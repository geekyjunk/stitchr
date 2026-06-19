const parser = require("@babel/parser")

function createAst(fileContent: string, options: { [key: string]: string }) {
  return parser.parse(fileContent, options);
}

module.exports = { createAst }
