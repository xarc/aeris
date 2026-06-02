import { Component } from '@angular/core';
import { SimulatorFacade } from '../../../../core/state/simulator.facade/simulator.facade';

@Component({
  selector: 'app-simulator-page',
  standalone: false,
  templateUrl: './simulator-page.html',
  styleUrl: './simulator-page.scss',
})
export class SimulatorPage {
  constructor(readonly facade: SimulatorFacade) {}

  workspaceHeightPercent = 65;
  minimumWorkspacePercent = 30;
  maximumWorkspacePercent = 85;

  onVerticalResizerDown(event: PointerEvent) {
    event.preventDefault();

    const startY = event.clientY;
    const startPct = this.workspaceHeightPercent;
    const container = (event.target as HTMLElement).closest('.vertical-split') as HTMLElement;

    const height = container.getBoundingClientRect().height;

    const move = (e: PointerEvent) => {
      const delta = ((e.clientY - startY) / height) * 100;
      this.workspaceHeightPercent = Math.min(this.maximumWorkspacePercent, Math.max(this.minimumWorkspacePercent, startPct + delta));
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
}
