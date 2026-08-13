import { Component, Input } from '@angular/core';

const GRID_COLUMNS = 32;
const GRID_ROWS = 18;

/**
 * Static, view-only pixel matrix. Not wired to memory yet — `pixels` is
 * already shaped like a future framebuffer read so the memory-mapped I/O
 * step can plug in without touching this component's template.
 */
@Component({
  selector: 'app-graphic-panel',
  standalone: false,
  templateUrl: './graphic-panel.html',
  styleUrl: './graphic-panel.scss',
})
export class GraphicPanelComponent {
  @Input() pixels: string[][] | null = null;

  readonly columns = Array.from({ length: GRID_COLUMNS }, (_, index) => index);
  readonly rows = Array.from({ length: GRID_ROWS }, (_, index) => index);

  getCellColor(row: number, column: number): string {
    return this.pixels?.[row]?.[column] ?? 'transparent';
  }
}
