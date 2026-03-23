import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface SelectOption<T = string> {
  label: string;
  value: T;
}
@Component({
  selector: 'app-select',
  standalone: false,
  templateUrl: './select.html',
  styleUrl: './select.scss',
})
export class Select<T = string> {
  @Input() options: SelectOption<T>[] = [];
  @Input() value!: T;
  @Input() width = '120px';
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<T>();

  onChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.valueChange.emit(select.value as unknown as T);
  }
}
