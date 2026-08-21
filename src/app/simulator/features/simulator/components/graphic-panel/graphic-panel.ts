import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { SimulatorFacade } from '../../../../core/state/simulator.facade/simulator.facade';
import { SimulatorStore } from '../../../../core/state/simulator.store/simulator.store';
import {
  buildFramebufferGrid,
  DEFAULT_PIXEL_COLOR,
  FRAMEBUFFER_COLUMNS,
  FRAMEBUFFER_ROWS,
} from './framebuffer.util';
import { keyEventToCode } from './keyboard.util';

const HELD_KEY_WRITE_INTERVAL_MS = 50;

@Component({
  selector: 'app-graphic-panel',
  standalone: false,
  templateUrl: './graphic-panel.html',
  styleUrl: './graphic-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphicPanelComponent implements OnDestroy {
  readonly columns = Array.from({ length: FRAMEBUFFER_COLUMNS }, (_, index) => index);
  readonly rows = Array.from({ length: FRAMEBUFFER_ROWS }, (_, index) => index);

  interactiveMode = false;

  private pixels: string[][] = buildFramebufferGrid({});
  private keydownListener: ((event: KeyboardEvent) => void) | null = null;
  private keyupListener: ((event: KeyboardEvent) => void) | null = null;
  private readonly heldKeyCodes: number[] = [];
  private heldKeyIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly store: SimulatorStore,
    private readonly facade: SimulatorFacade,
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

  toggleInteractiveMode(): void {
    this.interactiveMode = !this.interactiveMode;

    if (this.interactiveMode) {
      this.attachKeyListeners();
    } else {
      this.detachKeyListeners();
    }
  }

  ngOnDestroy(): void {
    this.detachKeyListeners();
  }

  private attachKeyListeners(): void {
    this.keydownListener = (event) => {
      if (event.repeat) {
        return;
      }

      const code = keyEventToCode(event);
      this.markKeyHeld(code);
      this.facade.writeKeyboardRegister(code);
      this.ensureHeldKeyInterval();
    };

    this.keyupListener = (event) => {
      this.markKeyReleased(keyEventToCode(event));
    };

    window.addEventListener('keydown', this.keydownListener);
    window.addEventListener('keyup', this.keyupListener);
  }

  private detachKeyListeners(): void {
    if (this.keydownListener) {
      window.removeEventListener('keydown', this.keydownListener);
      this.keydownListener = null;
    }

    if (this.keyupListener) {
      window.removeEventListener('keyup', this.keyupListener);
      this.keyupListener = null;
    }

    this.heldKeyCodes.length = 0;
    this.stopHeldKeyInterval();
  }

  private markKeyHeld(code: number): void {
    const existingIndex = this.heldKeyCodes.indexOf(code);
    if (existingIndex !== -1) {
      this.heldKeyCodes.splice(existingIndex, 1);
    }

    this.heldKeyCodes.push(code);
  }

  private markKeyReleased(code: number): void {
    const existingIndex = this.heldKeyCodes.indexOf(code);
    if (existingIndex !== -1) {
      this.heldKeyCodes.splice(existingIndex, 1);
    }

    if (this.heldKeyCodes.length === 0) {
      this.stopHeldKeyInterval();
    }
  }

  private ensureHeldKeyInterval(): void {
    if (this.heldKeyIntervalId !== null) {
      return;
    }

    this.heldKeyIntervalId = setInterval(() => {
      const mostRecentHeldCode = this.heldKeyCodes[this.heldKeyCodes.length - 1];
      if (mostRecentHeldCode !== undefined) {
        this.facade.writeKeyboardRegister(mostRecentHeldCode);
      }
    }, HELD_KEY_WRITE_INTERVAL_MS);
  }

  private stopHeldKeyInterval(): void {
    if (this.heldKeyIntervalId === null) {
      return;
    }

    clearInterval(this.heldKeyIntervalId);
    this.heldKeyIntervalId = null;
  }
}
