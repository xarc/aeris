import { Component } from '@angular/core';
import { SimulatorStore } from '../../../../core/state/simulator.store/simulator.store';
import { SimulatorStateObject } from '../../../../core/domain/shared/types';

//TODO: TIRAR OS STORE E FAZER O FACADE
@Component({
  selector: 'app-registers',
  standalone: false,
  templateUrl: './registers.html',
  styleUrl: './registers.scss',
})
export class Register {
  lastChangedIndex: number | null = null;

  regKeys: string[] = Array.from({ length: 32 }, (_, index) => `x${index}`);

  constructor(private readonly store: SimulatorStore) {
    this.store.state$.subscribe((state) => {
      const mutation = state.simulation?.riscv?.lastMutation;

      this.lastChangedIndex = mutation?.writtenRegisterIndex ?? null;

      if (this.lastChangedIndex !== null) {
        this.scrollToSelectedRow(this.lastChangedIndex);
      }
    });
  }

  private get simulation(): SimulatorStateObject | null {
    return this.store.getSimulation();
  }

  private get registers(): Record<string, number> {
    return this.simulation?.riscv?.registers ?? {};
  }

  private get programCounter(): number {
    return this.simulation?.riscv?.pc ?? 0;
  }

  getRegName(registerKey: string): string {
    const aliasMap: Record<string, string> = {
      x0: 'zero',
      x1: 'ra',
      x2: 'sp',
      x3: 'gp',
      x4: 'tp',
      x5: 't0',
      x6: 't1',
      x7: 't2',
      x8: 's0',
      x9: 's1',
      x10: 'a0',
      x11: 'a1',
      x12: 'a2',
      x13: 'a3',
      x14: 'a4',
      x15: 'a5',
      x16: 'a6',
      x17: 'a7',
      x18: 's2',
      x19: 's3',
      x20: 's4',
      x21: 's5',
      x22: 's6',
      x23: 's7',
      x24: 's8',
      x25: 's9',
      x26: 's10',
      x27: 's11',
      x28: 't3',
      x29: 't4',
      x30: 't5',
      x31: 't6',
    };

    return aliasMap[registerKey] ?? '';
  }

  getRegisterValue(registerKey: string): number {
    return this.registers[registerKey] ?? 0;
  }

  getProgramCounter(): number {
    return this.programCounter;
  }

  formatHex(value: number): string {
    return '0x' + (value >>> 0).toString(16).padStart(8, '0').toUpperCase();
  }

  scrollToSelectedRow(index: number): void {
    const element = document.getElementById(`row-reg-${index}`);

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  }

  formatRegisterValue(value: number): string {
    if (this.isHexValues) {
      return '0x' + (value >>> 0).toString(16).padStart(8, '0').toUpperCase();
    }

    return String(value);
  }

  get isHexValues(): boolean {
    return this.store.getViewOptions().isHexValues;
  }
}
