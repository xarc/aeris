import { AnalysisError } from '../../shared/errors';
import { SimulatorStateObject, CodeAnalysis, InstructionSource } from '../../shared/types';
import { DataSegmentBuilder } from '../data/DataSegmentBuilder';
import { Parser } from '../parser/Parser';
import { TextSegmentBuilder } from '../text/TextSegmentBuilder';
import { formatOperands } from '../utils/AnalyzerUtils';

export class CodeAnalyzer {
  private parser = new Parser();
  private dataBuilder = new DataSegmentBuilder();
  private textBuilder = new TextSegmentBuilder();

  analyze(source: string): SimulatorStateObject {
    const parsed = this.parser.parse(source);

    const { dataLines, textLines } = this.splitSegments(parsed);

    const data = this.dataBuilder.build(dataLines);
    const text = this.textBuilder.build(textLines, data);

    const analysis: CodeAnalysis = {
      data: data.entries.map((entry) => ({
        label: entry.label,
        directive: entry.directive,
        values: entry.values,
        address: entry.memoryPosition,
      })),

      text: text.instructions.map((instruction) => ({
        address: instruction.pc,
        opcode: instruction.basic.opcode,
        operands: formatOperands(instruction.basic.opcode, [
          instruction.basic.rd,
          instruction.basic.rs1,
          instruction.basic.rs2,
          instruction.basic.imm,
        ]),
        raw: instruction.source.raw,
        isPseudo: instruction.isPseudo,
        line: instruction.source.line,
      })),

      symbols: Object.fromEntries(text.symbolTable),
    };

    return { source, analysis };
  }

  analyzeSafe(
    source: string,
  ):
    | { error: false; state: SimulatorStateObject }
    | { error: true; message: string; line?: number } {
    try {
      return { error: false, state: this.analyze(source) };
    } catch (error: any) {
      if (error instanceof AnalysisError) {
        return { error: true, message: error.message, line: error.line };
      }
      return { error: true, message: error?.message ?? String(error) };
    }
  }

  private splitSegments(parsed: InstructionSource[]): {
    dataLines: InstructionSource[];
    textLines: InstructionSource[];
  } {
    const dataLines: InstructionSource[] = [];
    const textLines: InstructionSource[] = [];

    let mode: 'data' | 'text' | null = null;

    const hasData = parsed.some((line) => line.raw?.[0] === '.data');
    const hasText = parsed.some((line) => line.raw?.[0] === '.text');

    if (!hasData && !hasText) {
      return { dataLines: [], textLines: parsed };
    }

    for (const line of parsed) {
      const token = line.raw?.[0];

      if (token === '.data') {
        mode = 'data';
        continue;
      }

      if (token === '.text') {
        mode = 'text';
        continue;
      }

      if (mode === 'data') {
        dataLines.push(line);
      } else if (mode === 'text') {
        textLines.push(line);
      }
    }

    return { dataLines, textLines };
  }
}
