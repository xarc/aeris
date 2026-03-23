import { Component } from '@angular/core';
import { ConsolePort } from '../../../../core/ports/console.port/console.port';
import { SimulatorFacade } from '../../../../core/state/simulator.facade/simulator.facade';

@Component({
  selector: 'app-menu',
  standalone: false,
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
})
export class Menu {
  constructor(
    private readonly console: ConsolePort,
    private readonly facade: SimulatorFacade,
  ) {}

  get canDump$() {
    return this.facade.canDump$;
  }
  get canRun$() {
    return this.facade.canRun$;
  }
  get canStep$() {
    return this.facade.canStep$;
  }
  get canUndo$() {
    return this.facade.canUndo$;
  }
  get canReset$() {
    return this.facade.canReset$;
  }
  get canAssemble$() {
    return this.facade.canAssemble$;
  }
  get canDownload$() {
    return this.facade.canDownload$;
  }
  get canOpen$() {
    return this.facade.canOpen$;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith('.asm')) {
      this.console.print('Arquivo inválido: selecione um .asm', 'error');
      input.value = '';
      return;
    }
    this.facade.onFileSelected(file);
    input.value = '';
  }

  resetFreshState(): void {
    this.facade.reset();
  }

  downloadFile(): void {
    this.facade.downloadFile();
  }

  dumpFile(): void {
    this.facade.dumpFile();
  }

  assembleCode(): void {
    this.facade.assembleCode();
  }

  runEntireProgram(): void {
    this.facade.runEntireProgram();
  }

  runOneStep(): void {
    this.facade.runOneStep();
  }
  
  undoLastStep(): void {
    this.facade.undoLastStep();
  }

  resetAll(): void {
    this.facade.resetAll();
  }

  help(): void {
    this.facade.help();
  }

  openSettings(): void {
    this.facade.settings();
  }

  getCanDump(): boolean {
    return this.facade.guardsSnapshot.canDump;
  }
  
  getCanRun(): boolean {
    return this.facade.guardsSnapshot.canRun;
  }

  canExecuteInstruction(): boolean {
    return this.facade.guardsSnapshot.canStep;
  }
  
  canUndoLastStep(): boolean {
    return this.facade.guardsSnapshot.canUndo;
  }
}
