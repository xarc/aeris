import { Injectable } from '@angular/core';
import { SimulationRunner } from '../../../domain/simulation/SimulationRunner';
import { SyscallPort } from '../../../ports/syscall.port/syscall.port';
import { SimulatorStore } from '../../../state/simulator.store/simulator.store';

@Injectable({ providedIn: 'root' })
export class RunProgramUseCase {
  constructor(
    private readonly store: SimulatorStore,
    private readonly syscall: SyscallPort,
  ) {}

  async runAll(): Promise<void> {
    const snapshot = this.store.getSnapshot();
    if (!snapshot.guards.canRun) {
      return;
    }

    const simulation = this.store.getSimulation();
    if (!simulation || !simulation.riscv) {
      return;
    }

    const text = simulation.analysis?.text ?? [];
    if (text.length === 0) {
      return;
    }

    try {
      this.store.setPhase('running');

      const startPc = text[0].address | 0;
      const endPc = (startPc + text.length * 4) | 0;

      let currentState = simulation;
      const runner = new SimulationRunner(this.syscall);

      while (true) {
        const riscv = currentState.riscv;
        if (!riscv) {
          break;
        }
        if (riscv.pc < startPc || riscv.pc >= endPc) {
          break;
        }

        this.store.pushHistory(currentState);
        currentState = await runner.run(currentState);
      }

      this.store.updateSimulation(currentState);
      this.store.setPhase('paused');
      this.store.setEndReached(true);
      this.store.setHasUndo(this.store.hasHistory());
    } catch (error: any) {
      const message = error?.message ?? 'Unknown execution error';
      this.store.setError(message);
    }
  }

  async step(): Promise<void> {
    const snapshot = this.store.getSnapshot();
    if (!snapshot.guards.canStep) {
      return;
    }

    const simulation = this.store.getSimulation();
    if (!simulation) {
      return;
    }

    const runner = new SimulationRunner(this.syscall);

    this.store.pushHistory(simulation);
    this.store.setHasUndo(true);
    this.store.setPhase('running');

    const stepResult = await runner.run(simulation);

    this.store.updateSimulation(stepResult);
    this.store.setPhase('paused');

    const { riscv, analysis } = stepResult;
    if (!riscv) {
      return;
    }

    const text = analysis?.text ?? [];
    if (text.length === 0) {
      return;
    }

    const startPc = text[0].address | 0;
    const endPc = (startPc + text.length * 4) | 0;

    if (riscv.pc >= endPc) {
      this.store.setEndReached(true);
    }
  }

  undo(): void {
    const snapshot = this.store.getSnapshot();
    if (!snapshot.guards.canUndo) {
      return;
    }

    const previousState = this.store.popHistory();
    if (!previousState) {
      return;
    }

    this.store.updateSimulation(previousState);
    this.store.setEndReached(false);
    this.store.setHasUndo(this.store.hasHistory());
  }
}
