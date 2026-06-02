import { AnalysisError } from '../../shared/errors';

export class SymbolTable {
  private table = new Map<string, number>();

  define(label: string, address: number, line?: number) {
    if (this.table.has(label)) {
      throw new AnalysisError(`label "${label}" already defined`, line);
    }
    this.table.set(label, address);
  }

  resolve(label: string, line?: number): number {
    const value = this.table.get(label);
    if (value === undefined) {
      throw new AnalysisError(`symbol "${label}" not found in symbol table`, line);
    }
    return value;
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.table.entries());
  }
}
