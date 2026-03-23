import { CodeAnalysis, Instruction, RegFile } from '../../shared/types';
import { resize, decimalToBinary, getBinaryRange } from '../../shared/utils';

export function encodeU(inst: CodeAnalysis['text'][0]) {
  const instruction = new Instruction(inst.operands);
  const { opcode } = instruction.info;

  const rd = resize(decimalToBinary(RegFile[inst.operands[1]].value), 5);
  const imm20 = resize(decimalToBinary(inst.operands[2]), 20);

  return resize(imm20 + rd + opcode, 32);
}
