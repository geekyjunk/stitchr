const PARSER_OPTIONS = {
    // parse in strict mode and allow module declarations
    sourceType: "module",
    plugins: ['typescript']
}

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]

const LOADERS = [
    "css-loader"
]
module.exports = { PARSER_OPTIONS, EXTENSIONS, LOADERS }