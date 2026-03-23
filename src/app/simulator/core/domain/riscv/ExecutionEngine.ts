import { RiscvInitializer } from './CPUInitializer';
import { ProgramCounter } from './state/ProgramCounter';
import { RegisterFile } from './state/RegisterFile';
import { Memory } from './state/Memory';
import { SimulatorStateObject, RegFile } from '../shared/types';
import { CPU } from './CPU';
import { SyscallHandler } from './syscall/SyscallHandler';
import { SyscallPort } from '../../ports/syscall.port/syscall.port';

export class ExecutionEngine {
  static async run(
    state: SimulatorStateObject,
    syscallPort: SyscallPort,
  ): Promise<SimulatorStateObject> {
    if (!state.riscv) {
      state = RiscvInitializer.initialize(state);
    }

    if (!state.riscv) {
      return state;
    }

    const pc = new ProgramCounter(state.riscv.pc);
    const registers = new RegisterFile(state.riscv.registers);
    const memory = Memory.fromRecord(state.riscv.memory);

    const cpu = new CPU({ pc, registers, memory });
    const mutation = cpu.step();

    if (mutation.isSyscall) {
      const syscallCode = registers.read(17); // a7

      const domainResult = SyscallHandler.handle(syscallCode, registers, memory, state.analysis.data);

      const adapterResult = await syscallPort.execute(domainResult.effect);

      if (adapterResult.newRegisters) {
        for (const register in adapterResult.newRegisters) {
          const index = RegFile[register as keyof typeof RegFile].value;
          const value = adapterResult.newRegisters[register];
          registers.write(index, value);
        }
      }

      if (
        domainResult.effect.kind === 'read' &&
        domainResult.effect.type === 'string' &&
        adapterResult.input
      ) {
        const { address, maxLength } = domainResult.effect;

        const trimmed = adapterResult.input.slice(0, maxLength - 1);

        for (let i = 0; i < trimmed.length; i++) {
          memory.writeU8(address + i, trimmed.charCodeAt(i));
        }

        memory.writeU8(address + trimmed.length, 0);
      }
    }

    return {
      ...state,
      riscv: {
        pc: pc.get(),
        registers: registers.toObject(),
        memory: memory.toRecord(),
        lastMutation: mutation,
      },
    };
  }
}
