import { ConstantsInit } from '../shared/constants';
import { RiscvRegisters, CodeAnalysis, SimulatorStateObject, RiscvState } from '../shared/types';
import { toInt32 } from '../shared/utils';

function makeDefaultRegisters(): RiscvRegisters {
  const r: RiscvRegisters = {};
  for (let i = 0; i < 32; i++) {
    r[`x${i}`] = 0;
  }

  r['x2'] = 2147479548; // sp
  r['x3'] = 268468224; // gp
  r['x0'] = 0;
  return r;
}

function loadData(analysis: CodeAnalysis, memory: Record<number, number>) {
  for (const entry of analysis.data || []) {
    const base = entry.address;
    const values = entry.values || [];
    for (let i = 0; i < values.length; i++) {
      memory[base + i * 4] = toInt32(values[i]);
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
