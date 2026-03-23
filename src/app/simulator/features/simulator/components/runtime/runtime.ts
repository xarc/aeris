import { Component } from '@angular/core';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { SimulatorStore } from '../../../../core/state/simulator.store/simulator.store';
//TODO: TIRAR OS STORE E FAZER O FACADE

@Component({
  selector: 'app-runtime',
  standalone: false,
  templateUrl: './runtime.html',
  styleUrl: './runtime.scss',
})
export class Runtime {
  private selectedIndex = 0;

  constructor(private readonly store: SimulatorStore) {}

  getSelectedIndex(): number {
    return this.store.getSelectedTab();
  }

  onTabChange(event: MatTabChangeEvent) {
    this.selectedIndex = event.index;
    this.store.setSelectedTab(event.index);
  }
}
