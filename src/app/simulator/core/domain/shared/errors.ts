export class AnalysisError extends Error {
  public readonly line?: number;

  constructor(message: string, line?: number) {
    super(message);
    this.name = 'AnalysisError';
    this.line = line;
  }
}

export class AssemblyError extends Error {
  line?: number;

  constructor(message: string, line?: number) {
    super(message);
    this.name = 'AssemblyError';
    this.line = line;
  }
}

export class ExecutionError extends Error {
  line?: number;

  constructor(message: string, line?: number) {
    super(message);
    this.name = 'ExecutionError';
    this.line = line;
  }
}
