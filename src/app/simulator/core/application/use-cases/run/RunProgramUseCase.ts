import { Injectable, NgZone } from '@angular/core';
import { BatchWait, ExecutionEngine } from '../../../domain/riscv/ExecutionEngine';
import { SimulationRunner } from '../../../domain/simulation/SimulationRunner';
import { SimulatorStateObject } from '../../../domain/shared/types';
import { SyscallPort } from '../../../ports/syscall.port/syscall.port';
import {
  CLOCK_UNLIMITED,
  KEYBOARD_REGISTER_ADDRESS,
  SimulatorStore,
} from '../../../state/simulator.store/simulator.store';

const AUTO_CHUNK_MIN = 300;
const AUTO_CHUNK_MAX = 20000;
const AUTO_DELAY_MIN_MS = 0;
const AUTO_DELAY_MAX_MS = 50;
const AUTO_DELAY_SCALE = 100;
const CLOCK_TICK_MS = 16;
const CLOCK_MAX_BACKLOG_MS = 250;
const WAIT_SLICE_MS = 50;

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
    let clockBudget = 0;
    let lastClockTime = performance.now();

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
      const resumeAfter = (waitMs: number) => {
        const wakeAt = performance.now() + waitMs;
        const poll = () => {
          const remaining = wakeAt - performance.now();
          if (
            remaining > 0 &&
            !this._stopRequested &&
            this.store.getSnapshot().state.phase === 'running'
          ) {
            setTimeout(poll, Math.min(remaining, WAIT_SLICE_MS));
            return;
          }
          lastClockTime = performance.now();
          tick();
        };
        poll();
      };

      const tick = async () => {
        if (this.store.getSnapshot().state.phase !== 'running') {
          return;
        }

        const clockHz = this.store.getClockHz();
        const isUnlimited = clockHz === CLOCK_UNLIMITED;

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

        let chunkSize: number;
        if (isUnlimited) {
          chunkSize = autoChunk;
        } else {
          const now = performance.now();
          const elapsedMs = Math.min(now - lastClockTime, CLOCK_MAX_BACKLOG_MS);
          lastClockTime = now;
          clockBudget += (elapsedMs * clockHz) / 1000;
          chunkSize = Math.min(Math.floor(clockBudget), AUTO_CHUNK_MAX);
        }

        let executedCount = 0;
        let wait: BatchWait | null = null;
        if (chunkSize > 0) {
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
            wait = result.wait;
          } catch (error: any) {
            this.ngZone.run(() => this.store.setError(error?.message ?? 'Unknown execution error'));
            return;
          }
        }

        if (isUnlimited && !wait) {
          autoChunk =
            executedCount >= chunkSize
              ? Math.min(chunkSize * 2, AUTO_CHUNK_MAX)
              : Math.max(AUTO_CHUNK_MIN, Math.floor(chunkSize / 2));
        } else if (!isUnlimited) {
          clockBudget = Math.max(0, clockBudget - executedCount);
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

        if (wait) {
          resumeAfter(wait.ms);
          return;
        }

        const delay = isUnlimited
          ? Math.max(
              AUTO_DELAY_MIN_MS,
              AUTO_DELAY_MAX_MS - Math.floor(autoChunk / AUTO_DELAY_SCALE),
            )
          : CLOCK_TICK_MS;
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
