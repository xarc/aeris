import { Component, HostListener, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import packageJson from '../../../../../../../package.json';
import { SimulatorStore } from '../../../../core/state/simulator.store/simulator.store';
import { ThemeService } from '../../../../core/theme/theme-service';
import { Theme } from '../../../../core/theme/theme.types';

type Tab = 'editor' | 'performance' | 'about';

@Component({
  selector: 'app-settings-dialog',
  standalone: false,
  templateUrl: './settings-dialog.html',
  styleUrl: './settings-dialog.scss',
})
export class SettingsDialog implements OnInit {
  constructor(
    public dialogRef: MatDialogRef<SettingsDialog>,
    private store: SimulatorStore,
    private themeService: ThemeService,
  ) {
    this.autosave = this.store.isAutosaveEnabled();
    this.selectedInstructionsPerTick = this.store.getInstructionsPerTick();
    this.msBetweenTicks = this.store.getMsBetweenTicks();
  }

  version = packageJson.version;

  tabSize = 4;

  activeTab: Tab = 'editor';

  autosave = true;

  wordWrap = true;

  selectedTheme: Theme = 'dark';

  themeOptions: Array<{ label: string; value: Theme }> = [
    { label: 'Dark', value: 'dark' },
    // { label: 'Light', value: 'light' },
  ];

  selectedInstructionsPerTick = 1000;
  msBetweenTicks = 0;

  executionSpeedOptions: Array<{ label: string; value: number }> = [
    { label: 'Slow (100)', value: 100 },
    { label: 'Normal (1000)', value: 1000 },
    { label: 'Fast (5000)', value: 5000 },
    { label: 'Maximum (10000)', value: 10000 },
  ];

  ngOnInit() {
    this.selectedTheme = this.themeService.getTheme();
  }
  switchTab(tabName: Tab) {
    this.activeTab = tabName;
  }

  onTabSizeChange(value: number) {
    this.tabSize = value;
  }

  onWordWrapChange(value: boolean) {
    this.wordWrap = value;
  }

  onThemeChange(value: string) {
    this.selectedTheme = value as Theme;
  }

  onAutosaveChange(value: boolean) {
    this.autosave = value;
  }

  closeDialog() {
    this.dialogRef.close();
  }
  onExecutionSpeedChange(value: number): void {
    this.selectedInstructionsPerTick = value;
  }

  onMsBetweenTicksChange(value: number): void {
    this.msBetweenTicks = value;
  }

  saveSettings(): void {
    this.store.setAutosaveEnabled(this.autosave);
    this.store.setInstructionsPerTick(this.selectedInstructionsPerTick);
    this.store.setMsBetweenTicks(this.msBetweenTicks);
    this.themeService.setTheme(this.selectedTheme as Theme);

    this.dialogRef.close({
      autosave: this.autosave,
      theme: this.selectedTheme,
      instructionsPerTick: this.selectedInstructionsPerTick,
    });
  }

  //TODO: Se precisar, implementar essa funcao, o html ja esta pronto
  resetSettings() {}
}
