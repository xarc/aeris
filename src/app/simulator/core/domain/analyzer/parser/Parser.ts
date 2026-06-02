import { InstructionSource } from '../../shared/types';

export class Parser {
  parse(source: string): InstructionSource[] {
    const lines = source.split('\n');
    const instructionSource: InstructionSource[] = [];

    for (let index = 0; index < lines.length; index++) {
      const original = lines[index];
      const lineNo = index + 1;

      const noComments = this.stripComments(original);
      const trimmed = noComments.trim();
      if (!trimmed) {
        continue;
      }

      const tokens = this.tokenize(trimmed);
      if (tokens.length === 0) {
        continue;
      }

      if ((tokens[0] === '.data' || tokens[0] === '.text') && tokens.length > 1) {
        instructionSource.push({
          raw: [tokens[0]],
          line: lineNo,
          text: tokens[0],
        });

        instructionSource.push({
          raw: tokens.slice(1),
          line: lineNo,
          text: tokens.slice(1).join(' '),
        });
        continue;
      }

      if (tokens[0].endsWith(':') && tokens.length > 1) {
        instructionSource.push({
          raw: [tokens[0]],
          line: lineNo,
          text: tokens[0],
        });

        instructionSource.push({
          raw: tokens.slice(1),
          line: lineNo,
          text: tokens.slice(1).join(' '),
        });
        continue;
      }

      if (tokens[0].includes(':') && !tokens[0].endsWith(':')) {
        const index = tokens[0].indexOf(':');

        const label = tokens[0].slice(0, index + 1);
        const rawFirst = tokens[0].slice(index + 1);
        const raw = [rawFirst, ...tokens.slice(1)].filter(Boolean);

        instructionSource.push({
          raw: [label],
          line: lineNo,
          text: label,
        });

        if (raw.length) {
          instructionSource.push({
            raw: raw,
            line: lineNo,
            text: raw.join(' '),
          });
        }

        continue;
      }

      instructionSource.push({
        raw: tokens,
        line: lineNo,
        text: tokens.join(' '),
      });
    }

    return instructionSource;
  }

  private stripComments(line: string): string {
    let inQuote = false;
    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      if (char === '"') {
        inQuote = !inQuote;
      }
      if (!inQuote && char === '#') {
        return line.slice(0, index);
      }
    }
    return line;
  }

  private tokenize(line: string): string[] {
    const spaceIndex = line.search(/\s/);
    if (spaceIndex === -1) {
      return [line];
    }

    const opcode = line.slice(0, spaceIndex);
    const rest = line.slice(spaceIndex + 1).trim();

    if (!rest) {
      return [opcode];
    }

    if (opcode.endsWith(':')) {
      return [opcode, ...this.tokenize(rest)];
    }

    if (opcode.startsWith('.') || opcode.endsWith(',')) {
      return this.tokenizeDirective(line);
    }

    const operands = rest
      .split(',')
      .map((operand) => operand.trim())
      .filter((operand) => operand !== '');

    return [opcode, ...operands];
  }

  private tokenizeDirective(rest: string): string[] {
    const regex = /"[^"]*"|[^\s,]+/g;
    const matches = rest.match(regex) ?? [];
    const parts: string[] = [];
    for (const match of matches) {
      if (!match.startsWith('"')) {
        parts.push(...match.split(',').filter((part) => part.trim() !== ''));
      } else {
        parts.push(match);
      }
    }
    return parts;
  }
}
