import { Component, HostListener, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import packageJson from '../../../../../../../package.json';
import { SimulatorStore } from '../../../../core/state/simulator.store/simulator.store';
import { ThemeService } from '../../../../core/theme/theme-service';
import { Theme } from '../../../../core/theme/theme.types';

type Tab = 'editor' | 'simulator' | 'display' | 'about';

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
  saveSettings() {
    this.store.setAutosaveEnabled(this.autosave);
    this.themeService.setTheme(this.selectedTheme as Theme);

    this.dialogRef.close({
      autosave: this.autosave,
      theme: this.selectedTheme,
    });
  }

  //TODO: Se precisar, implementar essa funcao, o html ja esta pronto
  resetSettings() {}
}
