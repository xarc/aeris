export type DataDirective = '.word' | '.ascii' | '.string';
export const Directives: DataDirective[] = ['.word', '.ascii', '.string'];

export type InstructionSource = {
  raw: string[];
  line: number;
  text: string;
};

export type DataEntry = {
  label: string;
  directive: DataDirective;
  values: number[];
  memoryPosition: number;
  bytes?: number[];
};

export type DataSegment = {
  entries: DataEntry[];
};

export type OperandKey = 'rd' | 'rs1' | 'rs2' | 'imm' | 'mem';

export type InstructionSpec = {
  operands: OperandKey[];
};

export type BasicInstruction = {
  opcode: string;
  rd?: string;
  rs1?: string;
  rs2?: string;
  imm?: string;
  mem?: string;
  args?: string[];
};

export type InstructionNode = {
  source: InstructionSource;
  basic: BasicInstruction;
  isPseudo: boolean;
  pc: number;
};

export type TextSegment = {
  instructions: InstructionNode[];
  symbolTable: Map<string, number>;
};

export type CodeAnalysis = {
  data: Array<{
    label: string;
    directive: string;
    values: number[];
    address: number;
  }>;
  text: Array<{
    address: number;
    opcode: string;
    operands: string[];
    raw: string[];
    isPseudo: boolean;
    line: number;
    machine?: {
      binary: string;
      hex: string;
      decimal: number;
    };
  }>;

  symbols: Record<string, number>;
};

export type AnalyzedInstruction = CodeAnalysis['text'][number];

export type RiscvRegisters = Record<string, number>;

export type RiscvState = {
  pc: number;
  registers: RiscvRegisters;
  memory: Record<number, number>;
  lastMutation?: StateMutation | null;
};

export type SimulatorStateObject = {
  source: string;
  analysis: CodeAnalysis;
  assembled?: boolean;
  riscv?: RiscvState;
  executedSteps?: number;
};

export const RegFile: Record<string, { value: number }> = {
  x0: { value: 0 },
  x1: { value: 1 },
  x2: { value: 2 },
  x3: { value: 3 },
  x4: { value: 4 },
  x5: { value: 5 },
  x6: { value: 6 },
  x7: { value: 7 },
  x8: { value: 8 },
  x9: { value: 9 },
  x10: { value: 10 },
  x11: { value: 11 },
  x12: { value: 12 },
  x13: { value: 13 },
  x14: { value: 14 },
  x15: { value: 15 },
  x16: { value: 16 },
  x17: { value: 17 },
  x18: { value: 18 },
  x19: { value: 19 },
  x20: { value: 20 },
  x21: { value: 21 },
  x22: { value: 22 },
  x23: { value: 23 },
  x24: { value: 24 },
  x25: { value: 25 },
  x26: { value: 26 },
  x27: { value: 27 },
  x28: { value: 28 },
  x29: { value: 29 },
  x30: { value: 30 },
  x31: { value: 31 },

  zero: { value: 0 },
  ra: { value: 1 },
  sp: { value: 2 },
  gp: { value: 3 },
  tp: { value: 4 },

  t0: { value: 5 },
  t1: { value: 6 },
  t2: { value: 7 },
  s0: { value: 8 },
  fp: { value: 8 },
  s1: { value: 9 },

  a0: { value: 10 },
  a1: { value: 11 },
  a2: { value: 12 },
  a3: { value: 13 },
  a4: { value: 14 },
  a5: { value: 15 },
  a6: { value: 16 },
  a7: { value: 17 },

  s2: { value: 18 },
  s3: { value: 19 },
  s4: { value: 20 },
  s5: { value: 21 },
  s6: { value: 22 },
  s7: { value: 23 },
  s8: { value: 24 },
  s9: { value: 25 },
  s10: { value: 26 },
  s11: { value: 27 },

  t3: { value: 28 },
  t4: { value: 29 },
  t5: { value: 30 },
  t6: { value: 31 },
};

type Diagnostic = {
  message: string;
  line: number;
  severity: 'error' | 'warning';
};

export type AnalysisResult = {
  ast: {
    dataLines: InstructionSource[];
    textLines: InstructionSource[];
  };
  diagnostics: Diagnostic[];
};

export type AnalyzerDiagnostic = {
  message: string;
  line: number;
  severity: 'error' | 'warning';
};

export type AssemblyResult = {
  analysis: CodeAnalysis;
  errors: Array<{
    message: string;
    line: number;
  }>;
};

export type AssembleInput = SimulatorStateObject;
export type AssembleOutput = SimulatorStateObject;

export type EncodedInstruction = {
  binary: string;
  hex: string;
  decimal: number;
};

export type InstructionFormat = 'R' | 'I' | 'S' | 'B' | 'U' | 'J' | 'SYS';

export type OpcodeInfo = {
  opcode: string;
  funct3?: string;
  funct7?: string;
  format: InstructionFormat;
};

export const ISA_TABLE: Record<string, OpcodeInfo> = {
  add: { opcode: '0110011', funct3: '000', funct7: '0000000', format: 'R' },
  sub: { opcode: '0110011', funct3: '000', funct7: '0100000', format: 'R' },
  sll: { opcode: '0110011', funct3: '001', funct7: '0000000', format: 'R' },
  slt: { opcode: '0110011', funct3: '010', funct7: '0000000', format: 'R' },
  sltu: { opcode: '0110011', funct3: '011', funct7: '0000000', format: 'R' },
  xor: { opcode: '0110011', funct3: '100', funct7: '0000000', format: 'R' },
  srl: { opcode: '0110011', funct3: '101', funct7: '0000000', format: 'R' },
  sra: { opcode: '0110011', funct3: '101', funct7: '0100000', format: 'R' },
  or: { opcode: '0110011', funct3: '110', funct7: '0000000', format: 'R' },
  and: { opcode: '0110011', funct3: '111', funct7: '0000000', format: 'R' },

  addi: { opcode: '0010011', funct3: '000', format: 'I' },
  slti: { opcode: '0010011', funct3: '010', format: 'I' },
  sltiu: { opcode: '0010011', funct3: '011', format: 'I' },
  xori: { opcode: '0010011', funct3: '100', format: 'I' },
  ori: { opcode: '0010011', funct3: '110', format: 'I' },
  andi: { opcode: '0010011', funct3: '111', format: 'I' },

  slli: { opcode: '0010011', funct3: '001', funct7: '0000000', format: 'I' },
  srli: { opcode: '0010011', funct3: '101', funct7: '0000000', format: 'I' },
  srai: { opcode: '0010011', funct3: '101', funct7: '0100000', format: 'I' },

  lb: { opcode: '0000011', funct3: '000', format: 'I' },
  lh: { opcode: '0000011', funct3: '001', format: 'I' },
  lw: { opcode: '0000011', funct3: '010', format: 'I' },
  lbu: { opcode: '0000011', funct3: '100', format: 'I' },
  lhu: { opcode: '0000011', funct3: '101', format: 'I' },

  sb: { opcode: '0100011', funct3: '000', format: 'S' },
  sh: { opcode: '0100011', funct3: '001', format: 'S' },
  sw: { opcode: '0100011', funct3: '010', format: 'S' },

  beq: { opcode: '1100011', funct3: '000', format: 'B' },
  bne: { opcode: '1100011', funct3: '001', format: 'B' },
  blt: { opcode: '1100011', funct3: '100', format: 'B' },
  bge: { opcode: '1100011', funct3: '101', format: 'B' },
  bltu: { opcode: '1100011', funct3: '110', format: 'B' },
  bgeu: { opcode: '1100011', funct3: '111', format: 'B' },

  lui: { opcode: '0110111', format: 'U' },
  auipc: { opcode: '0010111', format: 'U' },

  jal: { opcode: '1101111', format: 'J' },

  jalr: { opcode: '1100111', funct3: '000', format: 'I' },

  ecall: { opcode: '1110011', format: 'SYS' },
};

export class Instruction {
  inst: string;
  info: {
    opcode: string;
    funct3?: string;
    funct7?: string;
    format: InstructionFormat;
  };

  constructor(operands: string[]) {
    this.inst = operands[0];
    const info = ISA_TABLE[this.inst];

    if (!info) {
      throw new Error(`Instruction "${this.inst}" not found in ISA table`);
    }

    this.info = info;
  }
}
export interface StateMutation {
  writtenRegisterIndex?: number | null;
  writtenMemoryAddress?: number | null;
  previousPc?: number;
  nextPc?: number;
  isSyscall?: boolean;
}
