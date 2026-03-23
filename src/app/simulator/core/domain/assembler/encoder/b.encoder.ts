import { CodeAnalysis, Instruction, RegFile } from '../../shared/types';
import { resize, decimalToBinary, getBinaryRange } from '../../shared/utils';

export function encodeB(inst: CodeAnalysis['text'][0]) {
  const instruction = new Instruction(inst.operands);
  const [, rs1Tok, rs2Tok, immTok] = inst.operands;

  const rs1 = resize(decimalToBinary(RegFile[rs1Tok].value), 5);
  const rs2 = resize(decimalToBinary(RegFile[rs2Tok].value), 5);

  const offset = Number(immTok);

  if (offset % 2 !== 0) {
    throw new Error(`Branch offset must be 2-byte aligned. Got: ${offset}`);
  }

  const imm = resize(decimalToBinary(offset), 13);

  const { opcode, funct3 } = instruction.info;

  return resize(
    getBinaryRange(12, 12, imm) +
      getBinaryRange(10, 5, imm) +
      rs2 +
      rs1 +
      funct3 +
      getBinaryRange(4, 1, imm) +
      getBinaryRange(11, 11, imm) +
      opcode,
    32,
  );
}
