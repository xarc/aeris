import { Injectable, NgZone } from '@angular/core';
import { ExecutionEngine } from '../../../domain/riscv/ExecutionEngine';
import { SimulationRunner } from '../../../domain/simulation/SimulationRunner';
import { SimulatorStateObject } from '../../../domain/shared/types';
import { SyscallPort } from '../../../ports/syscall.port/syscall.port';
import {
  KEYBOARD_REGISTER_ADDRESS,
  SimulatorStore,
} from '../../../state/simulator.store/simulator.store';

const AUTO_CHUNK_MIN = 300;
const AUTO_CHUNK_MAX = 20000;
const AUTO_DELAY_MIN_MS = 0;
const AUTO_DELAY_MAX_MS = 50;
const AUTO_DELAY_SCALE = 100;

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
    let lastObservedKeyboardVersion = this.store.getKeyboardRegisterVersion();
    let autoChunk = AUTO_CHUNK_MIN;

    const scheduleRender = () => {
      if (animationFramePending) {
        return;
      }
      animationFramePending = true;
      requestAnimationFrame(() => {
        animationFramePending = false;
        if (this.store.getSnapshot().state.phase !== 'running') {
          return;
        }
        this.store.tickSimulation(currentState);
      });
    };

    this.ngZone.runOutsideAngular(() => {
      const tick = async () => {
        if (this.store.getSnapshot().state.phase !== 'running') {
          return;
        }

        const isAuto = this.store.isAutoSpeedEnabled();

        const riscv = currentState.riscv;
        if (!riscv || riscv.pc < startPc || riscv.pc >= endPc || riscv.halted) {
          this.ngZone.run(() => {
            this.store.updateSimulation(currentState);
            this.store.setEndReached(true);
            this.store.setHasUndo(this.store.hasHistory());
          });
          return;
        }

        const externalKeyboardVersion = this.store.getKeyboardRegisterVersion();
        if (externalKeyboardVersion !== lastObservedKeyboardVersion) {
          currentState = this.withKeyboardRegister(
            currentState,
            this.store.getKeyboardRegisterValue(),
          );
          lastObservedKeyboardVersion = externalKeyboardVersion;
        }

        const chunkSize = isAuto ? autoChunk : this.store.getInstructionsPerTick();

        let executedCount: number;
        try {
          const result = await ExecutionEngine.runBatch(
            currentState,
            this.syscall,
            chunkSize,
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
          currentState = result.state;
          executedCount = result.executedCount;
        } catch (error: any) {
          this.ngZone.run(() => this.store.setError(error?.message ?? 'Unknown execution error'));
          return;
        }

        if (isAuto) {
          autoChunk =
            executedCount >= chunkSize
              ? Math.min(chunkSize * 2, AUTO_CHUNK_MAX)
              : Math.max(AUTO_CHUNK_MIN, Math.floor(chunkSize / 2));
        }

        if (this.store.getSnapshot().state.phase !== 'running') {
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

        const delay = isAuto
          ? Math.max(
              AUTO_DELAY_MIN_MS,
              AUTO_DELAY_MAX_MS - Math.floor(autoChunk / AUTO_DELAY_SCALE),
            )
          : this.store.getMsBetweenTicks();
        setTimeout(tick, delay);
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

  private withKeyboardRegister(state: SimulatorStateObject, value: number): SimulatorStateObject {
    if (!state.riscv) {
      return state;
    }

    return {
      ...state,
      riscv: {
        ...state.riscv,
        memory: { ...state.riscv.memory, [KEYBOARD_REGISTER_ADDRESS]: value | 0 },
      },
    };
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
