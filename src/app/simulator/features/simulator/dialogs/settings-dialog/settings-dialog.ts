import { Component, HostListener, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import packageJson from '../../../../../../../package.json';
import {
  CLOCK_UNLIMITED,
  SimulatorStore,
} from '../../../../core/state/simulator.store/simulator.store';
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
    this.selectedClockHz = this.store.getClockHz();
  }

  version = packageJson.version;

  tabSize = 4;

  activeTab: Tab = 'editor';

  autosave = true;

  wordWrap = true;

  selectedTheme: Theme = 'dark';

  themeOptions: Array<{ label: string; value: Theme }> = [
    { label: 'Dark', value: 'dark' },
    { label: 'Light', value: 'light' },
  ];

  selectedClockHz = CLOCK_UNLIMITED;

  clockOptions: Array<{ label: string; value: number }> = [
    { label: '1 Hz', value: 1 },
    { label: '10 Hz', value: 10 },
    { label: '100 Hz', value: 100 },
    { label: '1 kHz', value: 1_000 },
    { label: '10 kHz', value: 10_000 },
    { label: '100 kHz', value: 100_000 },
    { label: '1 MHz', value: 1_000_000 },
    { label: 'Unlimited', value: CLOCK_UNLIMITED },
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
  onClockChange(value: number): void {
    this.selectedClockHz = Number(value);
  }

  saveSettings(): void {
    this.store.setAutosaveEnabled(this.autosave);
    this.store.setClockHz(this.selectedClockHz);
    this.themeService.setTheme(this.selectedTheme as Theme);

    this.dialogRef.close({
      autosave: this.autosave,
      theme: this.selectedTheme,
      clockHz: this.selectedClockHz,
    });
  }

  //TODO: Se precisar, implementar essa funcao, o html ja esta pronto
  resetSettings() {}
}
