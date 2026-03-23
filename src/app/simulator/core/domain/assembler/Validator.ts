import { AssemblyError } from '../shared/errors';
import { CodeAnalysis, RegFile } from '../shared/types';

type InstructionRow = CodeAnalysis['text'][number];

export class Validator {
  static validate(analysis: CodeAnalysis) {
    for (const instruction of analysis.text) {
      if (instruction.isPseudo) continue;

      switch (instruction.opcode) {
        case 'add':
        case 'sub':
        case 'and':
        case 'or':
        case 'xor':
        case 'sll':
        case 'srl':
        case 'sra':
        case 'slt':
        case 'sltu':
          this.checkR(instruction);
          break;

        case 'addi':
        case 'andi':
        case 'ori':
        case 'xori':
        case 'slti':
        case 'sltiu':
        case 'slli':
        case 'srli':
        case 'srai':
        case 'jalr':
          this.checkI(instruction);
          break;

        case 'lw':
        case 'lb':
        case 'lbu':
        case 'lh':
        case 'lhu':
        case 'sw':
        case 'sb':
        case 'sh':
          this.checkMem(instruction);
          break;

        case 'beq':
        case 'bne':
        case 'blt':
        case 'bge':
        case 'bltu':
        case 'bgeu':
          this.checkB(instruction, analysis.symbols);
          break;

        case 'lui':
        case 'auipc':
          this.checkU(instruction);
          break;

        case 'jal':
          this.checkJ(instruction, analysis.symbols);
          break;

        case 'ecall':
          this.checkSys(instruction);
          break;

        default:
          throw new AssemblyError(
            `"${instruction.opcode}" is not a recognized instruction`,
            instruction.line,
          );
      }
    }
  }

  private static checkR(instruction: InstructionRow) {
    const [, rd, rs1, rs2] = instruction.operands;

    if (!rd || !rs1 || !rs2 || instruction.operands[4]) {
      throw new AssemblyError(
        `"${instruction.opcode}" Too few or incorrectly formatted operands`,
        instruction.line,
      );
    }

    if (!RegFile[rd] || !RegFile[rs1] || !RegFile[rs2]) {
      throw new AssemblyError(
        `"${rd}" or "${rs1}" or "${rs2}" operand is of incorrect type`,
        instruction.line,
      );
    }
  }

  private static checkI(instruction: InstructionRow) {
    const [, rd, rs1, imm] = instruction.operands;

    if (!rd || !rs1 || !imm || instruction.operands[4]) {
      throw new AssemblyError(
        `"${instruction.opcode}" Too few or incorrectly formatted operands`,
        instruction.line,
      );
    }

    if (!RegFile[rd] || !RegFile[rs1]) {
      throw new AssemblyError(`"${rd}" or "${rs1}" operand is of incorrect type`, instruction.line);
    }

    if (isNaN(Number(imm))) {
      throw new AssemblyError(
        `"${imm}" operand is out of range or is not a valid number`,
        instruction.line,
      );
    }
  }

  private static checkMem(instruction: InstructionRow) {
    const [, rd, mem] = instruction.operands;

    if (!rd || !mem) {
      throw new AssemblyError(
        `"${instruction.opcode}" Too few or incorrectly formatted operands`,
        instruction.line,
      );
    }

    if (!RegFile[rd] || !/^-?\d+\(\w+\)$/.test(mem)) {
      throw new AssemblyError(
        `"${instruction.opcode}" Too few or incorrectly formatted operands. Expected: ${instruction.opcode} t1, -100(t2)`,
        instruction.line,
      );
    }
  }

  private static checkB(instruction: InstructionRow, symbols: Record<string, number>) {
    const [, t1, t2] = instruction.operands;

    let label = instruction.raw[3];

    if (instruction.isPseudo) {
      const rawParts = instruction.raw.join(' ').split(/\s|,/).filter(Boolean);
      label = rawParts[rawParts.length - 1];
    }

    if (!t1 || !t2 || !label || instruction.operands[4]) {
      throw new AssemblyError(
        `"${instruction.opcode}" Too few or incorrectly formatted operands. Expected: ${instruction.opcode} t1,t2,label`,
        instruction.line,
      );
    }

    if (!RegFile[t1] || !RegFile[t2]) {
      throw new AssemblyError(`"${t1}" or "${t2}" operand is of incorrect type`, instruction.line);
    }

    if (!(label in symbols)) {
      throw new AssemblyError(`"${label}" not found in symbol table`, instruction.line);
    }
  }

  private static checkU(instruction: InstructionRow) {
    const [, rd, imm] = instruction.operands;

    if (!rd || !imm || instruction.operands[3]) {
      throw new AssemblyError(
        `"${instruction.opcode}" Too few or incorrectly formatted operands`,
        instruction.line,
      );
    }

    if (!RegFile[rd] || isNaN(Number(imm))) {
      throw new AssemblyError(
        `"${imm}" operand is out of range or is not a valid number`,
        instruction.line,
      );
    }
  }

  private static checkJ(instruction: InstructionRow, symbols: Record<string, number>) {
    const [, rd] = instruction.operands;

    const rawParts: string[] = instruction.raw;
    const target = rawParts[rawParts.length - 1];

    if (!rd || !target || rawParts.length > 3) {
      throw new AssemblyError(
        `"${instruction.opcode}" Too few or incorrectly formatted operands. Expected: ${instruction.opcode} t1, target`,
        instruction.line,
      );
    }

    if (!RegFile[rd]) {
      throw new AssemblyError(`"${rd}" operand is of incorrect type`, instruction.line);
    }

    if (!isNaN(Number(target))) {
      return;
    }

    if (!(target in symbols)) {
      throw new AssemblyError(`"${target}" not found in symbol table`, instruction.line);
    }
  }

  private static checkSys(instruction: InstructionRow) {
    if (instruction.operands.length > 1) {
      throw new AssemblyError(`"${instruction.opcode}" does not take operands`, instruction.line);
    }
  }
}