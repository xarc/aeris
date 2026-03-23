import { Component, signal } from '@angular/core';
import { ThemeService } from './simulator/core/theme/theme-service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('ÆRIS');
  constructor(private themeService: ThemeService) {
    const theme = this.themeService.getTheme();
    this.themeService.setTheme(theme);
  }
}
