export interface Dependency {
    source: string;      
    resolvedPath: string;
    moduleId: number;
}

export interface Module {
    id: number;
    filePath: string;
    source: string;
    transformedSource: string;
    dependencies: Dependency[];
}

export interface Loader {
    transform(module: Module): Module;
}

