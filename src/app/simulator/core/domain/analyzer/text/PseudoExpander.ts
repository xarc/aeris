import { IMM_I_MIN, IMM_I_MAX, AUIPC_CONST, WORD_SHIFT } from '../../shared/constants';
import { AnalysisError } from '../../shared/errors';
import { InstructionNode, DataSegment } from '../../shared/types';

import { cleanDataLabel, isNumericLike } from '../utils/AnalyzerUtils';

type PseudoHandler = (n: InstructionNode, data: DataSegment) => InstructionNode[];

export class PseudoExpander {
  private readonly table: Record<string, PseudoHandler> = {
    nop: (instruction) => [
      this.make(instruction, { opcode: 'addi', rd: 'x0', rs1: 'x0', imm: '0' }),
    ],
    mv: (instruction) => [
      this.make(instruction, {
        opcode: 'add',
        rd: instruction.basic.rd,
        rs1: 'x0',
        rs2: instruction.basic.rs1,
      }),
    ],
    not: (instruction) => [
      this.make(instruction, {
        opcode: 'xori',
        rd: instruction.basic.rd,
        rs1: instruction.basic.rs1,
        imm: '-1',
      }),
    ],

    j: (instruction) => [
      this.make(instruction, { opcode: 'jal', rd: 'x0', imm: instruction.basic.imm }),
    ],
    jr: (instruction) => [
      this.make(instruction, {
        opcode: 'jalr',
        rd: 'x0',
        rs1: instruction.basic.rs1,
        imm: instruction.basic.imm ?? '0',
      }),
    ],

    li: (instruction) => {
      const imm = parseInt(instruction.basic.imm ?? '', 0);
      if (!Number.isFinite(imm)) {
        throw new AnalysisError(`Invalid immediate in li`, instruction.source.line);
      }

      if (imm >= IMM_I_MIN && imm <= IMM_I_MAX) {
        return [
          this.make(instruction, {
            opcode: 'addi',
            rd: instruction.basic.rd,
            rs1: 'x0',
            imm: String(imm),
          }),
        ];
      }

      const upper = (imm + 0x800) >> 12;
      const lower = imm - (upper << 12);

      return [
        this.make(instruction, { opcode: 'lui', rd: instruction.basic.rd, imm: String(upper) }),
        this.make(instruction, {
          opcode: 'addi',
          rd: instruction.basic.rd,
          rs1: instruction.basic.rd,
          imm: String(lower),
        }),
      ];
    },
    la: (instruction, data) => {
      const label = instruction.basic.imm;
      const entry = data.entries.find((e) => cleanDataLabel(e.label) === label);

      if (!entry) {
        throw new AnalysisError(`label "${label}" not found`, instruction.source.line);
      }

      let target = entry.memoryPosition;

      if (
        (entry.directive === '.string' || entry.directive === '.ascii') &&
        entry.values.length > 0
      ) {
        const firstWord = entry.values[0] >>> 0;

        const b0 = firstWord & 0xff;
        const b1 = (firstWord >> 8) & 0xff;

        if (b0 === 0 && b1 !== 0) {
          target += 1;
        }
      }

      const upper = AUIPC_CONST;
      const lower = target - (instruction.pc + (upper << 12));

      return [
        this.make(instruction, {
          opcode: 'auipc',
          rd: instruction.basic.rd,
          imm: String(upper),
        }),
        this.make(instruction, {
          opcode: 'addi',
          rd: instruction.basic.rd,
          rs1: instruction.basic.rd,
          imm: String(lower),
        }),
      ];
    },
    lb: (instruction, data) => this.expandLoad(instruction, data, 'lb'),
    lbu: (instruction, data) => this.expandLoad(instruction, data, 'lbu'),
    lh: (instruction, data) => this.expandLoad(instruction, data, 'lh'),
    lhu: (instruction, data) => this.expandLoad(instruction, data, 'lhu'),
    lw: (instruction, data) => this.expandLoad(instruction, data, 'lw'),

    sb: (instruction, data) => this.expandStore(instruction, data, 'sb'),
    sh: (instruction, data) => this.expandStore(instruction, data, 'sh'),
    sw: (instruction, data) => this.expandStore(instruction, data, 'sw'),

    beqz: (instruction) => [
      this.make(instruction, {
        opcode: 'beq',
        rs1: instruction.basic.rs1,
        rs2: 'x0',
        imm: instruction.basic.imm,
      }),
    ],
    bnez: (instruction) => [
      this.make(instruction, {
        opcode: 'bne',
        rs1: instruction.basic.rs1,
        rs2: 'x0',
        imm: instruction.basic.imm,
      }),
    ],
    bgez: (instruction) => [
      this.make(instruction, {
        opcode: 'bge',
        rs1: instruction.basic.rs1,
        rs2: 'x0',
        imm: instruction.basic.imm,
      }),
    ],
    bltz: (instruction) => [
      this.make(instruction, {
        opcode: 'blt',
        rs1: instruction.basic.rs1,
        rs2: 'x0',
        imm: instruction.basic.imm,
      }),
    ],

    bgt: (instruction) => [
      this.make(instruction, {
        opcode: 'blt',
        rs1: instruction.basic.rs2,
        rs2: instruction.basic.rs1,
        imm: instruction.basic.imm,
      }),
    ],
    bgtu: (instruction) => [
      this.make(instruction, {
        opcode: 'bltu',
        rs1: instruction.basic.rs2,
        rs2: instruction.basic.rs1,
        imm: instruction.basic.imm,
      }),
    ],
    bgtz: (instruction) => [
      this.make(instruction, {
        opcode: 'blt',
        rs1: 'x0',
        rs2: instruction.basic.rs1,
        imm: instruction.basic.imm,
      }),
    ],
    ble: (instruction) => [
      this.make(instruction, {
        opcode: 'bge',
        rs1: instruction.basic.rs2,
        rs2: instruction.basic.rs1,
        imm: instruction.basic.imm,
      }),
    ],

    bleu: (instruction) => [
      this.make(instruction, {
        opcode: 'bgeu',
        rs1: instruction.basic.rs2,
        rs2: instruction.basic.rs1,
        imm: instruction.basic.imm,
      }),
    ],

    blez: (instruction) => [
      this.make(instruction, {
        opcode: 'bge',
        rs1: 'x0',
        rs2: instruction.basic.rs1,
        imm: instruction.basic.imm,
      }),
    ],

    seqz: (instruction) => [
      this.make(instruction, {
        opcode: 'sltiu',
        rd: instruction.basic.rd,
        rs1: instruction.basic.rs1,
        imm: '1',
      }),
    ],
    snez: (instruction) => [
      this.make(instruction, {
        opcode: 'sltu',
        rd: instruction.basic.rd,
        rs1: 'x0',
        rs2: instruction.basic.rs1,
      }),
    ],
    sgt: (instruction) => [
      this.make(instruction, {
        opcode: 'slt',
        rd: instruction.basic.rd,
        rs1: instruction.basic.rs2,
        rs2: instruction.basic.rs1,
      }),
    ],
    sgtu: (instruction) => [
      this.make(instruction, {
        opcode: 'sltu',
        rd: instruction.basic.rd,
        rs1: instruction.basic.rs2,
        rs2: instruction.basic.rs1,
      }),
    ],
    sgtz: (instruction) => [
      this.make(instruction, {
        opcode: 'slt',
        rd: instruction.basic.rd,
        rs1: 'x0',
        rs2: instruction.basic.rs1,
      }),
    ],
    sltz: (instruction) => [
      this.make(instruction, {
        opcode: 'slt',
        rd: instruction.basic.rd,
        rs1: instruction.basic.rs1,
        rs2: 'x0',
      }),
    ],
  };

  expand(node: InstructionNode, data: DataSegment): InstructionNode[] {
    const pseudoInstruction = this.table[node.basic.opcode];
    return pseudoInstruction ? pseudoInstruction(node, data) : [node];
  }

  private expandLoad(instruction: InstructionNode, data: DataSegment, opcode: string) {
    const { rd, rs1, imm } = instruction.basic;

    if (rs1 && imm && isNumericLike(imm)) {
      return [instruction];
    }

    if (!rd || !imm) {
      return [instruction];
    }

    if (!isNumericLike(imm)) {
      const entry = data.entries.find((e) => cleanDataLabel(e.label) === imm);
      if (!entry) {
        throw new AnalysisError(`label "${imm}" not found`, instruction.source.line);
      }

      const upper = AUIPC_CONST;
      const lower = entry.memoryPosition - (instruction.pc + (upper << 12));

      return [
        this.make(instruction, { opcode: 'auipc', rd, imm: String(upper) }),
        this.make(instruction, { opcode, rd, rs1: rd, imm: String(lower) }),
      ];
    }

    const number = parseInt(imm, 0);

    if (number >= IMM_I_MIN && number <= IMM_I_MAX) {
      return [this.make(instruction, { opcode, rd, rs1: rd, imm: String(number) })];
    }

    const upper = Math.round(number / WORD_SHIFT);
    const lower = number - upper * WORD_SHIFT;

    return [
      this.make(instruction, { opcode: 'lui', rd, imm: String(upper) }, false),
      this.make(instruction, { opcode, rd, rs1: rd, imm: String(lower) }, false),
    ];
  }

  private expandStore(n: InstructionNode, data: DataSegment, opcode: string): InstructionNode[] {
    const { rs2, rs1, imm } = n.basic;

    if (!rs2 || !imm) {
      return [n];
    }
    if (rs1 && isNumericLike(imm)) {
      const number = parseInt(imm, 0);
      if (number >= IMM_I_MIN && number <= IMM_I_MAX) {
        return [
          {
            ...n,
            isPseudo: false,
          },
        ];
      }
    }

    if (imm.includes('(')) {
      return [n];
    }

    const base = rs1 ?? 'x0';

    if (!isNumericLike(imm)) {
      const entry = data.entries.find((e) => cleanDataLabel(e.label) === imm);
      if (!entry) {
        throw new AnalysisError(`label "${imm}" not found`, n.source.line);
      }

      const upper = AUIPC_CONST;
      const lower = entry.memoryPosition - (n.pc + (upper << 12));

      return [
        this.make(n, { opcode: 'auipc', rd: base, imm: String(upper) }),
        this.make(n, { opcode, rs2, rs1: base, imm: String(lower) }),
      ];
    }

    const number = parseInt(imm, 0);
    const upper = (number + 0x800) >> 12;
    const lower = number - (upper << 12);

    return [
      this.make(n, { opcode: 'lui', rd: base, imm: String(upper) }),
      this.make(n, { opcode, rs2, rs1: base, imm: String(lower) }),
    ];
  }

  private make(base: InstructionNode, basic: any, isPseudo = true): InstructionNode {
    return {
      ...base,
      basic,
      isPseudo,
    };
  }
}
