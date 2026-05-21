import { PseudoExpander } from './PseudoExpander';
import { SymbolTable } from './SymbolTable';
import { parseMemToken, resolveRegToken, isNumericLike } from '../utils/AnalyzerUtils';
import { AnalysisError } from '../../shared/errors';
import { ConstantsInit, IMM_I_MIN, IMM_I_MAX } from '../../shared/constants';
import { DataSegment, TextSegment, InstructionNode, BasicInstruction } from '../../shared/types';
import { CONTEXTUAL_SET, PSEUDO_SET, INSTRUCTION_SET } from '../parser/InstructionSet';

export class TextSegmentBuilder {
  private readonly pseudoExpander = new PseudoExpander();

  build(lines: any[], data: DataSegment): TextSegment {
    const instructions: InstructionNode[] = [];
    const symbols = new SymbolTable();

    let pc = ConstantsInit.PC;

    for (const line of lines) {
      const raw: string[] = line.raw ?? [];
      if (raw.length === 0) {
        continue;
      }

      if (raw.length === 1 && raw[0].endsWith(':')) {
        symbols.define(raw[0].slice(0, -1), pc);
        continue;
      }

      const basic = this.buildBasic(raw, line.line);

      const baseNode: InstructionNode = {
        source: {
          raw: [...raw],
          line: line.line,
          text: line.text,
        },
        basic,
        isPseudo: false,
        pc,
      };

      const isContextual = !!CONTEXTUAL_SET[basic.opcode];

      const isRealMem =
        basic.rs1 !== undefined && basic.imm !== undefined && !isNaN(parseInt(basic.imm, 10));

      const mustExpand = !!PSEUDO_SET[basic.opcode] || (isContextual && !isRealMem);

      const expanded = mustExpand ? this.pseudoExpander.expand(baseNode, data) : [baseNode];

      for (let index = 0; index < expanded.length; index++) {
        const expandedInstruction = expanded[index];

        instructions.push({
          ...expandedInstruction,
          pc: pc + index * 4,
          basic: { ...expandedInstruction.basic },
          source: {
            ...expandedInstruction.source,
            raw: index === 0 ? [...expandedInstruction.source.raw] : [],
          },
        });
      }

      pc += expanded.length * 4;
    }

    this.resolveLabels(instructions, symbols);

    return {
      instructions,
      symbolTable: new Map(Object.entries(symbols.snapshot())),
    };
  }

  private buildBasic(tokens: string[], line?: number): BasicInstruction {
    const [opcode, ...args] = tokens;
    const spec = INSTRUCTION_SET[opcode] ?? PSEUDO_SET[opcode];
    if (!spec) {
      throw new AnalysisError(`"${opcode}" is not a recognized operator`, line);
    }

    if (spec.operands.length === 0 && args.length > 0) {
      throw new AnalysisError(`"${opcode}" does not take any operands`, line);
    }

    const basic: BasicInstruction = { opcode, args: [...args] };

    spec.operands.forEach((op: string, operandIndex: number) => {
      const value = args[operandIndex];

      if (op === 'rd' || op === 'rs1' || op === 'rs2') {
        (basic as any)[op] = resolveRegToken(value);
        return;
      }

      if (op === 'imm') {
        basic.imm = value;
        return;
      }

      if (op === 'mem') {
        basic.mem = value;
        if (!value) {
          return;
        }

        const parsed = parseMemToken(value);
        if (parsed) {
          basic.imm = parsed.imm;
          basic.rs1 = resolveRegToken(parsed.rs1);
          return;
        }

        if (/^\(\s*\w+\s*\)$/.test(value)) {
          const registerName = value.slice(1, -1).trim();
          const register = resolveRegToken(registerName);

          if (!register) {
            throw new AnalysisError(`Invalid register ${value}`, line);
          }

          basic.rs1 = register;
          basic.imm = '0';
          return;
        }

        if (isNumericLike(value)) {
          const number = parseInt(value, 0);

          if (number >= IMM_I_MIN && number <= IMM_I_MAX) {
            basic.imm = value;
            basic.rs1 = 'x0';
            return;
          }

          basic.imm = value;
          delete (basic as any).rs1;
          return;
        }

        basic.imm = value;

        if (
          (basic.opcode === 'sw' || basic.opcode === 'sb' || basic.opcode === 'sh') &&
          args.length === 3 &&
          operandIndex === 1
        ) {
          const baseReg = args[2];
          basic.rs1 = resolveRegToken(baseReg);
          return;
        }
      }
    });

    if ((opcode === 'jal' || opcode === 'j') && !basic.imm && args[0]) {
      basic.imm = args[0];
    }

    if (opcode === 'jal' && args.length === 1) {
      basic.rd = 'x1';
      basic.imm = args[0];
    }

    return basic;
  }

  private resolveLabels(nodes: InstructionNode[], symbols: SymbolTable) {
    for (const node of nodes) {
      const imm = node.basic.imm;
      if (!imm) {
        continue;
      }

      if (imm.includes('(')) {
        continue;
      }

      if (isNumericLike(imm)) {
        continue;
      }

      const target = symbols.resolve(imm);
      node.basic.imm = String(target - node.pc);
    }
  }
}
