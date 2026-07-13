const traverse = require("@babel/traverse").default
const path = require('path')
const fs = require('fs');
const { createAst } = require('./ast')
const { PARSER_OPTIONS } = require('./constants')
const { resolveFilePath } = require('./utils')
const { generate } = require("@babel/generator")

import type { DependencyGraph } from './types'
import type { Module } from './loaders/loader'
import type { LoaderRegistryLike } from './loaders/loaderRegistry'

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

/**
 * Resolve the relative path for the import statement from the current file path
 */
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
 * Resolve the dependency path for the import statement from project root along with file extension
 */
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

function prepareDependencyGraph(nodePath: any, rootpath: string, filePath: string, moduleEntry: any, visitedSet: Set<string>, visitedInCurrentCycle: Set<string>, dependencyGraph: DependencyGraph, nextId: { value: number }, moduleMap: { [filePath: string]: number }) {
  const relativePath = resolveDependencyPath(nodePath, rootpath, filePath)
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
    // For ES6 import statements
    ImportDeclaration(nodePath: any) {
      const node = nodePath.node
      prepareDependencyGraph(node.source.value, rootpath, filePath, moduleEntry, visitedSet, visitedInCurrentCycle, dependencyGraph, nextId, moduleMap)
    },
    // export { x } from './mod'  |  export { default as x } from './mod'  |  export * as ns from './mod'
    ExportNamedDeclaration(nodePath: any) {
      const node = nodePath.node
      if (!node.source) {
        return
      }
      prepareDependencyGraph(node.source.value, rootpath, filePath, moduleEntry, visitedSet, visitedInCurrentCycle, dependencyGraph, nextId, moduleMap)
    },
    // export * as ns from './mod' (ExportAllDeclaration with exported name)
    ExportAllDeclaration(nodePath: any) {
      const node = nodePath.node
      if (!node.exported) {
        return
      }
      prepareDependencyGraph(node.source.value, rootpath, filePath, moduleEntry, visitedSet, visitedInCurrentCycle, dependencyGraph, nextId, moduleMap)
    },
    // CallExpression represents function/ method call node in AST => For require method
    CallExpression(nodePath: any) {
      const node = nodePath.node
      if (isRequireCall(node)) {
        prepareDependencyGraph(node.arguments[0].value, rootpath, filePath, moduleEntry, visitedSet, visitedInCurrentCycle, dependencyGraph, nextId, moduleMap)
      }
    },
  })
}

function createRequireCall(depId: number) {
  return {
    type: "CallExpression",
    callee: { type: "Identifier", name: "require" },
    arguments: [{ type: "NumericLiteral", value: depId }],
  }
}

function namedImportProperties(namedSpecs: any[]) {
  return namedSpecs.map((specifier: any) => {
    const importedName =
      specifier.imported.type === "Identifier"
        ? specifier.imported.name
        : specifier.imported.value
    const localName = specifier.local.name

    return {
      type: "ObjectProperty",
      key: { type: "Identifier", name: importedName },
      value: { type: "Identifier", name: localName },
      computed: false,
      shorthand: importedName === localName,
    }
  })
}

function rewriteImportDeclarations(nodePath: any, depId: number) {
  const currentNode = nodePath.node
  const requireCall = createRequireCall(depId)
  const defaultSpec = currentNode.specifiers.find(
    (specifier: any) => specifier.type === "ImportDefaultSpecifier"
  )
  const namespaceSpec = currentNode.specifiers.find(
    (specifier: any) => specifier.type === "ImportNamespaceSpecifier"
  )
  const namedSpecs = currentNode.specifiers.filter(
    (specifier: any) => specifier.type === "ImportSpecifier"
  )

  // import './mod'
  if (currentNode.specifiers.length === 0) {
    nodePath.replaceWith({
      type: "ExpressionStatement",
      expression: requireCall,
    })
    return
  }

  // import * as ns from './mod'
  // → const ns = require(id)
  if (namespaceSpec && !defaultSpec && namedSpecs.length === 0) {
    nodePath.replaceWith({
      type: "VariableDeclaration",
      kind: "const",
      declarations: [
        {
          type: "VariableDeclarator",
          id: { type: "Identifier", name: namespaceSpec.local.name },
          init: requireCall,
        },
      ],
    })
    return
  }

  // import foo, * as ns from './mod'
  // → const ns = require(id)
  // → const foo = ns
  if (namespaceSpec && defaultSpec && namedSpecs.length === 0) {
    const nsName = namespaceSpec.local.name
    nodePath.replaceWithMultiple([
      {
        type: "VariableDeclaration",
        kind: "const",
        declarations: [
          {
            type: "VariableDeclarator",
            id: { type: "Identifier", name: nsName },
            init: requireCall,
          },
        ],
      },
      {
        type: "VariableDeclaration",
        kind: "const",
        declarations: [
          {
            type: "VariableDeclarator",
            id: { type: "Identifier", name: defaultSpec.local.name },
            init: { type: "Identifier", name: nsName },
          },
        ],
      },
    ])
    return
  }

  // import { greet, convert as c } from './mod'
  // → const { greet, convert: c } = require(id)
  if (!defaultSpec && namedSpecs.length > 0) {
    nodePath.replaceWith({
      type: "VariableDeclaration",
      kind: "const",
      declarations: [
        {
          type: "VariableDeclarator",
          id: {
            type: "ObjectPattern",
            properties: namedImportProperties(namedSpecs),
          },
          init: requireCall,
        },
      ],
    })
    return
  }

  // import foo from './mod'
  // → const foo = require(id)
  if (defaultSpec && namedSpecs.length === 0) {
    nodePath.replaceWith({
      type: "VariableDeclaration",
      kind: "const",
      declarations: [
        {
          type: "VariableDeclarator",
          id: { type: "Identifier", name: defaultSpec.local.name },
          init: requireCall,
        },
      ],
    })
    return
  }

  // import foo, { greet } from './mod'
  // → const foo = require(id)
  // → const { greet } = foo
  if (defaultSpec && namedSpecs.length > 0) {
    nodePath.replaceWithMultiple([
      {
        type: "VariableDeclaration",
        kind: "const",
        declarations: [
          {
            type: "VariableDeclarator",
            id: { type: "Identifier", name: defaultSpec.local.name },
            init: requireCall,
          },
        ],
      },
      {
        type: "VariableDeclaration",
        kind: "const",
        declarations: [
          {
            type: "VariableDeclarator",
            id: {
              type: "ObjectPattern",
              properties: namedImportProperties(namedSpecs),
            },
            init: { type: "Identifier", name: defaultSpec.local.name },
          },
        ],
      },
    ])
  }
}

function identifier(name: string) {
  return { type: "Identifier", name }
}

function specifierName(node: any) {
  return node.type === "Identifier" ? node.name : node.value
}

/**
 * export const foo = 1 / export function foo() {} / export class Foo {}
 * → <decl>; exports.foo = foo
 *
 * export { foo, bar as baz }
 * → exports.foo = foo
 * → exports.baz = bar
 *
 * export { foo, bar as baz } from './mod'
 * → var __stitchr_reexport = require(id)
 * → exports.foo = __stitchr_reexport.foo
 * → exports.baz = __stitchr_reexport.bar
 *
 * export { default as foo } from './mod'
 * → exports.foo = require(id)
 *
 * export * as ns from './mod'
 * → exports.ns = require(id)
 */
function rewriteExportNamedDeclaration(
  nodePath: any,
  projectRoot: string,
  filePath: string,
  moduleMap: Record<string, number>
) {
  const node = nodePath.node

  // export { foo } from './mod'
  // export { default as foo } from './mod'
  // export * as ns from './mod'
  if (node.source) {
    const depPath = resolveDependencyPath(node.source.value, projectRoot, filePath)
    const depId = moduleMap[depPath]
    if (depId === undefined) {
      throw new Error(
        `Could not resolve module id for "${depPath}" re-exported from "${filePath}"`
      )
    }

    const requireCall = createRequireCall(depId)

    // export * as ns from './mod' → exports.ns = require(id)
    const namespaceSpec = node.specifiers.find(
      (specifier: any) => specifier.type === "ExportNamespaceSpecifier"
    )
    if (namespaceSpec) {
      nodePath.replaceWith({
        type: "ExpressionStatement",
        expression: {
          type: "AssignmentExpression",
          operator: "=",
          left: {
            type: "MemberExpression",
            object: identifier("exports"),
            property: identifier(specifierName(namespaceSpec.exported)),
            computed: false,
          },
          right: requireCall,
        },
      })
      return
    }

    const valueSpecifiers = node.specifiers.filter(
      (specifier: any) => specifier.type === "ExportSpecifier"
    )
    const statements: any[] = []

    // Need a temp when any specifier pulls a named export (not default)
    const needsTemp = valueSpecifiers.some(
      (specifier: any) => specifierName(specifier.local) !== "default"
    )

    if (needsTemp) {
      statements.push({
        type: "VariableDeclaration",
        kind: "var",
        declarations: [
          {
            type: "VariableDeclarator",
            id: identifier("__stitchr_reexport"),
            init: requireCall,
          },
        ],
      })
    }

    for (const specifier of valueSpecifiers) {
      const exportName = specifierName(specifier.exported)
      const imported = specifierName(specifier.local)

      if (imported === "default") {
        // CJS interop: default is the whole module.exports
        statements.push({
          type: "ExpressionStatement",
          expression: {
            type: "AssignmentExpression",
            operator: "=",
            left: {
              type: "MemberExpression",
              object: identifier("exports"),
              property: identifier(exportName),
              computed: false,
            },
            right: needsTemp ? identifier("__stitchr_reexport") : requireCall,
          },
        })
      } else {
        statements.push({
          type: "ExpressionStatement",
          expression: {
            type: "AssignmentExpression",
            operator: "=",
            left: {
              type: "MemberExpression",
              object: identifier("exports"),
              property: identifier(exportName),
              computed: false,
            },
            right: {
              type: "MemberExpression",
              object: identifier("__stitchr_reexport"),
              property: identifier(imported),
              computed: false,
            },
          },
        })
      }
    }

    if (statements.length === 1) {
      nodePath.replaceWith(statements[0])
    } else {
      nodePath.replaceWithMultiple(statements)
    }
    return
  }

  // export const foo = 1 / export function foo() {} / export class Foo {}
  if (node.declaration) {
    const declaration = node.declaration
    const statements: any[] = [declaration]

    if (declaration.type === "VariableDeclaration") {
      for (const declarator of declaration.declarations) {
        if (declarator.id.type !== "Identifier") {
          continue
        }
        statements.push({
          type: "ExpressionStatement",
          expression: {
            type: "AssignmentExpression",
            operator: "=",
            left: {
              type: "MemberExpression",
              object: identifier("exports"),
              property: identifier(declarator.id.name),
              computed: false,
            },
            right: identifier(declarator.id.name),
          },
        })
      }
    } else if (
      declaration.type === "FunctionDeclaration" ||
      declaration.type === "ClassDeclaration"
    ) {
      if (declaration.id) {
        statements.push({
          type: "ExpressionStatement",
          expression: {
            type: "AssignmentExpression",
            operator: "=",
            left: {
              type: "MemberExpression",
              object: identifier("exports"),
              property: identifier(declaration.id.name),
              computed: false,
            },
            right: identifier(declaration.id.name),
          },
        })
      }
    }

    if (statements.length === 1) {
      nodePath.replaceWith(statements[0])
    } else {
      nodePath.replaceWithMultiple(statements)
    }
    return
  }

  // export { foo, bar as baz } — local list only
  if (node.specifiers.length === 0) {
    return
  }

  const statements = node.specifiers.map((specifier: any) => ({
    type: "ExpressionStatement",
    expression: {
      type: "AssignmentExpression",
      operator: "=",
      left: {
        type: "MemberExpression",
        object: identifier("exports"),
        property: identifier(specifierName(specifier.exported)),
        computed: false,
      },
      right: identifier(specifierName(specifier.local)),
    },
  }))

  if (statements.length === 1) {
    nodePath.replaceWith(statements[0])
  } else {
    nodePath.replaceWithMultiple(statements)
  }
}

/**
 * This is for the case when exporting default.
 *
 * Example:
 *   export const extra = 42
 *   export default function run() {}
 *
 * After named export rewrite:
 *   module.exports = { extra: 42 }
 *
 * Naive default rewrite (module.exports = run) would wipe extra.
 * So we preserve named exports:
 *   var __stitchr_named = module.exports;          // { extra: 42 }
 *   module.exports = run;                          // function, no .extra
 *   for (var __stitchr_key in __stitchr_named) {
 *     module.exports[__stitchr_key] = __stitchr_named[__stitchr_key];
 *   }
 *
 * Before for..in:  module.exports.extra === undefined
 * After for..in:   module.exports.extra === 42  (same function, props copied on)
 */
function rewriteDefaultExport(valueNode: any) {
  return [
    {
      type: "VariableDeclaration",
      kind: "var",
      declarations: [
        {
          type: "VariableDeclarator",
          id: identifier("__stitchr_named"),
          init: {
            type: "MemberExpression",
            object: identifier("module"),
            property: identifier("exports"),
            computed: false,
          },
        },
      ],
    },
    {
      type: "ExpressionStatement",
      expression: {
        type: "AssignmentExpression",
        operator: "=",
        left: {
          type: "MemberExpression",
          object: identifier("module"),
          property: identifier("exports"),
          computed: false,
        },
        right: valueNode,
      },
    },
    {
      type: "ForInStatement",
      left: {
        type: "VariableDeclaration",
        kind: "var",
        declarations: [
          {
            type: "VariableDeclarator",
            id: identifier("__stitchr_key"),
          },
        ],
      },
      right: identifier("__stitchr_named"),
      body: {
        type: "ExpressionStatement",
        expression: {
          type: "AssignmentExpression",
          operator: "=",
          left: {
            type: "MemberExpression",
            object: {
              type: "MemberExpression",
              object: identifier("module"),
              property: identifier("exports"),
              computed: false,
            },
            property: identifier("__stitchr_key"),
            computed: true,
          },
          right: {
            type: "MemberExpression",
            object: identifier("__stitchr_named"),
            property: identifier("__stitchr_key"),
            computed: true,
          },
        },
      },
    },
  ]
}

/**
 * export default expr
 * → module.exports = expr (keeps any prior named exports)
 */
function rewriteExportDefaultDeclaration(nodePath: any) {
  const declaration = nodePath.node.declaration

  // export default function foo() {} / export default class Foo {}
  if (
    (declaration.type === "FunctionDeclaration" ||
      declaration.type === "ClassDeclaration") &&
    declaration.id
  ) {
    nodePath.replaceWithMultiple([
      declaration,
      ...rewriteDefaultExport(identifier(declaration.id.name)),
    ])
    return
  }

  let valueNode = declaration
  if (declaration.type === "FunctionDeclaration") {
    valueNode = {
      type: "FunctionExpression",
      id: null,
      params: declaration.params,
      body: declaration.body,
      generator: declaration.generator,
      async: declaration.async,
    }
  } else if (declaration.type === "ClassDeclaration") {
    valueNode = {
      type: "ClassExpression",
      id: null,
      superClass: declaration.superClass,
      body: declaration.body,
    }
  }

  nodePath.replaceWithMultiple(rewriteDefaultExport(valueNode))
}

/**
 * export * as ns from './mod'
 * → exports.ns = require(id)
 */
function rewriteExportAllDeclaration(
  nodePath: any,
  projectRoot: string,
  filePath: string,
  moduleMap: Record<string, number>
) {
  const node = nodePath.node

  // Only namespace form — leave bare `export * from` alone
  if (!node.exported) {
    return
  }

  const depPath = resolveDependencyPath(node.source.value, projectRoot, filePath)
  const depId = moduleMap[depPath]
  if (depId === undefined) {
    throw new Error(
      `Could not resolve module id for "${depPath}" re-exported from "${filePath}"`
    )
  }

  const nsName = node.exported.type === "Identifier" ? node.exported.name : node.exported.value
  nodePath.replaceWith({
    type: "ExpressionStatement",
    expression: {
      type: "AssignmentExpression",
      operator: "=",
      left: {
        type: "MemberExpression",
        object: identifier("exports"),
        property: identifier(nsName),
        computed: false,
      },
      right: createRequireCall(depId),
    },
  })
}

function buildLoaderModule(
  id: number,
  filePath: string,
  source: string,
  deps: string[],
  moduleMap: Record<string, number>
): Module {
  return {
    id,
    filePath,
    source,
    transformedSource: source,
    dependencies: deps.map((resolvedPath) => ({
      source: resolvedPath,
      resolvedPath,
      moduleId: moduleMap[resolvedPath] as number,
    })),
  }
}

function applyLoader(
  loaderModule: Module,
  loaderRegistry: LoaderRegistryLike
): Module {
  const ext = path.extname(loaderModule.filePath)
  const loader = loaderRegistry.getLoader(ext)
  if (!loader) {
    return loaderModule
  }
  return loader.transform(loaderModule)
}

/**
 * 
 * @param moduleRegistry Mapping of module ID and its generated code
 * @param dependencyGraph dependency graph of all resolved imports
 * @param moduleMap mapping of module with its module ID
 * @param loaderRegistry Supported loaders passed from parseFile()
 */
function createModuleRegistry(
  moduleRegistry: Record<number, string>,
  dependencyGraph: DependencyGraph,
  moduleMap: Record<string, number>,
  projectRoot: string,
  loaderRegistry: LoaderRegistryLike
) {
  for (const filePath of Object.keys(dependencyGraph)) {
    const moduleEntry = dependencyGraph[filePath]
    if (!moduleEntry) {
      continue
    }

    const { id } = moduleEntry
    const absoluteFilePath = path.resolve(projectRoot, filePath)
    const fileContent = fs.readFileSync(absoluteFilePath, 'utf-8')
    const loaded = applyLoader(
      buildLoaderModule(id, filePath, fileContent, moduleEntry.deps, moduleMap),
      loaderRegistry
    )
    const ast = createAst(loaded.transformedSource, PARSER_OPTIONS)

    traverse(ast, {
      ImportDeclaration(nodePath: any) {
        const node = nodePath.node
        const depPath = resolveDependencyPath(node.source.value, projectRoot, filePath)
        const depId = moduleMap[depPath]

        if (depId === undefined) {
          throw new Error(`Could not resolve module id for "${depPath}" imported from "${filePath}"`)
        }

        rewriteImportDeclarations(nodePath, depId)
      },
      ExportNamedDeclaration(nodePath: any) {
        rewriteExportNamedDeclaration(nodePath, projectRoot, filePath, moduleMap)
      },
      ExportDefaultDeclaration(nodePath: any) {
        rewriteExportDefaultDeclaration(nodePath)
      },
      ExportAllDeclaration(nodePath: any) {
        rewriteExportAllDeclaration(nodePath, projectRoot, filePath, moduleMap)
      },
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
}

module.exports = { traverseImports, createModuleRegistry }
