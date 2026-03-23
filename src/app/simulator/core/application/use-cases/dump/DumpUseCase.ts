import { Injectable } from '@angular/core';
import { ConsolePort } from '../../../ports/console.port/console.port';
import { FilePort } from '../../../ports/file.port/file.port';
import { DumpType } from '../../../shared/dump-formats';
import { SimulatorStore } from '../../../state/simulator.store/simulator.store';

@Injectable({ providedIn: 'root' })
export class DumpUseCase {
  constructor(
    private readonly store: SimulatorStore,
    private readonly file: FilePort,
    private readonly console: ConsolePort,
  ) {}

  execute(type: DumpType): void {
    const simulation = this.store.getSimulation();
    if (!simulation?.analysis) {
      this.console.print('Nothing to dump', 'error');
      return;
    }

    switch (type.label) {
      case 'binary':
        this.dumpBinary(simulation);
        break;
      case 'hexadecimal':
        this.dumpHex(simulation);
        break;
      case 'text':
        this.dumpText(simulation);
        break;
    }
  }

  private dumpBinary(simulation: any): void {
    const text = simulation.analysis.text ?? [];
    const content = text.map((inst: any) => inst.machine.binary).join('\n');

    const filename = this.generateFilename('bin');

    this.file.saveText(filename, content, 'text/plain;charset=utf-8');

    this.console.print('Binary dump generated');
  }

  private dumpHex(simulation: any): void {
    const text = simulation.analysis.text ?? [];

    const content = text
      .map((inst: any) => inst.machine.hex.padStart(8, '0').toUpperCase())
      .join('\n');

    const filename = this.generateFilename('hex');

    this.file.saveText(filename, content, 'text/plain;charset=utf-8');

    this.console.print('Hex dump generated');
  }

  private dumpText(simulation: any): void {
    const { analysis } = simulation;
    const text = analysis.text ?? [];
    const data = analysis.data ?? [];

    const textDump = text
      .map((inst: any) => {
        const addr = `0x${inst.address.toString(16)}`;
        const hex = inst.machine.hex.padStart(8, '0');
        const asm = inst.raw?.join(' ') || inst.operands.join(' ');
        return `${addr}  ${hex}  ${asm}`;
      })
      .join('\n');

    const dataDump = data
      .flatMap((entry: any) =>
        entry.values.map((value: number, i: number) => {
          const addr = entry.address + i * 4;
          return `0x${addr.toString(16)}  ${value}`;
        }),
      )
      .join('\n');

    const content = ['=== TEXT SEGMENT ===', textDump, '', '=== DATA SEGMENT ===', dataDump].join(
      '\n',
    );

    const filename = this.generateFilename('txt');

    this.file.saveText(filename, content, 'text/plain;charset=utf-8');

    this.console.print('Text dump generated');
  }

  private generateFilename(extension: string): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
    return `aeris-program-${date}.${extension}`;
  }
}
