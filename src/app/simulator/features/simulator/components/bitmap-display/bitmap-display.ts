import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { SimulatorStore } from '../../../../core/state/simulator.store/simulator.store';

// 0xFF000000 | 0 = -16777216 (Memory.ts uses address | 0 for signed 32-bit keys)
const FRAMEBUFFER_BASE = 0xff000000 | 0;
const KEYBOARD_ADDR = 0xff010000 | 0;
const WIDTH = 18;
const HEIGHT = 32;

@Component({
  selector: 'app-bitmap-display',
  standalone: false,
  templateUrl: './bitmap-display.html',
  styleUrl: './bitmap-display.scss',
})
export class BitmapDisplay implements OnInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  enabled = false;
  gameModeEnabled = false;

  readonly framebufferAddr = '0xFF000000';
  readonly keyboardAddr = '0xFF010000';

  private sub?: Subscription;
  private keyHandler?: (e: KeyboardEvent) => void;

  constructor(private readonly store: SimulatorStore) {}

  ngOnInit(): void {
    this.sub = this.store.state$.subscribe(() => {
      if (this.enabled) {
        this.render();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.disableGameMode();
  }

  toggleDisplay(): void {
    this.enabled = !this.enabled;
    if (this.enabled) {
      setTimeout(() => this.render());
    } else if (this.gameModeEnabled) {
      this.gameModeEnabled = false;
      this.disableGameMode();
    }
  }

  toggleGameMode(): void {
    this.gameModeEnabled = !this.gameModeEnabled;
    if (this.gameModeEnabled) {
      this.enableGameMode();
    } else {
      this.disableGameMode();
    }
  }

  private enableGameMode(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      e.preventDefault();
      // eslint-disable-next-line deprecation/deprecation
      this.store.writeMemoryWord(KEYBOARD_ADDR, e.keyCode);
    };
    document.addEventListener('keydown', this.keyHandler);
  }

  private disableGameMode(): void {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = undefined;
    }
  }

  private render(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const memory = this.store.getSimulation()?.riscv?.memory ?? {};
    const imageData = ctx.createImageData(WIDTH, HEIGHT);

    for (let i = 0; i < WIDTH * HEIGHT; i++) {
      const addr = (FRAMEBUFFER_BASE + i * 4) | 0;
      const color = (memory[addr] ?? 0) >>> 0;

      const pi = i * 4;
      imageData.data[pi] = (color >>> 16) & 0xff;
      imageData.data[pi + 1] = (color >>> 8) & 0xff;
      imageData.data[pi + 2] = color & 0xff;
      imageData.data[pi + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }
}
