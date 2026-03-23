import { CodeAnalyzer } from '../analyzer/core/CodeAnalyzer';
import { Assembler } from '../assembler/Assembler';
import { RiscvInitializer } from '../riscv/CPUInitializer';
import { SimulatorStateObject } from '../shared/types';

export class SimulationBuilder {
  private analyzer = new CodeAnalyzer();
  private assembler = new Assembler();

  build(source: string): SimulatorStateObject {
    const analysis = this.analyzer.analyze(source);
    const assembled = this.assembler.assemble(analysis);
    return this.init(assembled);
  }

  init(state: SimulatorStateObject): SimulatorStateObject {
    if (!state.assembled) {
      return state;
    }
    return RiscvInitializer.initialize(state);
  }
}
