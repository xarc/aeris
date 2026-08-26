import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { SimulatorFacade } from '../../../../core/state/simulator.facade/simulator.facade';
import { SimulatorStore } from '../../../../core/state/simulator.store/simulator.store';

const FRAMEBUFFER_COLUMNS = 32;
const FRAMEBUFFER_ROWS = 18;
const FRAMEBUFFER_BASE_ADDRESS = 0xff000000 | 0;
const DEFAULT_PIXEL_COLOR = '#000000';
const HELD_KEY_WRITE_INTERVAL_MS = 50;

@Component({
  selector: 'app-graphic-panel',
  standalone: false,
  templateUrl: './graphic-panel.html',
  styleUrl: './graphic-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphicPanelComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('panelBody') private readonly panelBodyRef!: ElementRef<HTMLElement>;

  readonly columns = Array.from({ length: FRAMEBUFFER_COLUMNS }, (_, index) => index);
  readonly rows = Array.from({ length: FRAMEBUFFER_ROWS }, (_, index) => index);

  interactiveMode = false;

  private pixels: string[][] = this.buildFramebufferGrid({});
  private readonly heldKeyCodes: number[] = [];
  private heldKeyIntervalId: ReturnType<typeof setInterval> | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly store: SimulatorStore,
    private readonly facade: SimulatorFacade,
    private readonly changeDetectorRef: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.store.state$.pipe(takeUntil(this.destroy$)).subscribe((state) => {
      const memory = state.simulation?.riscv?.memory ?? {};
      this.pixels = this.buildFramebufferGrid(memory);
      this.changeDetectorRef.markForCheck();
    });
  }

  ngAfterViewInit(): void {
    this.facade.interactiveMode$.pipe(takeUntil(this.destroy$)).subscribe((isOn) => {
      const wasOn = this.interactiveMode;
      this.interactiveMode = isOn;
      this.changeDetectorRef.markForCheck();

      if (isOn && !wasOn) {
        this.panelBodyRef.nativeElement.focus();
      } else if (!isOn && wasOn) {
        this.releaseHeldKeys();
        this.panelBodyRef.nativeElement.blur();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopHeldKeyInterval();
  }

  getCellColor(row: number, column: number): string {
    return this.pixels[row]?.[column] ?? DEFAULT_PIXEL_COLOR;
  }

  toggleInteractiveMode(): void {
    this.facade.toggleInteractiveMode();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (!this.interactiveMode || event.repeat) {
      return;
    }

    event.preventDefault();

    const code = event.keyCode;
    this.markKeyHeld(code);
    this.facade.writeKeyboardRegister(code);
    this.ensureHeldKeyInterval();
  }

  onKeyUp(event: KeyboardEvent): void {
    this.markKeyReleased(event.keyCode);
  }

  onPanelBlur(): void {
    this.releaseHeldKeys();
  }

  private releaseHeldKeys(): void {
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

  private pixelToAddress(x: number, y: number): number {
    return (FRAMEBUFFER_BASE_ADDRESS + (y * FRAMEBUFFER_COLUMNS + x) * 4) | 0;
  }

  private wordToColor(word: number): string {
    const rgb = (word >>> 0) & 0xffffff;

    if (rgb === 0) {
      return DEFAULT_PIXEL_COLOR;
    }

    return `#${rgb.toString(16).padStart(6, '0')}`;
  }

  private buildFramebufferGrid(memory: Record<number, number>): string[][] {
    const grid: string[][] = [];

    for (let y = 0; y < FRAMEBUFFER_ROWS; y++) {
      const row: string[] = [];

      for (let x = 0; x < FRAMEBUFFER_COLUMNS; x++) {
        const word = memory[this.pixelToAddress(x, y)] ?? 0;
        row.push(this.wordToColor(word));
      }

      grid.push(row);
    }

    return grid;
  }
}
