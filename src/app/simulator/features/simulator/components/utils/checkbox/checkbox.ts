import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-checkbox',
  standalone: false,
  templateUrl: './checkbox.html',
  styleUrl: './checkbox.scss',
})
export class Checkbox {
  @Input() checked = false;
  @Input() disabled = false;
  @Input() label?: string;

  @Output() checkedChange = new EventEmitter<boolean>();

  onToggle(event: Event) {
    const input = event.target as HTMLInputElement;
    this.checkedChange.emit(input.checked);
  }
}
