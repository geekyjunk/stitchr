export type DependencyGraph = {
  [filePath: string]: {
    file: string,
    id: number,
    deps: string[]
  }
}

export type ModuleMap = Record<string, number>

export type ModuleRegistry = Record<number, string>
