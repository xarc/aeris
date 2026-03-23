import { CodeAnalysis, Instruction, RegFile } from '../../shared/types';
import { resize, decimalToBinary, getBinaryRange } from '../../shared/utils';

export function encodeS(inst: CodeAnalysis['text'][0]) {
  const instruction = new Instruction(inst.operands);
  const [, rs2, mem] = inst.operands;

  const match = mem.match(/^(-?\d+)\((\w+)\)$/)!;
  const imm = resize(decimalToBinary(match[1]), 12);
  const rs1 = resize(decimalToBinary(RegFile[match[2]].value), 5);
  const rs2Bin = resize(decimalToBinary(RegFile[rs2].value), 5);

  const { opcode, funct3 } = instruction.info;

  return resize(
    getBinaryRange(11, 5, imm) + rs2Bin + rs1 + funct3 + getBinaryRange(4, 0, imm) + opcode,
    32,
  );
}
