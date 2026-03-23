import { toUint32 } from '../../shared/utils';

export type AluOperation =
  | 'ADD'
  | 'SUB'
  | 'AND'
  | 'OR'
  | 'XOR'
  | 'SLL'
  | 'SRL'
  | 'SRA'
  | 'SLT'
  | 'SLTU';

export class ALU {
  exec(op: AluOperation, a: number, b: number): number {
    a |= 0;
    b |= 0;
    switch (op) {
      case 'ADD':
        return (a + b) | 0;
      case 'SUB':
        return (a - b) | 0;
      case 'AND':
        return (a & b) | 0;
      case 'OR':
        return a | b | 0;
      case 'XOR':
        return (a ^ b) | 0;
      case 'SLL':
        return (a << (b & 31)) | 0;
      case 'SRL':
        return (a >>> (b & 31)) | 0;
      case 'SRA':
        return (a >> (b & 31)) | 0;
      case 'SLT':
        return a < b ? 1 : 0;
      case 'SLTU':
        return toUint32(a) < toUint32(b) ? 1 : 0;
    }
  }
}
