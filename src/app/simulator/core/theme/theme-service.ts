import { Injectable } from '@angular/core';
import { THEME_KEY, THEMES } from './theme.constants';
import { Theme } from './theme.types';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly theme$ = new BehaviorSubject<Theme>('dark');

  constructor() {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    this.setTheme(saved ?? 'dark');
  }

  setTheme(theme: Theme) {
    this.theme$.next(theme);
    localStorage.setItem(THEME_KEY, theme);
    this.applyThemeTokens(THEMES[theme]);
  }

  getTheme(): Theme {
    return this.theme$.value;
  }

  themeChanges$() {
    return this.theme$.asObservable();
  }

  private applyThemeTokens(tokens: Record<string, string>) {
    const root = document.documentElement;
    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }
}
