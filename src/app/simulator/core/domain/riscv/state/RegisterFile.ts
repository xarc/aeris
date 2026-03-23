import { RiscvRegisters } from '../../shared/types';
import { toInt32 } from '../../shared/utils';

export class RegisterFile {
  private registers: Int32Array;

  constructor(initial?: RiscvRegisters) {
    this.registers = new Int32Array(32);

    if (initial) {
      for (let i = 0; i < 32; i++) {
        const register = `x${i}`;
        const value = initial[register];
        if (typeof value === 'number') {
          this.registers[i] = toInt32(value);
        }
      }
    }

    this.registers[0] = 0;
  }

  read(index: number): number {
    return this.registers[index] | 0;
  }

  write(index: number, value: number): void {
    if (index === 0) {
      return;
    }
    this.registers[index] = toInt32(value);
  }

  enforceX0(): void {
    this.registers[0] = 0;
  }

  toObject(): RiscvRegisters {
    const out: RiscvRegisters = {};
    for (let i = 0; i < 32; i++) {
      out[`x${i}`] = this.registers[i] | 0;
    }
    return out;
  }
}
