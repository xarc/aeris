import { CodeAnalysis, Instruction, RegFile } from '../../shared/types';
import { resize, decimalToBinary } from '../../shared/utils';

export function encodeR(inst: CodeAnalysis['text'][0]) {
  const instruction = new Instruction(inst.operands);
  const rd = resize(decimalToBinary(RegFile[inst.operands[1]].value), 5);
  const rs1 = resize(decimalToBinary(RegFile[inst.operands[2]].value), 5);
  const rs2 = resize(decimalToBinary(RegFile[inst.operands[3]].value), 5);

  const { opcode, funct3, funct7 } = instruction.info;
  return resize(funct7 + rs2 + rs1 + funct3 + rd + opcode, 32);
}
