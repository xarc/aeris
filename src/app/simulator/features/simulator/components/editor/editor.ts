import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import * as monaco from 'monaco-editor';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { SimulatorFacade } from '../../../../core/state/simulator.facade/simulator.facade';
import { SimulatorStore } from '../../../../core/state/simulator.store/simulator.store';
import { ThemeService } from '../../../../core/theme/theme-service';

@Component({
  selector: 'app-editor',
  standalone: false,
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
})
export class Editor implements OnInit, OnDestroy {
  editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    theme: 'rv32i-dark',
    language: 'rv32i',
    minimap: { enabled: false },
    automaticLayout: true,
  };

  code = '.data\n\n.text\n';
  private editorInstance?: monaco.editor.IStandaloneCodeEditor;
  private pendingEditCommit = false;

  private readonly codeChanges$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly store: SimulatorStore,
    private readonly facade: SimulatorFacade,
    private readonly themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    this.codeChanges$
      .pipe(debounceTime(150), takeUntil(this.destroy$))
      .subscribe((text) => {
        this.facade.stopExecution();
        this.store.setSourceText(text);
        this.pendingEditCommit = false;
      });

    this.store.state$.pipe(takeUntil(this.destroy$)).subscribe((state) => {
      if (this.editorInstance) {
        this.updateErrorMarker(state.errorLine, state.errorMessage);
      }
      
      if (this.pendingEditCommit) {
        return;
      }

      const newText = state.source.text ?? '';

      if (this.editorInstance) {
        const current = this.editorInstance.getValue();
        if (current !== newText) {
          this.editorInstance.setValue(newText);
        }
      }

      this.code = newText;
    });

    this.themeService
      .themeChanges$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((theme) => {
        const monaco = (window as any).monaco;
        if (!monaco) {
          return;
        }

        monaco.editor.setTheme(theme === 'dark' ? 'rv32i-dark' : 'rv32i-light');
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onEditorInit(editor: monaco.editor.IStandaloneCodeEditor) {
    this.editorInstance = editor;
    const theme = this.themeService.getTheme?.() ?? 'dark';
    const monacoGlobal = (window as any).monaco;
    monacoGlobal?.editor?.setTheme(theme === 'dark' ? 'rv32i-dark' : 'rv32i-light');

    const snapshot = this.store.getSnapshot();
    this.updateErrorMarker(snapshot.state.errorLine, snapshot.state.errorMessage);

    setTimeout(() => this.editorInstance?.layout(), 50);
  }

  private updateErrorMarker(line: number | null, message: string | null): void {
    const monacoGlobal = (window as any).monaco;
    const model = this.editorInstance?.getModel();
    if (!monacoGlobal || !model) {
      return;
    }

    if (line == null || !message) {
      monacoGlobal.editor.setModelMarkers(model, 'assembler', []);
      return;
    }

    monacoGlobal.editor.setModelMarkers(model, 'assembler', [
      {
        startLineNumber: line,
        endLineNumber: line,
        startColumn: 1,
        endColumn: model.getLineMaxColumn(line),
        message,
        severity: monacoGlobal.MarkerSeverity.Error,
      },
    ]);

    this.editorInstance?.revealLineInCenter(line);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.editorInstance?.layout();
  }

  onCodeChange(): void {
    this.pendingEditCommit = true;
    this.codeChanges$.next(this.code);
  }
}
