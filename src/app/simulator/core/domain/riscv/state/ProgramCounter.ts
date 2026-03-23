export class ProgramCounter {
  private pc: number;

  constructor(initial: number) {
    this.pc = initial | 0;
  }

  get(): number {
    return this.pc | 0;
  }

  set(value: number): void {
    this.pc = value | 0;
  }

  plus4(): number {
    return (this.pc + 4) | 0;
  }
}
