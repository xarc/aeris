import { RiscvRegisters } from '../../shared/types';
import { toInt32 } from '../../shared/utils';

export class RegisterFile {
  private registers: Int32Array;

  constructor(initial?: RiscvRegisters) {
    this.registers = new Int32Array(32);

    if (initial) {
      for (let index = 0; index < 32; index++) {
        const register = `x${index}`;
        const value = initial[register];
        if (typeof value === 'number') {
          this.registers[index] = toInt32(value);
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
    for (let index = 0; index < 32; index++) {
      out[`x${index}`] = this.registers[index] | 0;
    }
    return out;
  }
}
