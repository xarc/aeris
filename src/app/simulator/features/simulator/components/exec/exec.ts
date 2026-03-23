import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { SimulatorStore } from '../../../../core/state/simulator.store/simulator.store';
import { SimulatorStateObject } from '../../../../core/domain/shared/types';
import { ConstantsInit } from '../../../../core/domain/shared/constants';

type TextRow = {
  address: number;
  code: string;
  basic: string;
  source: string;
};

type DataRow = {
  address: number;
  value0: number;
  value4: number;
  value8: number;
  value12: number;
  value16: number;
  value20: number;
  value24: number;
  value28: number;
};
//TODO: TIRAR OS STORE E FAZER O FACADE
@Component({
  selector: 'app-exec',
  standalone: false,
  templateUrl: './exec.html',
  styleUrl: './exec.scss',
})
export class Exec implements OnDestroy {
  @ViewChild('splitter', { static: true })
  splitterRef!: ElementRef<HTMLDivElement>;

  readonly PC_START = 4194304;
  readonly MAX_MEM_CONTROL = 4294967296;
  private lastPc = -1;

  textPct = 50;
  dataPct = 50;

  minPct = 25;
  maxPct = 75;

  private moveHandler?: (event: PointerEvent) => void;
  private upHandler?: (event: PointerEvent) => void;

  rowIndex = -1;

  page = 0;
  control = 0;

  memoryTypes = [
    { init: ConstantsInit.DATA_MEM_INIT, name: '.data' },
    { init: 0x10040000, name: 'heap' },
    { init: 0x10008000, name: 'gp' },
    { init: 0x7fffeffc, name: 'sp' },
    { init: this.PC_START, name: '.text' },
  ];

  memoryType = this.memoryTypes[0];

  simulation: SimulatorStateObject | null = null;

  constructor(private readonly store: SimulatorStore) {
    this.store.state$.subscribe((state) => {
      this.simulation = state.simulation;
      const pc = state.simulation?.riscv?.pc;

      if (pc != null && pc !== this.lastPc) {
        this.lastPc = pc;

        setTimeout(() => {
          this.scrollToSelectedRow(pc);
        });
      }
    });
  }

  canRun(): boolean {
    return !!this.simulation?.assembled;
  }

  get currentPc(): number {
    const simulation = this.simulation;

    if (!simulation || !simulation.riscv) {
      return -1;
    }

    return simulation.riscv.pc;
  }

  getTextSegment(): TextRow[] {
    const simulation = this.simulation;

    if (!simulation) {
      return [];
    }

    const rows: TextRow[] = [];
    const instructions = simulation.analysis?.text ?? [];

    for (let index = 0; index < instructions.length; index++) {
      const instruction = instructions[index];

      rows.push({
        address: instruction.address,
        code: this.normalizeHex(instruction.machine?.hex ?? ''),
        basic: [...(instruction.operands ?? [])].join(' '),
        source: instruction.raw?.join(' ') ?? '',
      });
    }

    return rows;
  }

  getDataSegment(): DataRow[] {
    const rows: DataRow[] = [];
    const startAddress = this.memoryType.init + this.page * 256;

    for (let address = startAddress; address < startAddress + 128 * 4; address += 32) {
      rows.push({
        address,
        value0: this.readMemory(address + 0),
        value4: this.readMemory(address + 4),
        value8: this.readMemory(address + 8),
        value12: this.readMemory(address + 12),
        value16: this.readMemory(address + 16),
        value20: this.readMemory(address + 20),
        value24: this.readMemory(address + 24),
        value28: this.readMemory(address + 28),
      });
    }

    return rows;
  }

  private readMemory(address: number): number {
    const simulation = this.simulation;

    if (!simulation || !simulation.riscv || !simulation.riscv.memory) {
      return 0;
    }
    return simulation.riscv.memory[address] ?? 0;
  }

  get lastDataRowAddr(): number {
    const rows = this.getDataSegment();

    if (rows.length === 0) {
      return 0;
    }

    return rows[rows.length - 1].address;
  }

  previousPage(): void {
    if (this.control > 0) {
      this.page--;
      this.updateControl();
    }
  }

  nextPage(): void {
    if (this.control < this.MAX_MEM_CONTROL) {
      this.page++;
      this.updateControl();
    }
  }

  selectOnChange(): void {
    this.page = 0;
    this.control = this.memoryType.init;
  }

  numberToHexadecimal(value: number): string {
    //TODO: TOUPPERCASE OU TOLOWERCASE
    return '0x' + (value >>> 0).toString(16).padStart(8, '0').toUpperCase();
  }

  binaryToHexadecimal(binary: string): string {
    const parsed = parseInt(binary, 2);

    if (Number.isNaN(parsed)) {
      return binary;
    }

    return this.numberToHexadecimal(parsed);
  }

  getHexValues(value: number): string {
    if (this.viewOptions.isAscii) {
      return this.wordToAscii(value);
    }

    if (this.viewOptions.isHexValues) {
      return this.numberToHexadecimal(value);
    }

    return String(value);
  }

  getHexAddresses(value: number): string {
    if (this.viewOptions.isHexAddresses) {
      return this.numberToHexadecimal(value);
    }

    return String(value);
  }

  setHexValues(value: boolean) {
    this.store.setViewOptions({ isHexValues: value });
  }

  setAscii(value: boolean) {
    this.store.setViewOptions({
      isAscii: value,
    });
  }

  setHexAddresses(value: boolean) {
    this.store.setViewOptions({ isHexAddresses: value });
  }

  private updateControl() {
    this.control = this.memoryType.init + this.page * 256;
  }

  private byteToAscii(byte: number): string {
    if (byte === 0x00) {
      return '\\0';
    }
    if (byte >= 0x20 && byte <= 0x7e) {
      return String.fromCharCode(byte);
    }
    return '.';
  }

  private wordToAscii(word: number): string {
    let result = '';

    //TODO: verificar se é MSB ou LSB e se precisa de " "

    // for (let i = 0; i < 4; i++) {
    //   const byte = (word >> (i * 8)) & 0xff;
    //   result += this.byteToAscii(byte) + " ";
    // }

    // MSB -> LSB (ao contrário)
    for (let i = 3; i >= 0; i--) {
      const byte = (word >> (i * 8)) & 0xff;
      result += this.byteToAscii(byte) + ' ';
    }

    return result;
  }

  scrollToSelectedRow(address: number): void {
    const element = document.getElementById('row-' + address);

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  }

  onResizerPointerDown(pointerEvent: PointerEvent): void {
    pointerEvent.preventDefault();
    (pointerEvent.target as HTMLElement).setPointerCapture?.(pointerEvent.pointerId);

    const splitterElement = this.splitterRef.nativeElement;
    const splitterRect = splitterElement.getBoundingClientRect();

    this.moveHandler = (event: PointerEvent) => {
      const offsetY = event.clientY - splitterRect.top;
      let newTopPercentage = (offsetY / splitterRect.height) * 100;

      if (newTopPercentage < this.minPct) {
        newTopPercentage = this.minPct;
      }

      if (newTopPercentage > this.maxPct) {
        newTopPercentage = this.maxPct;
      }

      this.textPct = Math.round(newTopPercentage);
      this.dataPct = 100 - this.textPct;
    };

    this.upHandler = () => {
      if (this.moveHandler) {
        window.removeEventListener('pointermove', this.moveHandler);
      }

      if (this.upHandler) {
        window.removeEventListener('pointerup', this.upHandler);
      }

      try {
        (pointerEvent.target as HTMLElement).releasePointerCapture?.(pointerEvent.pointerId);
      } catch {}
    };

    window.addEventListener('pointermove', this.moveHandler);
    window.addEventListener('pointerup', this.upHandler, { once: true });
  }

  ngOnDestroy(): void {
    if (this.moveHandler) {
      window.removeEventListener('pointermove', this.moveHandler);
    }

    if (this.upHandler) {
      window.removeEventListener('pointerup', this.upHandler);
    }
  }

  get viewOptions() {
    return this.store.getViewOptions();
  }

  private normalizeHex(value: string): string {
    if (!value) {
      return '';
    }

    return value
      .trim()
      .split(/\s+/)
      .map((part) => {
        let num: number | null = null;

        if (/^0x[0-9a-f]+$/i.test(part)) {
          num = parseInt(part, 16);
        } else if (/^[0-9a-f]+$/i.test(part)) {
          num = parseInt(part, 16);
        } else if (/^\d+$/.test(part)) {
          num = parseInt(part, 10);
        }

        if (num === null || Number.isNaN(num)) {
          return part;
        }

        //TODO: TOUPPERCASE OU TOLOWERCASE
        return '0x' + (num >>> 0).toString(16).padStart(8, '0').toUpperCase();
      })
      .join(' ');
  }
}
