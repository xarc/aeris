import { CodeAnalysis, Instruction, RegFile } from '../../shared/types';
import { resize, decimalToBinary, getBinaryRange } from '../../shared/utils';

export function encodeI(inst: CodeAnalysis['text'][0]) {
  const instruction = new Instruction(inst.operands);
  const [, rdTok, op2, op3] = inst.operands;

  const opcode = instruction.info.opcode;
  const funct3 = instruction.info.funct3;
  const funct7 = instruction.info.funct7 ?? '0000000';

  let rs1Tok: string;
  let immTok: string;

  if (typeof op2 === 'string' && op2.includes('(')) {
    const match = op2.match(/^(-?\d+)?\((x\d+)\)$/);
    if (!match) {
      throw new Error(`Invalid memory operand: ${op2}`);
    }

    immTok = match[1] ?? '0';
    rs1Tok = match[2];
  } else {
    rs1Tok = op2!;
    immTok = op3!;
  }

  const rd = resize(decimalToBinary(RegFile[rdTok].value), 5);
  const rs1 = resize(decimalToBinary(RegFile[rs1Tok].value), 5);

  if (['slli', 'srli', 'srai'].includes(inst.opcode)) {
    const shamt = resize(decimalToBinary(immTok), 5);
    const f7 = resize(funct7, 7);

    return resize(f7 + shamt + rs1 + funct3 + rd + opcode, 32);
  }

  const imm = resize(decimalToBinary(immTok), 12);

  return resize(getBinaryRange(11, 0, imm) + rs1 + funct3 + rd + opcode, 32);
}
