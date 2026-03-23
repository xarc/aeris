import { InstructionSpec } from '../../shared/types';

export const INSTRUCTION_SET: Record<string, InstructionSpec> = {
  // R
  add: { operands: ['rd', 'rs1', 'rs2'] },
  sub: { operands: ['rd', 'rs1', 'rs2'] },
  and: { operands: ['rd', 'rs1', 'rs2'] },
  or: { operands: ['rd', 'rs1', 'rs2'] },
  xor: { operands: ['rd', 'rs1', 'rs2'] },
  slt: { operands: ['rd', 'rs1', 'rs2'] },
  sltu: { operands: ['rd', 'rs1', 'rs2'] },
  sll: { operands: ['rd', 'rs1', 'rs2'] },
  srl: { operands: ['rd', 'rs1', 'rs2'] },
  sra: { operands: ['rd', 'rs1', 'rs2'] },

  // I
  addi: { operands: ['rd', 'rs1', 'imm'] },
  andi: { operands: ['rd', 'rs1', 'imm'] },
  ori: { operands: ['rd', 'rs1', 'imm'] },
  xori: { operands: ['rd', 'rs1', 'imm'] },
  slti: { operands: ['rd', 'rs1', 'imm'] },
  sltiu: { operands: ['rd', 'rs1', 'imm'] },
  slli: { operands: ['rd', 'rs1', 'imm'] },
  srli: { operands: ['rd', 'rs1', 'imm'] },
  srai: { operands: ['rd', 'rs1', 'imm'] },

  jalr: { operands: ['rd', 'rs1', 'imm'] },

  // U
  lui: { operands: ['rd', 'imm'] },
  auipc: { operands: ['rd', 'imm'] },

  // J
  jal: { operands: ['rd', 'imm'] },

  // B
  beq: { operands: ['rs1', 'rs2', 'imm'] },
  bne: { operands: ['rs1', 'rs2', 'imm'] },
  blt: { operands: ['rs1', 'rs2', 'imm'] },
  bge: { operands: ['rs1', 'rs2', 'imm'] },
  bltu: { operands: ['rs1', 'rs2', 'imm'] },
  bgeu: { operands: ['rs1', 'rs2', 'imm'] },

  // Loads / Stores
  lw: { operands: ['rd', 'mem'] },
  lh: { operands: ['rd', 'mem'] },
  lhu: { operands: ['rd', 'mem'] },
  lb: { operands: ['rd', 'mem'] },
  lbu: { operands: ['rd', 'mem'] },

  sw: { operands: ['rs2', 'mem'] },
  sh: { operands: ['rs2', 'mem'] },
  sb: { operands: ['rs2', 'mem'] },

  // SYSTEM
  ecall: { operands: [] }
};

export const PSEUDO_SET: Record<string, InstructionSpec> = {
  // básicos
  nop: { operands: [] },
  mv: { operands: ['rd', 'rs1'] },
  li: { operands: ['rd', 'imm'] },
  la: { operands: ['rd', 'imm'] },

  j: { operands: ['imm'] },
  jr: { operands: ['rs1', 'imm'] },

  not: { operands: ['rd', 'rs1'] },

  // branch zero
  beqz: { operands: ['rs1', 'imm'] },
  bnez: { operands: ['rs1', 'imm'] },
  bgez: { operands: ['rs1', 'imm'] },
  bltz: { operands: ['rs1', 'imm'] },
  bgtz: { operands: ['rs1', 'imm'] },
  blez: { operands: ['rs1', 'imm'] },

  // branch comparação
  bgt: { operands: ['rs1', 'rs2', 'imm'] },
  bgtu: { operands: ['rs1', 'rs2', 'imm'] },
  ble: { operands: ['rs1', 'rs2', 'imm'] },
  bleu: { operands: ['rs1', 'rs2', 'imm'] },

  // set pseudos
  seqz: { operands: ['rd', 'rs1'] },
  snez: { operands: ['rd', 'rs1'] },
  sgt: { operands: ['rd', 'rs1', 'rs2'] },
  sgtu: { operands: ['rd', 'rs1', 'rs2'] },
  sgtz: { operands: ['rd', 'rs1'] },
  sltz: { operands: ['rd', 'rs1'] },
};

export const CONTEXTUAL_SET: Record<string, true> = {
  lw: true,
  lh: true,
  lhu: true,
  lb: true,
  lbu: true,

  sw: true,
  sh: true,
  sb: true,
};
