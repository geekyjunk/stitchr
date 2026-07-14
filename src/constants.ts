const PARSER_OPTIONS = {
    // parse in strict mode and allow module declarations
    sourceType: "module",
    plugins: ['typescript']
}

/** Script/source extensions that may contain further imports (Babel-walkable). */
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]

const JS_EXTENSIONS = ['.js', '.mjs', '.cjs']

const CSS_EXTENSIONS = ['.css']

const JSON_EXTENSIONS = ['.json']

module.exports = { PARSER_OPTIONS, EXTENSIONS, JS_EXTENSIONS, CSS_EXTENSIONS, JSON_EXTENSIONS }