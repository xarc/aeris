import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SimulatorStore } from '../../../../core/state/simulator.store/simulator.store';
import { AnalyzedInstruction, SimulatorStateObject } from '../../../../core/domain/shared/types';
import { ALU, AluOperation } from '../../../../core/domain/riscv/units/ALU';

type NodeId =
  | 'pc'
  | 'imem'
  | 'control'
  | 'regfile'
  | 'immgen'
  | 'alumux'
  | 'alu'
  | 'dmem'
  | 'wbmux'
  | 'pcupdate';

type EdgeId =
  | 'pc-imem'
  | 'imem-control'
  | 'imem-regfile'
  | 'imem-immgen'
  | 'regfile-alu'
  | 'regfile-alumux'
  | 'regfile-dmem'
  | 'immgen-alumux'
  | 'alumux-alu'
  | 'alu-dmem'
  | 'alu-wbmux'
  | 'dmem-wbmux'
  | 'wbmux-regfile'
  | 'control-alu'
  | 'control-dmem'
  | 'control-pcupdate'
  | 'immgen-pcupdate'
  | 'pcupdate-pc';

type Step = { nodes: NodeId[]; edges: EdgeId[] };

type Category =
  | 'r'
  | 'i-alu'
  | 'load'
  | 'store'
  | 'branch'
  | 'jump'
  | 'jalr'
  | 'u'
  | 'sys'
  | 'unknown';

type OperandValues = {
  rdName?: string;
  rs1Name?: string;
  rs1Value?: number;
  rs2Name?: string;
  rs2Value?: number;
  imm?: number;
  aluOp?: AluOperation;
  aluOpSymbol?: string;
  aluResult?: number;
  memAddress?: number;
  memValue?: number;
  writebackName?: string;
  writebackValue?: number;
  branchTaken?: boolean;
};

const FETCH: Step = { nodes: ['pc', 'imem'], edges: ['pc-imem'] };
const DECODE: Step = {
  nodes: ['control', 'regfile', 'immgen'],
  edges: ['imem-control', 'imem-regfile', 'imem-immgen'],
};
const PC_NEXT: Step = { nodes: ['pcupdate'], edges: ['control-pcupdate', 'pcupdate-pc'] };
const PC_NEXT_BRANCH: Step = {
  nodes: ['pcupdate'],
  edges: ['control-pcupdate', 'immgen-pcupdate', 'pcupdate-pc'],
};

const SEQUENCES: Record<Category, Step[]> = {
  r: [
    FETCH,
    DECODE,
    { nodes: ['alumux'], edges: ['regfile-alu', 'regfile-alumux', 'control-alu'] },
    { nodes: ['alu'], edges: ['alumux-alu'] },
    { nodes: ['wbmux'], edges: ['alu-wbmux'] },
    { nodes: [], edges: ['wbmux-regfile'] },
    PC_NEXT,
  ],
  'i-alu': [
    FETCH,
    DECODE,
    { nodes: ['alumux'], edges: ['regfile-alu', 'immgen-alumux', 'control-alu'] },
    { nodes: ['alu'], edges: ['alumux-alu'] },
    { nodes: ['wbmux'], edges: ['alu-wbmux'] },
    { nodes: [], edges: ['wbmux-regfile'] },
    PC_NEXT,
  ],
  load: [
    FETCH,
    DECODE,
    { nodes: ['alumux'], edges: ['regfile-alu', 'immgen-alumux', 'control-alu'] },
    { nodes: ['alu'], edges: ['alumux-alu'] },
    { nodes: ['dmem'], edges: ['alu-dmem', 'control-dmem'] },
    { nodes: ['wbmux'], edges: ['dmem-wbmux'] },
    { nodes: [], edges: ['wbmux-regfile'] },
    PC_NEXT,
  ],
  store: [
    FETCH,
    DECODE,
    { nodes: ['alumux'], edges: ['regfile-alu', 'immgen-alumux', 'control-alu'] },
    { nodes: ['alu'], edges: ['alumux-alu'] },
    { nodes: ['dmem'], edges: ['alu-dmem', 'regfile-dmem', 'control-dmem'] },
    PC_NEXT,
  ],
  branch: [
    FETCH,
    DECODE,
    { nodes: ['alumux'], edges: ['regfile-alu', 'regfile-alumux', 'control-alu'] },
    { nodes: ['alu'], edges: ['alumux-alu'] },
    PC_NEXT_BRANCH,
  ],
  jump: [
    FETCH,
    {
      nodes: ['control', 'immgen', 'regfile'],
      edges: ['imem-control', 'imem-immgen', 'imem-regfile'],
    },
    { nodes: ['wbmux'], edges: [] },
    { nodes: [], edges: ['wbmux-regfile'] },
    PC_NEXT_BRANCH,
  ],
  jalr: [
    FETCH,
    DECODE,
    { nodes: ['alumux'], edges: ['regfile-alu', 'immgen-alumux', 'control-alu'] },
    { nodes: ['alu'], edges: ['alumux-alu'] },
    { nodes: ['wbmux'], edges: ['alu-wbmux'] },
    { nodes: [], edges: ['wbmux-regfile'] },
    PC_NEXT,
  ],
  u: [
    FETCH,
    {
      nodes: ['control', 'immgen', 'regfile'],
      edges: ['imem-control', 'imem-immgen', 'imem-regfile'],
    },
    { nodes: ['alumux'], edges: ['immgen-alumux', 'control-alu'] },
    { nodes: ['alu'], edges: ['alumux-alu'] },
    { nodes: ['wbmux'], edges: ['alu-wbmux'] },
    { nodes: [], edges: ['wbmux-regfile'] },
    PC_NEXT,
  ],
  sys: [FETCH, { nodes: ['control'], edges: ['imem-control'] }, PC_NEXT],
  unknown: [FETCH, DECODE],
};

const LOADS = new Set(['lb', 'lh', 'lw', 'lbu', 'lhu']);
const STORES = new Set(['sb', 'sh', 'sw']);
const BRANCHES = new Set(['beq', 'bne', 'blt', 'bge', 'bltu', 'bgeu']);
const R_TYPE = new Set(['add', 'sub', 'sll', 'slt', 'sltu', 'xor', 'srl', 'sra', 'or', 'and']);
const I_ALU = new Set(['addi', 'slti', 'sltiu', 'xori', 'ori', 'andi', 'slli', 'srli', 'srai']);
const U_TYPE = new Set(['lui', 'auipc']);

const R_ALU_OP: Record<string, AluOperation> = {
  add: 'ADD',
  sub: 'SUB',
  and: 'AND',
  or: 'OR',
  xor: 'XOR',
  sll: 'SLL',
  srl: 'SRL',
  sra: 'SRA',
  slt: 'SLT',
  sltu: 'SLTU',
};

const I_ALU_OP: Record<string, AluOperation> = {
  addi: 'ADD',
  andi: 'AND',
  ori: 'OR',
  xori: 'XOR',
  slli: 'SLL',
  srli: 'SRL',
  srai: 'SRA',
  slti: 'SLT',
  sltiu: 'SLTU',
};

const ALU_OP_SYMBOL: Record<AluOperation, string> = {
  ADD: '+',
  SUB: '-',
  AND: '&',
  OR: '|',
  XOR: '^',
  SLL: '<<',
  SRL: '>>>',
  SRA: '>>',
  SLT: '<',
  SLTU: '<u',
};

function categorize(mnemonic: string | undefined): Category {
  if (!mnemonic) {
    return 'unknown';
  }

  const normalizedMnemonic = mnemonic.toLowerCase();

  if (R_TYPE.has(normalizedMnemonic)) {
    return 'r';
  }
  if (I_ALU.has(normalizedMnemonic)) {
    return 'i-alu';
  }
  if (LOADS.has(normalizedMnemonic)) {
    return 'load';
  }
  if (STORES.has(normalizedMnemonic)) {
    return 'store';
  }
  if (BRANCHES.has(normalizedMnemonic)) {
    return 'branch';
  }
  if (normalizedMnemonic === 'jal') {
    return 'jump';
  }
  if (normalizedMnemonic === 'jalr') {
    return 'jalr';
  }
  if (U_TYPE.has(normalizedMnemonic)) {
    return 'u';
  }
  if (normalizedMnemonic === 'ecall' || normalizedMnemonic === 'ebreak') {
    return 'sys';
  }

  return 'unknown';
}

const CATEGORY_LABEL: Record<Category, string> = {
  r: 'R-type - register arithmetic',
  'i-alu': 'I-type - immediate arithmetic',
  load: 'I-type - load',
  store: 'S-type - store',
  branch: 'B-type - branch',
  jump: 'J-type - jump',
  jalr: 'I-type - jump register',
  u: 'U-type - upper immediate',
  sys: 'SYSTEM - environment call',
  unknown: 'unrecognized',
};

function parseMemToken(token: string | undefined): { imm: number; rs1: string } | null {
  if (!token) {
    return null;
  }
  const match = token.match(/^(-?\d+)\((x\d+)\)$/);
  if (!match) {
    return null;
  }
  return { imm: parseInt(match[1], 10), rs1: match[2] };
}

type ControlSummary = {
  regWrite: boolean;
  memRead: boolean;
  memWrite: boolean;
  branch: boolean;
  jump: boolean;
  aluSrc: 'reg' | 'imm';
};

const CONTROL_BY_CATEGORY: Record<Category, ControlSummary> = {
  r: { regWrite: true, memRead: false, memWrite: false, branch: false, jump: false, aluSrc: 'reg' },
  'i-alu': {
    regWrite: true,
    memRead: false,
    memWrite: false,
    branch: false,
    jump: false,
    aluSrc: 'imm',
  },
  load: { regWrite: true, memRead: true, memWrite: false, branch: false, jump: false, aluSrc: 'imm' },
  store: {
    regWrite: false,
    memRead: false,
    memWrite: true,
    branch: false,
    jump: false,
    aluSrc: 'imm',
  },
  branch: {
    regWrite: false,
    memRead: false,
    memWrite: false,
    branch: true,
    jump: false,
    aluSrc: 'reg',
  },
  jump: { regWrite: true, memRead: false, memWrite: false, branch: false, jump: true, aluSrc: 'imm' },
  jalr: { regWrite: true, memRead: false, memWrite: false, branch: false, jump: true, aluSrc: 'imm' },
  u: { regWrite: true, memRead: false, memWrite: false, branch: false, jump: false, aluSrc: 'imm' },
  sys: {
    regWrite: false,
    memRead: false,
    memWrite: false,
    branch: false,
    jump: false,
    aluSrc: 'reg',
  },
  unknown: {
    regWrite: false,
    memRead: false,
    memWrite: false,
    branch: false,
    jump: false,
    aluSrc: 'reg',
  },
};

function controlSummary(category: Category): string {
  const control = CONTROL_BY_CATEGORY[category];
  const flags: string[] = [];

  if (control.regWrite) {
    flags.push('RegWrite');
  }
  if (control.memRead) {
    flags.push('MemRead');
  }
  if (control.memWrite) {
    flags.push('MemWrite');
  }
  if (control.branch) {
    flags.push('Branch');
  }
  if (control.jump) {
    flags.push('Jump');
  }
  flags.push(`ALUSrc=${control.aluSrc}`);

  return flags.join(' · ');
}

function evalBranch(mnemonic: string, rs1Value: number, rs2Value: number): boolean {
  switch (mnemonic) {
    case 'beq':
      return rs1Value === rs2Value;
    case 'bne':
      return rs1Value !== rs2Value;
    case 'blt':
      return rs1Value < rs2Value;
    case 'bge':
      return rs1Value >= rs2Value;
    case 'bltu':
      return (rs1Value >>> 0) < (rs2Value >>> 0);
    case 'bgeu':
      return (rs1Value >>> 0) >= (rs2Value >>> 0);
    default:
      return false;
  }
}

const alu = new ALU();

type EdgeDef = {
  id: EdgeId;
  d: string;
  loop?: boolean;
  pulseD: string;
  labelX: number;
  labelY: number;
  labelDx: number;
  labelDy: number;
};

type Point = [number, number];

function parsePoints(d: string): Point[] {
  const points: Point[] = [];
  let x = 0;
  let y = 0;

  for (const token of d.trim().split(/\s+/)) {
    const cmd = token[0];
    if (cmd === 'M') {
      [x, y] = token.slice(1).split(',').map(Number);
    } else if (cmd === 'H') {
      x = parseFloat(token.slice(1));
    } else if (cmd === 'V') {
      y = parseFloat(token.slice(1));
    }
    points.push([x, y]);
  }

  return points;
}

function pointsToPath(points: Point[]): string {
  return points
    .map(([x, y], index) => {
      if (index === 0) {
        return `M${x},${y}`;
      }
      const [previousX, previousY] = points[index - 1];
      return x === previousX && y !== previousY ? `V${y}` : `H${x}`;
    })
    .join(' ');
}

function trimEnd(points: Point[], amount: number): Point[] {
  if (points.length < 2 || amount <= 0) {
    return points;
  }

  const trimmed = points.slice();
  const [x2, y2] = trimmed[trimmed.length - 1];
  const [x1, y1] = trimmed[trimmed.length - 2];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);

  if (len <= amount) {
    trimmed.pop();
    return trimmed.length > 1 ? trimEnd(trimmed, amount - len) : trimmed;
  }

  const ratio = (len - amount) / len;
  trimmed[trimmed.length - 1] = [x1 + dx * ratio, y1 + dy * ratio];
  return trimmed;
}

function longestSegmentMidpoint(points: Point[]): { x: number; y: number; horizontal: boolean } {
  let bestX = points[0][0];
  let bestY = points[0][1];
  let bestHorizontal = true;
  let bestLength = -1;

  for (let index = 1; index < points.length; index++) {
    const [x1, y1] = points[index - 1];
    const [x2, y2] = points[index];
    const length = Math.hypot(x2 - x1, y2 - y1);

    if (length > bestLength) {
      bestLength = length;
      bestX = (x1 + x2) / 2;
      bestY = (y1 + y2) / 2;
      bestHorizontal = y1 === y2;
    }
  }

  return { x: bestX, y: bestY, horizontal: bestHorizontal };
}

function edge(id: EdgeId, d: string, loop = false): EdgeDef {
  const points = parsePoints(d);
  const pulseD = pointsToPath(trimEnd(points, 18));
  const midpoint = longestSegmentMidpoint(points);

  const labelDx = midpoint.horizontal ? 0 : 10;
  const labelDy = midpoint.horizontal ? -8 : 4;

  return {
    id,
    d,
    loop,
    pulseD,
    labelX: midpoint.x,
    labelY: midpoint.y,
    labelDx,
    labelDy,
  };
}

const EDGES: EdgeDef[] = [
  edge('pc-imem', 'M120,295 H200'),
  edge('imem-control', 'M265,360 V430'),
  edge('imem-regfile', 'M330,295 H410'),
  edge('imem-immgen', 'M300,360 V400 H475 V430'),
  edge('regfile-alu', 'M540,260 H700'),
  edge('regfile-alumux', 'M540,315 H610'),
  edge('regfile-dmem', 'M540,350 H560 V420 H935 V380'),
  edge('immgen-alumux', 'M530,465 H590 V335 H610'),
  edge('alumux-alu', 'M650,325 H700'),
  edge('alu-dmem', 'M800,300 H870'),
  edge('alu-wbmux', 'M800,260 H815 V105 H800'),
  edge('dmem-wbmux', 'M935,220 V135 H800'),
  edge('wbmux-regfile', 'M700,120 H475 V200'),
  edge('control-alu', 'M265,500 V520 H750 V370'),
  edge('control-dmem', 'M265,500 V520 H935 V380'),
  edge('control-pcupdate', 'M265,500 V520 H1020 V80 H1000'),
  edge('immgen-pcupdate', 'M475,500 V535 H1010 V95 H1000'),
  edge('pcupdate-pc', 'M925,30 V15 H75 V240', true),
];

function hex(value: number, width = 8): string {
  return '0x' + (value >>> 0).toString(16).padStart(width, '0').toUpperCase();
}

@Component({
  selector: 'app-datapath-dialog',
  standalone: false,
  templateUrl: './datapath-dialog.html',
  styleUrl: './datapath-dialog.scss',
})
export class DatapathDialog implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private timers: ReturnType<typeof setTimeout>[] = [];

  readonly edges = EDGES;

  instructionText = '';
  categoryLabel = '';
  hasInstruction = false;
  isPlaying = false;

  activeNodes = new Set<NodeId>();
  activeEdges = new Set<EdgeId>();

  private category: Category = 'unknown';
  private values: OperandValues = {};
  private pc = 0;

  constructor(
    public dialogRef: MatDialogRef<DatapathDialog>,
    private readonly store: SimulatorStore,
  ) {}

  ngOnInit(): void {
    this.store.state$.pipe(takeUntil(this.destroy$)).subscribe((state) => {
      if (this.isPlaying) {
        return;
      }
      this.readNextInstruction(state.simulation);
    });
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.destroy$.next();
    this.destroy$.complete();
  }

  isNodeActive(id: NodeId): boolean {
    return this.activeNodes.has(id);
  }

  isEdgeActive(id: EdgeId): boolean {
    return this.activeEdges.has(id);
  }

  play(): void {
    if (this.isPlaying || !this.hasInstruction) {
      return;
    }

    this.clearTimers();
    this.activeNodes = new Set();
    this.activeEdges = new Set();
    this.isPlaying = true;

    const steps = SEQUENCES[this.category];
    const stepDurationMs = 650;

    steps.forEach((step, index) => {
      const timer = setTimeout(() => {
        step.nodes.forEach((node) => this.activeNodes.add(node));
        step.edges.forEach((edgeId) => this.activeEdges.add(edgeId));
        this.activeNodes = new Set(this.activeNodes);
        this.activeEdges = new Set(this.activeEdges);

        if (index === steps.length - 1) {
          const endTimer = setTimeout(() => {
            this.isPlaying = false;
          }, stepDurationMs);
          this.timers.push(endTimer);
        }
      }, index * stepDurationMs);

      this.timers.push(timer);
    });
  }

  reset(): void {
    this.clearTimers();
    this.isPlaying = false;
    this.activeNodes = new Set();
    this.activeEdges = new Set();
  }

  close(): void {
    this.dialogRef.close();
  }

  tip(id: EdgeId | NodeId): string {
    if (!this.hasInstruction) {
      return '';
    }

    const values = this.values;

    switch (id) {
      case 'pc':
        return `PC = ${hex(this.pc)}`;
      case 'pcupdate':
        return values.branchTaken === undefined
          ? 'Next PC = PC + 4'
          : `Branch taken: ${values.branchTaken}`;
      case 'regfile':
      case 'regfile-alu':
        return values.rs1Name ? `${values.rs1Name} = ${values.rs1Value}` : '';
      case 'regfile-alumux':
      case 'regfile-dmem':
        return values.rs2Name ? `${values.rs2Name} = ${values.rs2Value}` : '';
      case 'immgen-alumux':
      case 'immgen-pcupdate':
        return values.imm !== undefined ? `imm = ${values.imm}` : '';
      case 'alumux-alu':
        return values.aluResult !== undefined
          ? `ALU input B = ${this.category === 'r' || this.category === 'branch' ? values.rs2Value : values.imm}`
          : '';
      case 'alu': {
        if (values.aluResult === undefined) {
          return '';
        }
        if (this.category === 'branch') {
          return `${values.rs1Value} vs ${values.rs2Value} → taken: ${values.branchTaken}`;
        }
        if (this.category === 'r') {
          return `${values.rs1Value} ${values.aluOpSymbol} ${values.rs2Value} = ${values.aluResult}`;
        }
        return `${values.rs1Value} ${values.aluOpSymbol} ${values.imm} = ${values.aluResult}`;
      }
      case 'alu-dmem':
      case 'alu-wbmux':
        return values.aluResult !== undefined ? `result = ${values.aluResult}` : '';
      case 'dmem':
      case 'dmem-wbmux':
        return values.memAddress !== undefined
          ? `mem[${hex(values.memAddress)}] = ${values.memValue}`
          : '';
      case 'wbmux':
      case 'wbmux-regfile':
        return values.writebackName ? `write ${values.writebackName} = ${values.writebackValue}` : '';
      case 'control':
        return `Control: ${controlSummary(this.category)}`;
      case 'control-alu':
        return values.aluOp ? `ALUOp = ${values.aluOp}` : '';
      case 'control-dmem': {
        const control = CONTROL_BY_CATEGORY[this.category];
        if (control.memRead) {
          return 'MemRead = 1';
        }
        if (control.memWrite) {
          return 'MemWrite = 1';
        }
        return '';
      }
      case 'control-pcupdate': {
        const control = CONTROL_BY_CATEGORY[this.category];
        if (control.branch) {
          return `Branch = 1 (taken: ${values.branchTaken})`;
        }
        if (control.jump) {
          return 'Jump = 1';
        }
        return 'PCSrc = PC + 4';
      }
      default:
        return '';
    }
  }

  pulseValue(id: EdgeId): string {
    if (!this.hasInstruction) {
      return '';
    }

    const values = this.values;

    switch (id) {
      case 'pc-imem':
        return hex(this.pc);
      case 'regfile-alu':
        return values.rs1Name ? `${values.rs1Name}=${values.rs1Value}` : '';
      case 'regfile-alumux':
      case 'regfile-dmem':
        return values.rs2Name ? `${values.rs2Name}=${values.rs2Value}` : '';
      case 'immgen-alumux':
      case 'immgen-pcupdate':
        return values.imm !== undefined ? `${values.imm}` : '';
      case 'alumux-alu':
        return values.aluResult !== undefined
          ? `${this.category === 'r' || this.category === 'branch' ? values.rs2Value : values.imm}`
          : '';
      case 'alu-dmem':
      case 'alu-wbmux':
        return values.aluResult !== undefined ? `${values.aluResult}` : '';
      case 'dmem-wbmux':
        return values.memValue !== undefined ? `${values.memValue}` : '';
      case 'wbmux-regfile':
        return values.writebackValue !== undefined ? `${values.writebackValue}` : '';
      case 'control-alu':
        return values.aluOp ?? '';
      case 'control-dmem': {
        const control = CONTROL_BY_CATEGORY[this.category];
        if (control.memRead) {
          return 'MemRead';
        }
        if (control.memWrite) {
          return 'MemWrite';
        }
        return '';
      }
      case 'control-pcupdate': {
        const control = CONTROL_BY_CATEGORY[this.category];
        if (control.branch) {
          return 'Branch';
        }
        if (control.jump) {
          return 'Jump';
        }
        return 'PC+4';
      }
      default:
        return '';
    }
  }

  private readNextInstruction(simulation: SimulatorStateObject | null): void {
    const pc = simulation?.riscv?.pc ?? 0;
    this.pc = pc;

    const entry: AnalyzedInstruction | undefined = simulation?.analysis?.text?.find(
      (row) => row.address === pc,
    );

    if (!entry) {
      this.hasInstruction = false;
      this.instructionText = '';
      this.categoryLabel = '';
      this.category = 'unknown';
      this.values = {};
      return;
    }

    this.hasInstruction = true;
    this.instructionText = entry.operands?.length ? entry.operands.join(' ') : entry.opcode;
    this.category = categorize(entry.opcode);
    this.categoryLabel = CATEGORY_LABEL[this.category];
    this.values = this.decodeValues(entry, simulation);
  }

  private decodeValues(
    entry: AnalyzedInstruction,
    simulation: SimulatorStateObject | null,
  ): OperandValues {
    const registers = simulation?.riscv?.registers ?? {};
    const memory = simulation?.riscv?.memory ?? {};
    const operandTokens = (entry.operands ?? []).slice(1);
    const readRegister = (name?: string) => (name ? (registers[name] ?? 0) | 0 : 0);

    switch (this.category) {
      case 'r': {
        const [rd, rs1, rs2] = operandTokens;
        const rs1Value = readRegister(rs1);
        const rs2Value = readRegister(rs2);
        const op = R_ALU_OP[entry.opcode] ?? 'ADD';
        const aluResult = alu.exec(op, rs1Value, rs2Value);
        return {
          rdName: rd,
          rs1Name: rs1,
          rs1Value,
          rs2Name: rs2,
          rs2Value,
          aluOp: op,
          aluOpSymbol: ALU_OP_SYMBOL[op],
          aluResult,
          writebackName: rd,
          writebackValue: aluResult,
        };
      }

      case 'i-alu': {
        const [rd, rs1, immediateToken] = operandTokens;
        const rs1Value = readRegister(rs1);
        const imm = parseInt(immediateToken, 10) || 0;
        const op = I_ALU_OP[entry.opcode] ?? 'ADD';
        const aluResult = alu.exec(op, rs1Value, imm);
        return {
          rdName: rd,
          rs1Name: rs1,
          rs1Value,
          imm,
          aluOp: op,
          aluOpSymbol: ALU_OP_SYMBOL[op],
          aluResult,
          writebackName: rd,
          writebackValue: aluResult,
        };
      }

      case 'load': {
        const [rd, memoryToken] = operandTokens;
        const parsed = parseMemToken(memoryToken);
        const rs1Value = readRegister(parsed?.rs1);
        const imm = parsed?.imm ?? 0;
        const address = (rs1Value + imm) | 0;
        const wordAddress = address & ~3;
        const memValue = memory[wordAddress] ?? 0;
        return {
          rdName: rd,
          rs1Name: parsed?.rs1,
          rs1Value,
          imm,
          aluOpSymbol: '+',
          aluResult: address,
          memAddress: address,
          memValue,
          writebackName: rd,
          writebackValue: memValue,
        };
      }

      case 'store': {
        const [rs2, memoryToken] = operandTokens;
        const parsed = parseMemToken(memoryToken);
        const rs1Value = readRegister(parsed?.rs1);
        const imm = parsed?.imm ?? 0;
        const address = (rs1Value + imm) | 0;
        const rs2Value = readRegister(rs2);
        return {
          rs1Name: parsed?.rs1,
          rs1Value,
          rs2Name: rs2,
          rs2Value,
          imm,
          aluOpSymbol: '+',
          aluResult: address,
          memAddress: address,
          memValue: rs2Value,
        };
      }

      case 'branch': {
        const [rs1, rs2, immediateToken] = operandTokens;
        const rs1Value = readRegister(rs1);
        const rs2Value = readRegister(rs2);
        return {
          rs1Name: rs1,
          rs1Value,
          rs2Name: rs2,
          rs2Value,
          imm: parseInt(immediateToken, 10) || 0,
          aluOpSymbol: '-',
          aluResult: rs1Value - rs2Value,
          branchTaken: evalBranch(entry.opcode, rs1Value, rs2Value),
        };
      }

      case 'u': {
        const [rd, immediateToken] = operandTokens;
        const imm = parseInt(immediateToken, 10) || 0;
        return { rdName: rd, imm, writebackName: rd, writebackValue: imm };
      }

      case 'jump':
      case 'jalr': {
        const [rd] = operandTokens;
        return { rdName: rd, writebackName: rd, writebackValue: this.pc + 4 };
      }

      default:
        return {};
    }
  }

  private clearTimers(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers = [];
  }
}
