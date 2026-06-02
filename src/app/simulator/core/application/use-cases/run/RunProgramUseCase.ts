import { Injectable, NgZone } from '@angular/core';
import { ExecutionEngine } from '../../../domain/riscv/ExecutionEngine';
import { SimulationRunner } from '../../../domain/simulation/SimulationRunner';
import { SyscallPort } from '../../../ports/syscall.port/syscall.port';
import { SimulatorStore } from '../../../state/simulator.store/simulator.store';

@Injectable({ providedIn: 'root' })
export class RunProgramUseCase {
  private _stopRequested = false;

  constructor(
    private readonly store: SimulatorStore,
    private readonly syscall: SyscallPort,
    private readonly ngZone: NgZone,
  ) {}

  stop(): void {
    this._stopRequested = true;
  }

  runAll(): void {
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

    const startPc = text[0].address | 0;
    const endPc = (startPc + text.length * 4) | 0;

    this._stopRequested = false;
    this.store.setPhase('running');

    let currentState = simulation;
    let animationFramePending = false;

    const scheduleRender = () => {
      if (animationFramePending) {
        return;
      }
      animationFramePending = true;
      requestAnimationFrame(() => {
        animationFramePending = false;
        this.store.tickSimulation(currentState);
      });
    };

    this.ngZone.runOutsideAngular(() => {
      const tick = async () => {
        const riscv = currentState.riscv;
        if (!riscv || riscv.pc < startPc || riscv.pc >= endPc || riscv.halted) {
          this.ngZone.run(() => {
            this.store.updateSimulation(currentState);
            this.store.setEndReached(true);
            this.store.setHasUndo(this.store.hasHistory());
          });
          return;
        }

        try {
          currentState = await ExecutionEngine.runBatch(
            currentState,
            this.syscall,
            this.store.getInstructionsPerTick(),
            startPc,
            endPc,
            () => this._stopRequested,
            (
              previousPc,
              registerIndex,
              previousRegisterValue,
              memoryAddress,
              previousMemoryValue,
            ) =>
              this.store.pushDelta(
                previousPc,
                registerIndex,
                previousRegisterValue,
                memoryAddress,
                previousMemoryValue,
              ),
          );
        } catch (error: any) {
          this.ngZone.run(() => this.store.setError(error?.message ?? 'Unknown execution error'));
          return;
        }

        if (this._stopRequested) {
          this.ngZone.run(() => {
            this.store.updateSimulation(currentState);
            this.store.setHasUndo(this.store.hasHistory());
          });
          return;
        }

        scheduleRender();
        setTimeout(tick, this.store.getMsBetweenTicks());
      };

      setTimeout(tick, 0);
    });
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

    if (riscv.pc >= endPc || riscv.halted) {
      this.store.setEndReached(true);
    }
  }

  undo(): void {
    const snapshot = this.store.getSnapshot();
    if (!snapshot.guards.canUndo) {
      return;
    }

    const previousState = this.store.popHistory(this.store.getSimulation());
    if (!previousState) {
      return;
    }

    this.store.updateSimulation(previousState);
    this.store.setEndReached(false);
    this.store.setHasUndo(this.store.hasHistory());
  }
}
