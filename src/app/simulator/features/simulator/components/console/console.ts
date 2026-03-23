import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConsolePort } from '../../../../core/ports/console.port/console.port';
import { SimulatorStore } from '../../../../core/state/simulator.store/simulator.store';

@Component({
  selector: 'app-console',
  standalone: false,
  templateUrl: './console.html',
  styleUrl: './console.scss',
})
export class Console implements OnDestroy {
  @ViewChild('consoleContainer')
  private consoleContainer!: ElementRef<HTMLDivElement>;

  public input = '';
  public allowInput = false;

  private allowInputSubscription?: Subscription;

  public lineCount = 0;
  public pcHex = '0x00400000';

  constructor(
    private readonly consolePort: ConsolePort,
    private readonly simulatorStore: SimulatorStore,
  ) {
    this.allowInputSubscription = this.consolePort.allowInput$.subscribe(
      (allow) => (this.allowInput = allow),
    );

    this.simulatorStore.state$.subscribe((state) => {
      const pc = state.simulation?.riscv?.pc;
      if (typeof pc === 'number') {
        this.pcHex = this.formatPc(pc);
      }

      const text = state.source?.text ?? '';
      this.lineCount = text.length ? text.split('\n').length : 0;
    });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.allowInputSubscription?.unsubscribe();
  }
  
  exportConsole(): void {
    const now = new Date();

    const date = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');

    const filename = `aeris-console-${date}.log`;

    const blob = new Blob([this.getConsole()], {
      type: 'text/plain;charset=utf-8;',
    });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    window.URL.revokeObjectURL(url);
  }

  public printConsole(message: string): void {
    this.consolePort.print(message, 'log');
  }

  public getConsole(): string {
    const { entries } = this.consolePort.getSnapshot();
    return entries.map((e) => this.formatConsoleLine(e.timestamp, e.level, e.message)).join('\n');
  }

  public clearConsole(): void {
    this.consolePort.clear();
  }

  public onEnter(): void {
    this.consolePort.echoInput(this.input);
    this.input = '';
  }

  private formatConsoleLine(timestamp: number, level: string | undefined, message: string): string {
    const time = new Intl.DateTimeFormat(undefined, {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(timestamp);
    const tag = (level ?? 'log').toUpperCase();
    return `${time} [${tag}] ${message ?? ''}`;
  }

  private scrollToBottom(): void {
    if (!this.consoleContainer) {
      return;
    }

    const element = this.consoleContainer.nativeElement;
    element.scrollTop = element.scrollHeight;
  }

  private formatPc(pc: number): string {
    return '0x' + pc.toString(16).padStart(8, '0').toUpperCase();
  }
}
