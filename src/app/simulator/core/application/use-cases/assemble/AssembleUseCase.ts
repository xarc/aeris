import { Injectable } from '@angular/core';
import { ConsolePort } from '../../../ports/console.port/console.port';
import { SimulatorStore } from '../../../state/simulator.store/simulator.store';
import { CodeAnalyzer } from '../../../domain/analyzer/core/CodeAnalyzer';
import { Assembler } from '../../../domain/assembler/Assembler';
import { SimulationBuilder } from '../../../domain/simulation/SimulationBuilder';

@Injectable({ providedIn: 'root' })
export class AssembleUseCase {
  constructor(
    private readonly store: SimulatorStore,
    private readonly console: ConsolePort,
  ) {}

  assemble(): void {
    const snapshot = this.store.getSnapshot();
    if (!snapshot.guards.canAssemble) {
      return;
    }

    const sourceCode = snapshot.state.source.text;
    if (!sourceCode || !sourceCode.trim()) {
      this.console.print('No code to assemble', 'error');
      return;
    }

    try {
      this.store.setPhase('assembling');

      const analyzer = new CodeAnalyzer();
      const assembler = new Assembler();
      const builder = new SimulationBuilder();

      const analysisResult = analyzer.analyze(sourceCode);
      const assemblyResult = assembler.assemble(analysisResult);
      const initializedSimulation = builder.init(assemblyResult);

      this.store.setSimulation(initializedSimulation);
      this.store.setPhase('assembled');
      this.store.setSelectedTab(1);

      this.console.print('Assembly completed successfully');
    } catch (error: any) {
      const message = error?.message ?? 'Unknown assembly error';
      this.console.print(message, 'error');
      this.store.setError(message);
    }
  }
}
