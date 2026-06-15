const parser = require("@babel/parser")
const path = require('path');
const fs = require("fs")
function parseFile(filePath: string = "") {
    const options = {
        // parse in strict mode and allow module declarations
        sourceType: "module",
    }
    const basePath = path.join(__dirname, "../");
    const resolvedFilePath = path.join(basePath, filePath)
    const entryFileContent = fs.readFileSync(resolvedFilePath, "utf-8")
    const ast = parser.parse(entryFileContent, options);
    console.log(ast.program.body);

}
module.exports = { parseFile }