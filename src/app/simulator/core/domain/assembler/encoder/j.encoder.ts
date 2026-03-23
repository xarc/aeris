import { CodeAnalysis, Instruction, RegFile } from '../../shared/types';
import { resize, decimalToBinary, getBinaryRange } from '../../shared/utils';

export function encodeJ(inst: CodeAnalysis['text'][0]) {
  const instruction = new Instruction(inst.operands);
  const rd = resize(decimalToBinary(RegFile[inst.operands[1]].value), 5);
  const imm = resize(decimalToBinary(inst.operands[2]), 21);

  const { opcode } = instruction.info;

  return resize(
    getBinaryRange(20, 20, imm) +
      getBinaryRange(10, 1, imm) +
      getBinaryRange(11, 11, imm) +
      getBinaryRange(19, 12, imm) +
      rd +
      opcode,
    32,
  );
}
