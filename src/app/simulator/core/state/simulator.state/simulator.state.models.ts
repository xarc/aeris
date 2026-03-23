import { SimulatorStateObject } from '../../domain/shared/types';

export type ViewOptions = {
  isHexAddresses: boolean;
  isHexValues: boolean;
  isAscii: boolean;
};

export type ProgramPhase =
  | 'idle'
  | 'edited'
  | 'assembling'
  | 'assembled'
  | 'running'
  | 'paused'
  | 'halted'
  | 'error';

export interface SimulatorState {
  source: { text: string };
  phase: ProgramPhase;
  assembly: null | {
    code: any;
    memories: { pc: number; regFile: any; memory: any };
    control?: any;
  };
  simulation: SimulatorStateObject | null;
  endReached: boolean;
  hasUndo: boolean;
  errorMessage: string | null;
  selectedTabIndex: number;
  viewOptions: ViewOptions;
}

export interface SimulatorGuards {
  canOpen: boolean;
  canDownload: boolean;
  canDump: boolean;
  canAssemble: boolean;
  canRun: boolean;
  canStep: boolean;
  canUndo: boolean;
  canReset: boolean;
  canHelp: boolean;
}

export interface SimulatorViewModel {
  state: SimulatorState;
  guards: SimulatorGuards;
}
