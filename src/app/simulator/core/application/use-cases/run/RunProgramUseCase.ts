import { Injectable } from '@angular/core';
import { SimulationRunner } from '../../../domain/simulation/SimulationRunner';
import { SyscallPort } from '../../../ports/syscall.port/syscall.port';
import { SimulatorStore } from '../../../state/simulator.store/simulator.store';
import { CPU } from '../../../domain/riscv/CPU';
import { Memory } from '../../../domain/riscv/state/Memory';
import { ProgramCounter } from '../../../domain/riscv/state/ProgramCounter';
import { RegisterFile } from '../../../domain/riscv/state/RegisterFile';
import { SyscallHandler } from '../../../domain/riscv/syscall/SyscallHandler';
import { RegFile, SimulatorStateObject } from '../../../domain/shared/types';

// Steps executed per animation frame. Higher = faster throughput, less responsive stop/MMIO.
const BATCH_SIZE = 10_000;

@Injectable({ providedIn: 'root' })
export class RunProgramUseCase {
  constructor(
    private readonly store: SimulatorStore,
    private readonly syscall: SyscallPort,
  ) {}

  async runAll(): Promise<void> {
    const snapshot = this.store.getSnapshot();
    if (!snapshot.guards.canRun) return;

    const simulation = this.store.getSimulation();
    if (!simulation?.riscv) return;

    const text = simulation.analysis?.text ?? [];
    if (text.length === 0) return;

    try {
      this.store.setPhase('running');
      this.store.clearStopRequest();
      this.store.drainMmioWrites();

      const startPc = text[0].address | 0;
      const endPc = (startPc + text.length * 4) | 0;

      // Create CPU objects once — reused across all steps (no fromRecord/toRecord per step)
      const pc = new ProgramCounter(simulation.riscv.pc);
      const registers = new RegisterFile(simulation.riscv.registers);
      const memory = Memory.fromRecord(simulation.riscv.memory);
      const cpu = new CPU({ pc, registers, memory });

      this.store.pushHistory(simulation);

      let halted = false;

      outer: while (!halted) {
        // Run a synchronous batch
        for (let i = 0; i < BATCH_SIZE; i++) {
          const currentPc = pc.get();
          if (currentPc < startPc || currentPc >= endPc) {
            halted = true;
            break;
          }

          const mutation = cpu.step();

          if (mutation.isSyscall) {
            const code = registers.read(17); // a7
            const domain = SyscallHandler.handle(code, registers, memory, simulation.analysis.data);
            const adapter = await this.syscall.execute(domain.effect);

            if (adapter.newRegisters) {
              for (const reg in adapter.newRegisters) {
                registers.write(RegFile[reg as keyof typeof RegFile].value, adapter.newRegisters[reg]);
              }
            }

            if (domain.effect.kind === 'exit') {
              halted = true;
              break;
            }

            if (domain.effect.kind === 'read' && domain.effect.type === 'string' && adapter.input) {
              const trimmed = adapter.input.slice(0, domain.effect.maxLength - 1);
              for (let j = 0; j < trimmed.length; j++) {
                memory.writeU8(domain.effect.address + j, trimmed.charCodeAt(j));
              }
              memory.writeU8(domain.effect.address + trimmed.length, 0);
            }

            // Yield immediately after any syscall (it was already async)
            break;
          }
        }

        // Sync MMIO writes (keyboard game mode, etc.) into the live memory
        const mmio = this.store.drainMmioWrites();
        for (const [addr, val] of Object.entries(mmio)) {
          memory.writeWord(Number(addr), val | 0);
        }

        // Serialize state once per frame and push to store (bitmap display re-renders here)
        const frame = this.snapshot(simulation, pc, registers, memory, halted);
        this.store.refreshSimulation(frame);

        if (!halted) {
          // requestAnimationFrame syncs with the browser paint cycle (~60fps)
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

          if (this.store.isStopRequested()) {
            this.store.clearStopRequest();
            break outer;
          }
        }
      }

      const final = this.snapshot(simulation, pc, registers, memory, halted);
      this.store.updateSimulation(final);
      this.store.setPhase('paused');
      this.store.setEndReached(true);
      this.store.setHasUndo(this.store.hasHistory());
    } catch (error: any) {
      this.store.setError(error?.message ?? 'Unknown execution error');
    }
  }

  private snapshot(
    base: SimulatorStateObject,
    pc: ProgramCounter,
    registers: RegisterFile,
    memory: Memory,
    halted: boolean,
  ): SimulatorStateObject {
    return {
      ...base,
      riscv: {
        pc: pc.get(),
        registers: registers.toObject(),
        memory: memory.toRecord(),
        lastMutation: null,
        halted,
      },
    };
  }

  async step(): Promise<void> {
    const snapshot = this.store.getSnapshot();
    if (!snapshot.guards.canStep) return;

    const simulation = this.store.getSimulation();
    if (!simulation) return;

    const runner = new SimulationRunner(this.syscall);

    this.store.pushHistory(simulation);
    this.store.setHasUndo(true);
    this.store.setPhase('running');

    const stepResult = await runner.run(simulation);

    this.store.updateSimulation(stepResult);
    this.store.setPhase('paused');

    const { riscv, analysis } = stepResult;
    if (!riscv) return;

    const text = analysis?.text ?? [];
    if (text.length === 0) return;

    const startPc = text[0].address | 0;
    const endPc = (startPc + text.length * 4) | 0;

    if (riscv.pc >= endPc || riscv.halted) {
      this.store.setEndReached(true);
    }
  }

  undo(): void {
    const snapshot = this.store.getSnapshot();
    if (!snapshot.guards.canUndo) return;

    const previousState = this.store.popHistory();
    if (!previousState) return;

    this.store.updateSimulation(previousState);
    this.store.setEndReached(false);
    this.store.setHasUndo(this.store.hasHistory());
  }
}
