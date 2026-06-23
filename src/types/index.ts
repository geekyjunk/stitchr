export type DependencyGraph = {
  [filePath: string]: {
    deps: string[]
  }
}
