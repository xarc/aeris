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

      const isRealMemoryForm =
        basic.rs1 !== undefined &&
        basic.imm !== undefined &&
        !isNaN(parseInt(basic.imm, 10)) &&
        !(basic as any).isPseudoMemoryForm;

      const mustExpand =
        !!PSEUDO_SET[basic.opcode] ||
        (isContextual && !isRealMemoryForm) ||
        !!(basic as any).isPseudoShortForm;

      const expanded = mustExpand ? this.pseudoExpander.expand(baseNode, data) : [baseNode];

      if (mustExpand) {
        for (const node of expanded) {
          node.isPseudo = true;
        }
      }

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

    this.validateArgCount(opcode, args, spec, line);

    const basic: BasicInstruction = { opcode, args: [...args] };

    const shortForm = this.tryBuildShortForm(opcode, args, basic);
    if (shortForm) {
      return basic;
    }

    const isStore = spec.operands[0] === 'rs2';

    spec.operands.forEach((operandType: string, operandIndex: number) => {
      this.applyOperand(operandType, operandIndex, args, basic, isStore, spec, line);
    });

    if ((opcode === 'jal' || opcode === 'j') && !basic.imm && args[0]) {
      basic.imm = args[0];
    }

    return basic;
  }

  private validateArgCount(
    opcode: string,
    args: string[],
    spec: { operands: string[] },
    line?: number,
  ): void {
    if (spec.operands.length === 0 && args.length > 0) {
      throw new AnalysisError(`"${opcode}" does not take any operands`, line);
    }

    const isStore = spec.operands[0] === 'rs2';
    const maximumArguments = isStore ? spec.operands.length + 1 : spec.operands.length;

    if (spec.operands.length > 0 && args.length > maximumArguments) {
      throw new AnalysisError(
        `"${opcode}" takes ${spec.operands.length} operand(s) but ${args.length} were provided`,
        line,
      );
    }
  }

  private tryBuildShortForm(opcode: string, args: string[], basic: BasicInstruction): boolean {
    if (opcode === 'jal' && args.length === 1) {
      basic.rd = 'x1';
      basic.imm = args[0];
      (basic as any).isPseudoShortForm = true;
      return true;
    }

    if (opcode === 'jalr' && args.length === 1) {
      basic.rd = 'x1';
      basic.rs1 = resolveRegToken(args[0]);
      basic.imm = '0';
      (basic as any).isPseudoShortForm = true;
      return true;
    }

    if (opcode === 'jalr' && args.length === 2) {
      const parsed = parseMemToken(args[1]);
      if (parsed) {
        basic.rd = resolveRegToken(args[0]);
        basic.rs1 = resolveRegToken(parsed.rs1);
        basic.imm = parsed.imm;
      } else {
        basic.rd = 'x1';
        basic.rs1 = resolveRegToken(args[0]);
        basic.imm = args[1];
      }
      (basic as any).isPseudoShortForm = true;
      return true;
    }

    return false;
  }

  private applyOperand(
    operandType: string,
    operandIndex: number,
    args: string[],
    basic: BasicInstruction,
    isStore: boolean,
    spec: { operands: string[] },
    line?: number,
  ): void {
    const value = args[operandIndex];

    if (operandType === 'rd' || operandType === 'rs1' || operandType === 'rs2') {
      (basic as any)[operandType] = resolveRegToken(value);
      return;
    }

    if (operandType === 'imm') {
      basic.imm = value;
      return;
    }

    if (operandType === 'mem') {
      this.applyMemOperand(value, operandIndex, args, basic, isStore, spec, line);
    }
  }

  private applyMemOperand(
    value: string,
    operandIndex: number,
    args: string[],
    basic: BasicInstruction,
    isStore: boolean,
    spec: { operands: string[] },
    line?: number,
  ): void {
    basic.mem = value;

    if (!value) {
      return;
    }

    const parsed = parseMemToken(value);
    if (parsed) {
      basic.imm = parsed.imm;
      basic.rs1 = resolveRegToken(parsed.rs1);
      if (!/^-?\d/.test(value)) {
        (basic as any).isPseudoMemoryForm = true;
      }
      return;
    }

    (basic as any).isPseudoMemoryForm = true;

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
      isStore &&
      args.length === spec.operands.length + 1 &&
      operandIndex === spec.operands.length - 1
    ) {
      basic.rs1 = resolveRegToken(args[spec.operands.length]);
    }
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
