import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { SimulatorStore } from '../../../../core/state/simulator.store/simulator.store';
import { SimulatorStateObject } from '../../../../core/domain/shared/types';
import { ConstantsInit } from '../../../../core/domain/shared/constants';

type TextRow = {
  address: number;
  code: string;
  basic: string;
  source: string;
  isPseudo: boolean;
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Exec implements OnDestroy {
  @ViewChild('splitter', { static: true })
  splitterRef!: ElementRef<HTMLDivElement>;

  readonly PC_START = 4194304;
  readonly MAX_MEM_CONTROL = 4294967296;
  private lastPc = -1;

  textSegmentPercent = 50;
  dataSegmentPercent = 50;

  minimumSplitPercent = 25;
  maximumSplitPercent = 75;

  private moveHandler?: (event: PointerEvent) => void;
  private upHandler?: (event: PointerEvent) => void;

  rowIndex = -1;

  memoryTypes = [
    { init: ConstantsInit.DATA_MEM_INIT, name: '.data' },
    { init: 0x10040000, name: 'heap' },
    { init: 0x10008000, name: 'gp' },
    { init: 0x7fffeffc, name: 'sp' },
    { init: this.PC_START, name: '.text' },
  ];

  memoryType = this.memoryTypes[0];

  page = 0;
  control = this.memoryType.init;

  simulation: SimulatorStateObject | null = null;
  lastWrittenMemoryAddress: number | null = null;
  private isRunning = false;

  textSegmentRows: TextRow[] = [];
  dataSegmentRows: DataRow[] = [];

  constructor(
    private readonly store: SimulatorStore,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly ngZone: NgZone,
  ) {
    this.store.state$.subscribe((state) => {
      this.simulation = state.simulation;

      const isRunning = state.phase === 'running';
      this.isRunning = isRunning;

      const writtenAddr = state.simulation?.riscv?.lastMutation?.writtenMemoryAddress ?? null;
      this.lastWrittenMemoryAddress = writtenAddr;

      if (!isRunning) {
        this.rebuildTextSegment();
        this.rebuildDataSegment();
        this.changeDetector.markForCheck();

        if (writtenAddr !== null) {
          this.navigateToWrittenAddress(writtenAddr);
        }

        const pc = state.simulation?.riscv?.pc;
        if (pc != null && pc !== this.lastPc) {
          this.lastPc = pc;
          setTimeout(() => this.scrollToSelectedRow(pc));
        }
      }
    });
  }

  canRun(): boolean {
    return !!this.simulation?.assembled;
  }

  get currentPc(): number {
    if (this.isRunning) {
      return -1;
    }

    const simulation = this.simulation;

    if (!simulation || !simulation.riscv) {
      return -1;
    }

    return simulation.riscv.pc;
  }

  private rebuildTextSegment(): void {
    const simulation = this.simulation;
    if (!simulation) {
      this.textSegmentRows = [];
      return;
    }

    const instructions = simulation.analysis?.text ?? [];
    this.textSegmentRows = instructions.map((instruction) => ({
      address: instruction.address,
      code: this.normalizeHex(instruction.machine?.hex ?? ''),
      basic: [...(instruction.operands ?? [])].join(' '),
      source: instruction.raw?.join(' ') ?? '',
      isPseudo: instruction.isPseudo ?? false,
    }));
  }

  private rebuildDataSegment(): void {
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

    this.dataSegmentRows = rows;
  }

  private readMemory(address: number): number {
    const simulation = this.simulation;

    if (!simulation || !simulation.riscv || !simulation.riscv.memory) {
      return 0;
    }
    return simulation.riscv.memory[address] ?? 0;
  }

  private navigateToWrittenAddress(address: number): void {
    let best = this.memoryTypes[0];
    let bestDist = Math.abs(address - best.init);

    for (const mt of this.memoryTypes) {
      const dist = Math.abs(address - mt.init);

      if (dist < bestDist) {
        bestDist = dist;
        best = mt;
      }
    }

    this.memoryType = best;
    this.page = Math.floor((address - best.init) / 256);
    this.control = best.init + this.page * 256;

    const startAddress = this.memoryType.init + this.page * 256;
    const rowAddress = Math.floor((address - startAddress) / 32) * 32 + startAddress;

    setTimeout(() => {
      this.scrollToDataRow(rowAddress);
    });
  }

  private scrollToDataRow(rowAddress: number): void {
    const element = document.getElementById('row-data-' + rowAddress);

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  }

  isDataCellSelected(row: DataRow, offset: number): boolean {
    if (this.lastWrittenMemoryAddress === null) {
      return false;
    }
    return (
      this.lastWrittenMemoryAddress >= row.address + offset &&
      this.lastWrittenMemoryAddress < row.address + offset + 4
    );
  }

  get lastDataRowAddr(): number {
    if (this.dataSegmentRows.length === 0) {
      return 0;
    }
    return this.dataSegmentRows[this.dataSegmentRows.length - 1].address;
  }

  previousPage(): void {
    if (this.control > 0) {
      this.page--;
      this.updateControl();
      this.rebuildDataSegment();
    }
  }

  nextPage(): void {
    if (this.control < this.MAX_MEM_CONTROL) {
      this.page++;
      this.updateControl();
      this.rebuildDataSegment();
    }
  }

  selectOnChange(): void {
    this.page = 0;
    this.control = this.memoryType.init;
    this.rebuildDataSegment();
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
    for (let index = 3; index >= 0; index--) {
      const byte = (word >> (index * 8)) & 0xff;
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

    this.ngZone.runOutsideAngular(() => {
      let animationFramePending = false;

      this.moveHandler = (event: PointerEvent) => {
        const offsetY = event.clientY - splitterRect.top;
        let newTopPercentage = (offsetY / splitterRect.height) * 100;

        if (newTopPercentage < this.minimumSplitPercent) {
          newTopPercentage = this.minimumSplitPercent;
        }

        if (newTopPercentage > this.maximumSplitPercent) {
          newTopPercentage = this.maximumSplitPercent;
        }

        this.textSegmentPercent = Math.round(newTopPercentage);
        this.dataSegmentPercent = 100 - this.textSegmentPercent;

        if (!animationFramePending) {
          animationFramePending = true;
          requestAnimationFrame(() => {
            animationFramePending = false;
            this.changeDetector.detectChanges();
          });
        }
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
    });
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
