import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-toggle',
  standalone: false,
  templateUrl: './toggle.html',
  styleUrl: './toggle.scss',
})
export class Toggle {
  @Input() checked = false;
  @Input() disabled = false;

  @Output() checkedChange = new EventEmitter<boolean>();

  toggle() {
    if (this.disabled) return;

    this.checked = !this.checked;
    this.checkedChange.emit(this.checked);
  }
}
