import { Injectable } from '@angular/core';
import { BehaviorSubject, map, interval, Subscription } from 'rxjs';
import {
  SimulatorState,
  SimulatorGuards,
  SimulatorViewModel,
  ProgramPhase,
  ViewOptions,
} from '../simulator.state/simulator.state.models';
import { ConstantsInit } from '../../domain/shared/constants';
import { RiscvRegisters, RiscvState, SimulatorStateObject } from '../../domain/shared/types';

const AUTOSAVE_ENABLED_KEY = 'autosave.enabled';
const AUTOSAVE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutos
const AUTOSAVE_KEY = 'rv-sim.autosave.source';

const INITIAL_STATE: SimulatorState = {
  source: { text: '.data\n\n.text\n' },
  phase: 'idle',
  assembly: null,
  simulation: createInitialSimulation(),
  endReached: false,
  hasUndo: false,
  errorMessage: null,
  selectedTabIndex: 0,
  viewOptions: {
    isHexAddresses: true,
    isHexValues: true,
    isAscii: false,
  },
};

function computeGuards(state: SimulatorState): SimulatorGuards {
  const isBusy = state.phase === 'assembling' || state.phase === 'running';
  const hasSimulation = !!state.simulation;
  const hasInstructions = (state.simulation?.analysis?.text?.length ?? 0) > 0;

  const isAssembled = state.phase === 'assembled' || state.phase === 'paused';

  const canExecute =
    isAssembled && hasSimulation && hasInstructions && !state.endReached && !isBusy;

  return {
    canOpen: !isBusy,
    canDownload: !isBusy,
    canDump: isAssembled && !isBusy,
    canAssemble: !isBusy,
    canRun: canExecute,
    canStep: canExecute,
    canUndo: state.hasUndo && !isBusy,
    canReset: isAssembled && !isBusy,
    canHelp: true,
  };
}

function toViewModel(state: SimulatorState): SimulatorViewModel {
  return { state, guards: computeGuards(state) };
}

function createInitialSimulation(): SimulatorStateObject {
  const riscv: RiscvState = {
    pc: ConstantsInit.PC,
    registers: createDefaultRegisters(),
    memory: {},
    lastMutation: null,
  };

  return {
    source: '',
    analysis: { data: [], text: [], symbols: {} },
    assembled: false,
    riscv,
  };
}

function createDefaultRegisters(): RiscvRegisters {
  const registers: RiscvRegisters = {};

  for (let index = 0; index < 32; index++) {
    registers[`x${index}`] = 0;
  }

  registers['x0'] = 0;
  registers['x2'] = 2147479548;
  registers['x3'] = 268468224;

  return registers;
}

@Injectable({ providedIn: 'root' })
export class SimulatorStore {
  private readonly subject = new BehaviorSubject<SimulatorState>(INITIAL_STATE);

  public readonly state$ = this.subject.asObservable();
  public readonly vm$ = this.state$.pipe(map(toViewModel));

  public readonly canOpen$ = this.vm$.pipe(map((vm) => vm.guards.canOpen));
  public readonly canDownload$ = this.vm$.pipe(map((vm) => vm.guards.canDownload));
  public readonly canDump$ = this.vm$.pipe(map((vm) => vm.guards.canDump));
  public readonly canAssemble$ = this.vm$.pipe(map((vm) => vm.guards.canAssemble));
  public readonly canRun$ = this.vm$.pipe(map((vm) => vm.guards.canRun));
  public readonly canStep$ = this.vm$.pipe(map((vm) => vm.guards.canStep));
  public readonly canUndo$ = this.vm$.pipe(map((vm) => vm.guards.canUndo));
  public readonly canReset$ = this.vm$.pipe(map((vm) => vm.guards.canReset));

  private readonly _helpOpen = new BehaviorSubject<boolean>(false);
  readonly helpOpen$ = this._helpOpen.asObservable();

  private history: SimulatorStateObject[] = [];
  private autosaveSub?: Subscription;

  private autosaveEnabled = true;

  constructor() {
    const savedSource = localStorage.getItem(AUTOSAVE_KEY);
    if (savedSource) {
      this.subject.next({
        ...INITIAL_STATE,
        source: { text: savedSource },
        phase: 'edited',
      });
    }

    const savedAutosave = localStorage.getItem(AUTOSAVE_ENABLED_KEY);
    this.autosaveEnabled = savedAutosave !== 'false';

    this.startAutosave();

    window.addEventListener('beforeunload', () => {
      if (!this.autosaveEnabled) {
        return;
      }

      const source = this.subject.value.source?.text ?? '';
      if (source.trim().length >= 5) {
        localStorage.setItem(AUTOSAVE_KEY, source);
      }
    });
  }

  public getSnapshot(): SimulatorViewModel {
    return toViewModel(this.subject.value);
  }

  public setSelectedTab(index: number): void {
    this.patch({ selectedTabIndex: index });
  }

  public getSelectedTab(): number {
    return this.subject.value.selectedTabIndex;
  }

  public setSourceText(text: string): void {
    const hasText = !!text && text.length > 0;

    this.patch({
      source: { text },
      assembly: null,
      simulation: createInitialSimulation(),
      phase: hasText ? 'edited' : 'idle',
      endReached: false,
      hasUndo: false,
      errorMessage: null,
    });
  }

  public setPhase(phase: ProgramPhase): void {
    this.patch({ phase });
  }

  public setAssembly(assembly: SimulatorState['assembly']): void {
    this.patch({
      assembly,
      phase: assembly ? 'assembled' : 'edited',
      endReached: false,
    });
  }

  public setSimulation(simulationStateObject: SimulatorStateObject | null): void {
    this.patch({
      simulation: simulationStateObject,
      phase: simulationStateObject ? 'assembled' : 'edited',
      endReached: false,
    });
  }

  public updateSimulation(sim: SimulatorStateObject): void {
    this.patch({
      simulation: sim,
      phase: 'paused',
    });
  }

  public getSimulation(): SimulatorStateObject | null {
    return this.subject.value.simulation;
  }

  public setPc(pc: number | null): void {
    const subject = this.subject.value;
    if (!subject.assembly || pc == null) return;

    this.patch({
      assembly: {
        ...subject.assembly,
        memories: { ...subject.assembly.memories, pc },
      },
    });
  }

  public setEndReached(flag: boolean): void {
    this.patch({ endReached: flag });
  }

  public setHasUndo(flag: boolean): void {
    this.patch({ hasUndo: flag });
  }

  public setError(message: string | null): void {
    const subject = this.subject.value;
    this.patch({
      errorMessage: message,
      phase: message ? 'error' : subject.phase,
    });
  }

  public reset(): void {
    this.history = [];
    this.subject.next(this.createFreshState());
  }

  public pushHistory(state: SimulatorStateObject): void {
    this.history.push(structuredClone(state));
    this.patch({ hasUndo: true });
  }

  public popHistory(): SimulatorStateObject | null {
    const popped = this.history.pop() ?? null;
    this.patch({ hasUndo: this.history.length > 0 });
    return popped;
  }

  public hasHistory(): boolean {
    return this.history.length > 0;
  }

  public openHelp(): void {
    this._helpOpen.next(true);
  }

  public closeHelp(): void {
    this._helpOpen.next(false);
  }

  public clearAutosave(): void {
    localStorage.removeItem(AUTOSAVE_KEY);
  }

  private patch(partial: Partial<SimulatorState>): void {
    this.subject.next({ ...this.subject.value, ...partial });
  }

  public setViewOptions(partial: Partial<ViewOptions>): void {
    const current = this.subject.value.viewOptions;
    this.patch({
      viewOptions: { ...current, ...partial },
    });
  }

  public getViewOptions(): ViewOptions {
    return this.subject.value.viewOptions;
  }

  private createFreshState(): SimulatorState {
    return {
      source: this.subject.value.source,
      phase: 'idle',
      assembly: null,
      simulation: createInitialSimulation(),
      endReached: false,
      hasUndo: false,
      errorMessage: null,
      selectedTabIndex: 0,
      viewOptions: {
        isHexAddresses: true,
        isHexValues: true,
        isAscii: false,
      },
    };
  }

  public setAutosaveEnabled(enabled: boolean): void {
    this.autosaveEnabled = enabled;
    localStorage.setItem(AUTOSAVE_ENABLED_KEY, String(enabled));

    if (enabled) {
      this.startAutosave();
    } else {
      this.stopAutosave();
    }
  }

  public isAutosaveEnabled(): boolean {
    return this.autosaveEnabled;
  }

  public resetAll(): void {
    this.history = [];
    localStorage.removeItem(AUTOSAVE_KEY);
    this.subject.next(structuredClone(INITIAL_STATE));
  }

  private startAutosave(): void {
    this.stopAutosave();

    if (!this.autosaveEnabled) {
      return;
    }

    this.autosaveSub = interval(AUTOSAVE_INTERVAL_MS).subscribe(() => {
      const source = this.subject.value.source?.text ?? '';
      if (source.trim().length < 5) {
        return;
      }
      localStorage.setItem(AUTOSAVE_KEY, source);
    });
  }

  private stopAutosave(): void {
    this.autosaveSub?.unsubscribe();
    this.autosaveSub = undefined;
  }
}
