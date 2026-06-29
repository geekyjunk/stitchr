function createBundle(
  moduleRegistry: Record<number, string>,
  entryModuleId: number
) {
  const parsedModuleRegistry = Object.keys(moduleRegistry)
    .map((id) => `${id}:${moduleRegistry[Number(id)]}`)
    .join(',\n')
  return `(function (modules) {
    const cache = {}
    function require(id) {
      if (cache[id]) return cache[id];
      if (!modules[id]) {
        throw new Error('No module found with ID=', id);
      }
      const module = { exports: {} }
      cache[id] = modules[id](require, module, module.exports)
      return cache[id];
    }
    return require(${entryModuleId});
  })({${parsedModuleRegistry}})`

}
module.exports = { createBundle }