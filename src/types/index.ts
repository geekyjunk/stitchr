export type DependencyGraph = {
  [filePath: string]: {
    file: string,
    id: number,
    deps: string[]
  }
}
