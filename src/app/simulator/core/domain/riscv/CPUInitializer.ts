import { ConstantsInit } from '../shared/constants';
import { RiscvRegisters, CodeAnalysis, SimulatorStateObject, RiscvState } from '../shared/types';
import { toInt32 } from '../shared/utils';

function makeDefaultRegisters(): RiscvRegisters {
  const registers: RiscvRegisters = {};
  for (let index = 0; index < 32; index++) {
    registers[`x${index}`] = 0;
  }

  registers['x2'] = 2147479548; // sp
  registers['x3'] = 268468224; // gp
  registers['x0'] = 0;
  return registers;
}

function loadData(analysis: CodeAnalysis, memory: Record<number, number>) {
  for (const entry of analysis.data || []) {
    const base = entry.address;
    const values = entry.values || [];
    for (let index = 0; index < values.length; index++) {
      memory[base + index * 4] = toInt32(values[index]);
    }
  }
}

function loadText(analysis: CodeAnalysis, memory: Record<number, number>) {
  for (const inst of analysis.text || []) {
    const address = inst.address;
    const decimal = inst.machine?.decimal ?? 0;
    memory[address] = toInt32(decimal);
  }
}

function initialPc(): number {
  return ConstantsInit.PC;
}

export class RiscvInitializer {
  static initialize(state: SimulatorStateObject): SimulatorStateObject {
    const memory: Record<number, number> = {};

    loadData(state.analysis, memory);
    loadText(state.analysis, memory);

    const riscv: RiscvState = {
      pc: initialPc(),
      registers: makeDefaultRegisters(),
      memory: memory,
    };

    return { ...state, assembled: true, riscv };
  }
}
