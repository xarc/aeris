import { Injectable } from '@angular/core';
import { ConsolePort } from '../../ports/console.port/console.port';
import { SimulatorStore } from '../simulator.store/simulator.store';
import { FilePort } from '../../ports/file.port/file.port';
import { MatDialog } from '@angular/material/dialog';
import { HelpDialog } from '../../../features/simulator/dialogs/help-dialog/help-dialog';
import { DumpFileDialog } from '../../../features/simulator/dialogs/dump-file-dialog/dump-file-dialog';
import { AssembleUseCase } from '../../application/use-cases/assemble/AssembleUseCase';
import { DumpUseCase } from '../../application/use-cases/dump/DumpUseCase';
import { RunProgramUseCase } from '../../application/use-cases/run/RunProgramUseCase';
import { SettingsDialog } from '../../../features/simulator/dialogs/settings-dialog/settings-dialog';

@Injectable({ providedIn: 'root' })
export class SimulatorFacade {
  constructor(
    private readonly store: SimulatorStore,
    private readonly console: ConsolePort,
    private readonly file: FilePort,
    private readonly dialog: MatDialog,

    private readonly runUseCase: RunProgramUseCase,
    private readonly assembleUseCase: AssembleUseCase,
    private readonly dumpUseCase: DumpUseCase,
  ) {}

  get canOpen$() {
    return this.store.canOpen$;
  }

  get canDownload$() {
    return this.store.canDownload$;
  }

  get canDump$() {
    return this.store.canDump$;
  }

  get canAssemble$() {
    return this.store.canAssemble$;
  }

  get canRun$() {
    return this.store.canRun$;
  }

  get canStep$() {
    return this.store.canStep$;
  }

  get canUndo$() {
    return this.store.canUndo$;
  }

  get canReset$() {
    return this.store.canReset$;
  }

  get guardsSnapshot() {
    return this.store.getSnapshot().guards;
  }

  async onFileSelected(file: File): Promise<void> {
    const content =
      'text' in file
        ? await file.text()
        : await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ''));
            reader.readAsText(file);
          });

    this.store.reset();
    this.store.setSourceText(content);
     this.console.print(`File loaded: ${file.name}`);
  }

  reset(): void {
    this.store.resetAll();
    this.console.print('New file created');
  }

  downloadFile(): void {
    if (!this.guardsSnapshot.canDownload) {
      return;
    }

    const { state } = this.store.getSnapshot();
    const content = state.source.text ?? '';

    const now = new Date();
    const date = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const filename = `aeris-source-${date}.asm`;

    this.file.saveText(filename, content, 'text/plain;charset=utf-8');

    this.console.print('Download completed');
  }

  dumpFile(): void {
    if (!this.store.getSnapshot().guards.canDump) {
      return;
    }

    const reference = this.dialog.open(DumpFileDialog, {
      maxWidth: '100vw',
      autoFocus: false,
      panelClass: 'dump-file-dialog-panel',
    });

    reference.afterClosed().subscribe((type) => {
      if (!type) return;

      this.dumpUseCase.execute(type);
    });
  }

  assembleCode(): void {
    this.assembleUseCase.assemble();
  }

  runEntireProgram(): void {
    this.runUseCase.runAll();
  }

  runOneStep(): void {
    this.runUseCase.step();
  }

  undoLastStep(): void {
    this.runUseCase.undo();
  }

  resetAll(): void {
    if (!this.guardsSnapshot.canReset) {
      return;
    }

    this.store.reset();
    this.console.print('Reset completed');
  }

  help(): void {
    this.dialog.open(HelpDialog, {
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'help-dialog-panel',
    });
  }

  settings(): void {
    this.dialog.open(SettingsDialog, {
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'settings-dialog-panel',
    });
  }
}
