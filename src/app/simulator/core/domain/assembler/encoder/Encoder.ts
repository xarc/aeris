import { encodeR } from './r.encoder';
import { encodeI } from './i.encoder';
import { encodeS } from './s.encoder';
import { encodeB } from './b.encoder';
import { encodeU } from './u.encoder';
import { encodeJ } from './j.encoder';
import { CodeAnalysis } from '../../shared/types';

const ECALL_BINARY = '00000000000000000000000001110011';

export function encodeInstruction(inst: CodeAnalysis['text'][0]): string {
  if (inst.opcode === 'ecall') {
    return ECALL_BINARY;
  }
  
  switch (inst.opcode) {
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
      return encodeR(inst);

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
    case 'lw':
    case 'lb':
    case 'lbu':
    case 'lh':
    case 'lhu':
      return encodeI(inst);

    case 'sw':
    case 'sb':
    case 'sh':
      return encodeS(inst);

    case 'beq':
    case 'bne':
    case 'blt':
    case 'bge':
    case 'bltu':
    case 'bgeu':
      return encodeB(inst);

    case 'lui':
    case 'auipc':
      return encodeU(inst);

    case 'jal':
      return encodeJ(inst);

    default:
      throw new Error(`Encoder not implemented for ${inst.opcode}`);
  }
}
