const PARSER_OPTIONS = {
    // parse in strict mode and allow module declarations
    sourceType: "module",
    plugins: ['typescript']
}

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]

module.exports = { PARSER_OPTIONS, EXTENSIONS }