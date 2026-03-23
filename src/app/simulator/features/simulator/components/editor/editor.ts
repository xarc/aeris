import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import * as monaco from 'monaco-editor';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
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

  private readonly codeChanges$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly store: SimulatorStore,
    private readonly themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    this.codeChanges$
      .pipe(debounceTime(150), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((text) => this.store.setSourceText(text));

    this.store.state$.pipe(takeUntil(this.destroy$)).subscribe((state) => {
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
    const monaco = (window as any).monaco;
    monaco?.editor?.setTheme(theme === 'dark' ? 'rv32i-dark' : 'rv32i-light');
    setTimeout(() => this.editorInstance?.layout(), 50);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.editorInstance?.layout();
  }

  onCodeChange(): void {
    this.codeChanges$.next(this.code);
  }
}
