import { SyscallPort } from '../../ports/syscall.port/syscall.port';
import { ExecutionEngine } from '../riscv/ExecutionEngine';
import { SimulatorStateObject } from '../shared/types';

export class SimulationRunner {
  constructor(private syscallPort: SyscallPort) {}

  async run(state: SimulatorStateObject): Promise<SimulatorStateObject> {
    return await ExecutionEngine.run(state, this.syscallPort);
  }
}
