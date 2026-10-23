import { Injectable } from '@angular/core';

const ENABLED_KEY = 'displayLink.enabled';
const ADDRESS_KEY = 'displayLink.address';
const CELL_SIZE_PX = 10;
const FLUSH_INTERVAL_MS = 40;
const REQUEST_TIMEOUT_MS = 2000;
const TEST_SQUARE_PX = 60;

export interface DisplayCell {
  x: number;
  y: number;
  color: string;
}

// Experimental: mirrors the graphic panel onto an ESP32 + ILI9341 over HTTP.
@Injectable({ providedIn: 'root' })
export class DisplayLinkAdapter {
  private enabled = localStorage.getItem(ENABLED_KEY) === 'true';
  private address = localStorage.getItem(ADDRESS_KEY) ?? '';

  private readonly pending = new Map<string, DisplayCell>();
  private flushTimerId: ReturnType<typeof setTimeout> | null = null;
  private requestInFlight = false;

  isEnabled(): boolean {
    return this.enabled && this.address !== '';
  }

  isEnabledSetting(): boolean {
    return this.enabled;
  }

  getAddress(): string {
    return this.address;
  }

  configure(enabled: boolean, address: string): void {
    this.enabled = enabled;
    this.address = address.trim();
    localStorage.setItem(ENABLED_KEY, String(this.enabled));
    localStorage.setItem(ADDRESS_KEY, this.address);

    if (!this.isEnabled()) {
      this.pending.clear();
    }
  }

  enqueue(cells: DisplayCell[]): void {
    if (!this.isEnabled() || cells.length === 0) {
      return;
    }

    for (const cell of cells) {
      this.pending.set(`${cell.x},${cell.y}`, cell);
    }

    this.scheduleFlush();
  }

  async test(address: string): Promise<boolean> {
    const x = (320 - TEST_SQUARE_PX) / 2;
    const y = (180 - TEST_SQUARE_PX) / 2;
    return this.post(address.trim(), `${x} ${y} ${TEST_SQUARE_PX} ${TEST_SQUARE_PX} ${this.toRgb565('#00ff00')}`);
  }

  private scheduleFlush(): void {
    if (this.flushTimerId !== null) {
      return;
    }

    this.flushTimerId = setTimeout(() => {
      this.flushTimerId = null;
      void this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  private async flush(): Promise<void> {
    if (this.requestInFlight) {
      this.scheduleFlush();
      return;
    }

    if (this.pending.size === 0) {
      return;
    }

    const lines: string[] = [];
    for (const cell of this.pending.values()) {
      lines.push(
        `${cell.x * CELL_SIZE_PX} ${cell.y * CELL_SIZE_PX} ${CELL_SIZE_PX} ${CELL_SIZE_PX} ${this.toRgb565(cell.color)}`,
      );
    }
    this.pending.clear();

    this.requestInFlight = true;
    await this.post(this.address, lines.join('\n'));
    this.requestInFlight = false;
  }

  private async post(address: string, body: string): Promise<boolean> {
    try {
      const response = await fetch(`http://${address}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private toRgb565(hexColor: string): number {
    const rgb = parseInt(hexColor.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = rgb & 0xff;

    return ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >> 3);
  }
}
