export const FRAMEBUFFER_COLUMNS = 32;
export const FRAMEBUFFER_ROWS = 18;
export const FRAMEBUFFER_WORD_COUNT = FRAMEBUFFER_COLUMNS * FRAMEBUFFER_ROWS;

export const FRAMEBUFFER_BASE_ADDRESS = 0xff000000 | 0;

export const DEFAULT_PIXEL_COLOR = '#000000';

export type PixelCoordinate = { x: number; y: number };

export function pixelToAddress(x: number, y: number): number {
  return (FRAMEBUFFER_BASE_ADDRESS + (y * FRAMEBUFFER_COLUMNS + x) * 4) | 0;
}

export function addressToPixel(address: number): PixelCoordinate | null {
  const wordOffset = ((address | 0) - FRAMEBUFFER_BASE_ADDRESS) / 4;

  if (!Number.isInteger(wordOffset) || wordOffset < 0 || wordOffset >= FRAMEBUFFER_WORD_COUNT) {
    return null;
  }

  return {
    x: wordOffset % FRAMEBUFFER_COLUMNS,
    y: Math.floor(wordOffset / FRAMEBUFFER_COLUMNS),
  };
}

export function wordToColor(word: number): string {
  const rgb = (word >>> 0) & 0xffffff;

  if (rgb === 0) {
    return DEFAULT_PIXEL_COLOR;
  }

  return `#${rgb.toString(16).padStart(6, '0')}`;
}

export function buildFramebufferGrid(memory: Record<number, number>): string[][] {
  const grid: string[][] = [];

  for (let y = 0; y < FRAMEBUFFER_ROWS; y++) {
    const row: string[] = [];

    for (let x = 0; x < FRAMEBUFFER_COLUMNS; x++) {
      const word = memory[pixelToAddress(x, y)] ?? 0;
      row.push(wordToColor(word));
    }

    grid.push(row);
  }

  return grid;
}
