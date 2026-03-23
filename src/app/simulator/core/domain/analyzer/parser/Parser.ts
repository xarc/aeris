import { InstructionSource } from '../../shared/types';

export class Parser {
  parse(source: string): InstructionSource[] {
    const lines = source.split('\n');
    const instructionSource: InstructionSource[] = [];

    for (let i = 0; i < lines.length; i++) {
      const original = lines[i];
      const lineNo = i + 1;

      const noComments = this.stripComments(original);
      const trimmed = noComments.trim();
      if (!trimmed) continue;

      const tokens = this.tokenize(trimmed);
      if (tokens.length === 0) continue;

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
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuote = !inQuote;
      }
      if (!inQuote && c === '#') {
        return line.slice(0, i);
      }
    }
    return line;
  }

  private tokenize(line: string): string[] {
    const tokens: string[] = [];

    const regex = /"[^"]*"|[^\s,]+/g;
    const matches = line.match(regex) ?? [];

    for (const match of matches) {
      if (!match.startsWith('"')) {
        const parts = match.split(',').filter((x) => x.trim() !== '');
        tokens.push(...parts);
      } else {
        tokens.push(match);
      }
    }

    return tokens;
  }
}
