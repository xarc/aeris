import { ConstantsInit, Bit32Limit } from '../../shared/constants';
import { AnalysisError } from '../../shared/errors';
import {
  InstructionSource,
  DataSegment,
  DataEntry,
  DataDirective,
  Directives,
} from '../../shared/types';

import { validateLabelToken } from '../utils/AnalyzerUtils';

export class DataSegmentBuilder {
  private leftoverBytes: number[] = [];
  
  build(lines: InstructionSource[]): DataSegment {
    const entries: DataEntry[] = [];
    let dataMemory = ConstantsInit.DATA_MEM_INIT;
    this.leftoverBytes = [];

    const merged = this.mergeByLabel(lines);
    this.ensureNoDuplicateLabels(merged);

    for (const line of merged) {
      const [label, directive, ...rawValues] = line.raw;
      if (!label) {
        continue;
      }

      validateLabelToken(label);

      const dataDirective = (directive ?? '') as DataDirective;
      if (!Directives.includes(dataDirective as any)) {
        throw new AnalysisError(
          directive?.length ? `"${directive}" is not a valid directive` : `Non-existent directive`,
          line.line,
        );
      }

      if (dataDirective === '.word' && this.leftoverBytes.length > 0) {
        let pad = 0;
        for (let i = 0; i < this.leftoverBytes.length; i++) {
          pad |= this.leftoverBytes[i] << (i * 8);
        }
        entries[entries.length - 1].values.push(pad | 0);
        this.leftoverBytes = [];
        dataMemory += 4;
      }

      const values = this.buildDirectiveValues(dataDirective, rawValues, line.line);

      entries.push({
        label,
        directive: dataDirective,
        values,
        memoryPosition: dataMemory,
      });

      dataMemory += values.length * 4;
    }

    if (this.leftoverBytes.length > 0 && entries.length > 0) {
      let pad = 0;
      for (let i = 0; i < this.leftoverBytes.length; i++) {
        pad |= this.leftoverBytes[i] << (i * 8);
      }
      entries[entries.length - 1].values.push(pad | 0);
      this.leftoverBytes = [];
    }

    return { entries };
  }

  private mergeByLabel(lines: InstructionSource[]): InstructionSource[] {
    const result: InstructionSource[] = [];

    for (const line of lines) {
      const first = line.raw[0];
      const isLabelStart = !!first && first.endsWith(':');

      if (!isLabelStart && result.length > 0) {
        result[result.length - 1].raw.push(...line.raw);
      } else {
        result.push({ ...line, raw: [...line.raw] });
      }
    }

    return result;
  }

  private ensureNoDuplicateLabels(lines: InstructionSource[]) {
    const seen = new Set<string>();
    for (const line of lines) {
      const label = line.raw[0];
      if (!label?.endsWith(':')) {
        continue;
      }

      if (seen.has(label)) {
        const clean = label.slice(0, -1);
        throw new AnalysisError(`label "${clean}" already defined`, line.line);
      }
      seen.add(label);
    }
  }

  private buildDirectiveValues(
    directive: DataDirective,
    rawValues: string[],
    line?: number,
  ): number[] {
    if (directive === '.word') {
      if (rawValues.length === 0) {
        return [];
      }
      for (const v of rawValues) {
        if (!/^-?\d+$/.test(v)) {
          throw new AnalysisError(`"${v}" is not a valid integer number`, line);
        }
      }
      return rawValues.map((v) => this.normalize32(Number(v)));
    }

    if (directive === '.ascii' || directive === '.string') {
      const joined = rawValues.join(' ').trim();
      if (!joined.includes('"')) {
        if (rawValues.length > 0) {
          throw new AnalysisError(`The element does not have a valid character string`, line);
        }
        return [];
      }

      const strings = this.extractQuotedStrings(rawValues, line);

      const concatenated = strings.join('') + '\0';

      return this.convertStringToNumberArray(concatenated);
    }

    throw new AnalysisError(`"${directive}" is not a valid directive`, line);
  }

  private extractQuotedStrings(tokens: string[], line?: number): string[] {
    const out: string[] = [];
    let buffer = '';
    let inQuote = false;

    for (const token of tokens) {
      const hasQuote = token.includes('"');

      if (!inQuote) {
        if (token.startsWith('"') && token.endsWith('"') && token.length >= 2) {
          out.push(token.slice(1, -1));
          continue;
        }

        if (token.startsWith('"') && !token.endsWith('"')) {
          inQuote = true;
          buffer = token.slice(1);
          continue;
        }

        if (!hasQuote) {
          throw new AnalysisError(`"${token}" is not a valid string`, line);
        }
      } else {
        if (token.endsWith('"')) {
          buffer += ' ' + token.slice(0, -1);
          out.push(buffer);
          buffer = '';
          inQuote = false;
        } else {
          buffer += ' ' + token;
        }
      }
    }

    if (inQuote) {
      throw new AnalysisError(`"${buffer.trim()}" is not a valid string`, line);
    }

    return out;
  }

  private convertStringToNumberArray(str: string): number[] {
    const result: number[] = [];

    const bytes: number[] = [
      ...this.leftoverBytes,
      ...Array.from(str).map((c) => c.charCodeAt(0) & 0xff),
    ];

    let i = 0;
    for (; i + 3 < bytes.length; i += 4) {
      const word = bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16) | (bytes[i + 3] << 24);

      result.push(word | 0);
    }

    this.leftoverBytes = bytes.slice(i);

    return result;
  }

  private normalize32(value: number): number {
    const { lowerLimit, upperLimit } = Bit32Limit;
    const range = upperLimit - lowerLimit + 1;

    if (value > upperLimit) {
      return lowerLimit + ((value - upperLimit - 1) % range);
    }

    if (value < lowerLimit) {
      return upperLimit - ((lowerLimit - value - 1) % range);
    }

    return value;
  }
}
