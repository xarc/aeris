import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { SimulatorStore } from '../../../../core/state/simulator.store/simulator.store';
import {
  buildFramebufferGrid,
  DEFAULT_PIXEL_COLOR,
  FRAMEBUFFER_COLUMNS,
  FRAMEBUFFER_ROWS,
} from './framebuffer.util';

@Component({
  selector: 'app-graphic-panel',
  standalone: false,
  templateUrl: './graphic-panel.html',
  styleUrl: './graphic-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphicPanelComponent {
  readonly columns = Array.from({ length: FRAMEBUFFER_COLUMNS }, (_, index) => index);
  readonly rows = Array.from({ length: FRAMEBUFFER_ROWS }, (_, index) => index);

  private pixels: string[][] = buildFramebufferGrid({});

  constructor(
    private readonly store: SimulatorStore,
    private readonly changeDetectorRef: ChangeDetectorRef,
  ) {
    this.store.state$.subscribe((state) => {
      const memory = state.simulation?.riscv?.memory ?? {};
      this.pixels = buildFramebufferGrid(memory);
      this.changeDetectorRef.markForCheck();
    });
  }

  getCellColor(row: number, column: number): string {
    return this.pixels[row]?.[column] ?? DEFAULT_PIXEL_COLOR;
  }
}
