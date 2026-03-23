import { AnalysisError } from '../../shared/errors';
import { RegFile } from '../../shared/types';

export function validateLabelToken(label: string) {
  if (!label.endsWith(':')) {
    throw new AnalysisError(`"${label}" is not a valid label`);
  }
  const clean = label.slice(0, -1);

  if (/^[0-9]/.test(clean)) {
    throw new AnalysisError(`"${clean}" cannot start with a number`);
  }
  const regex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  if (!regex.test(clean)) {
    throw new AnalysisError(`"${clean}" cannot have special characters`);
  }
}

export function isNumericLike(v: string): boolean {
  const number = Number(v);
  return Number.isFinite(number);
}

export function cleanDataLabel(labelWithColon: string): string {
  return labelWithColon.endsWith(':') ? labelWithColon.slice(0, -1) : labelWithColon;
}

export function resolveRegToken(token?: string): string | undefined {
  if (!token) {
    return token;
  }
  if (token.startsWith('x') && /^\d+$/.test(token.slice(1))) {
    return token;
  }
  const register = RegFile[token];
  return register ? `x${register.value}` : token;
}

export function parseMemToken(v: string): { imm: string; rs1: string } | null {
  const parsedMemoryToken = v.match(/^(-?\d+)?\(\s*([a-zA-Z0-9_]+)\s*\)$/);
  if (!parsedMemoryToken) {
    return null;
  }

  return {
    imm: parsedMemoryToken[1] ?? '0',
    rs1: parsedMemoryToken[2],
  };
}

export function formatOperands(opcode: string, parts: Array<string | undefined>): string[] {
  const [rd, rs1, rs2, imm] = parts;

  const op = opcode;

  const isLoad = ['lw', 'lh', 'lhu', 'lb', 'lbu'].includes(op);
  const isStore = ['sw', 'sh', 'sb'].includes(op);
  const isBranch = ['beq', 'bne', 'blt', 'bge', 'bltu', 'bgeu'].includes(op);

  if (isLoad) {
    if (rd && rs1 && imm) {
      return [op, rd, `${imm}(${rs1})`];
    }
    if (rd && imm) {
      return [op, rd, imm];
    }
    return [op].filter(Boolean);
  }

  if (isStore) {
    if (rs2 && rs1 && imm) {
      return [op, rs2, `${imm}(${rs1})`];
    }
    if (rs2 && imm) {
      return [op, rs2, imm];
    }
    return [op].filter(Boolean);
  }

  if (isBranch) {
    if (rs1 && rs2 && imm) {
      return [op, rs1, rs2, imm];
    }
    return [op].filter(Boolean);
  }

  if (op === 'jal') {
    if (rd && imm) {
      return [op, rd, imm];
    }
    return [op].filter(Boolean);
  }
  if (op === 'jalr') {
    if (rd && rs1 && imm) {
      return [op, rd, rs1, imm];
    }
    return [op].filter(Boolean);
  }

  if (op === 'lui' || op === 'auipc') {
    if (rd && imm) {
      return [op, rd, imm];
    }
    return [op].filter(Boolean);
  }

  if (['addi', 'xori', 'ori', 'andi', 'slti', 'sltiu'].includes(op)) {
    if (rd && rs1 && imm) {
      return [op, rd, rs1, imm];
    }
    return [op].filter(Boolean);
  }

  if (['add', 'sub', 'and', 'or', 'xor', 'slt', 'sltu', 'sll', 'srl', 'sra'].includes(op)) {
    if (rd && rs1 && rs2) {
      return [op, rd, rs1, rs2];
    }
    return [op].filter(Boolean);
  }

  return [op, rd, rs1, rs2, imm].filter((x): x is string => !!x);
}