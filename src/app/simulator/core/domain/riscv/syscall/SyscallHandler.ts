import { CodeAnalysis, DataSegment } from '../../shared/types';
import { Memory } from '../state/Memory';
import { RegisterFile } from '../state/RegisterFile';
import { SyscallCode } from './SyscallCodes';
import { SyscallDomainResult } from './types';

export class SyscallHandler {
  static handle(
    code: number,
    registers: RegisterFile,
    memory: Memory,
    dataEntries: CodeAnalysis['data'],
  ): SyscallDomainResult {
    switch (code) {
      case SyscallCode.PrintInt: {
        const value = registers.read(10); // a0
        return {
          effect: { kind: 'print', text: String(value) },
        };
      }

      case SyscallCode.PrintString: {
        const address = registers.read(10);

        let text = '';
        let offset = 0;
        while (true) {
          const byte = memory.readU8(address + offset);
          if (byte === 0) {
            break;
          }

          text += String.fromCharCode(byte);
          offset++;
        }

        return {
          effect: { kind: 'print', text },
        };
      }

      case SyscallCode.ReadInt:
        return {
          effect: { kind: 'read', type: 'int' },
        };

      case SyscallCode.ReadString: {
        const address = registers.read(10); // a0
        const maxLengthRaw = registers.read(11); // a1

        const DEFAULT_MAX = 256;

        const maxLength =
          typeof maxLengthRaw === 'number' && maxLengthRaw > 0 ? maxLengthRaw : DEFAULT_MAX;

        return {
          effect: {
            kind: 'read',
            type: 'string',
            address,
            maxLength,
          },
        };
      }

      default:
        return {
          effect: { kind: 'none' },
        };
    }
  }
}
