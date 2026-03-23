import { Component } from '@angular/core';

@Component({
  selector: 'app-simulator-page',
  standalone: false,
  templateUrl: './simulator-page.html',
  styleUrl: './simulator-page.scss',
})
export class SimulatorPage {
  constructor() {}

  workspacePct = 65;
  minPct = 30;
  maxPct = 85;

  onVerticalResizerDown(event: PointerEvent) {
    event.preventDefault();

    const startY = event.clientY;
    const startPct = this.workspacePct;
    const container = (event.target as HTMLElement).closest('.vertical-split') as HTMLElement;

    const height = container.getBoundingClientRect().height;

    const move = (e: PointerEvent) => {
      const delta = ((e.clientY - startY) / height) * 100;
      this.workspacePct = Math.min(this.maxPct, Math.max(this.minPct, startPct + delta));
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
}
