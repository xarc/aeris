import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-slider',
  standalone: false,
  templateUrl: './slider.html',
  styleUrl: './slider.scss',
})
export class Slider {
  @Input() min = 0;
  @Input() max = 100;
  @Input() step = 1;
  @Input() value = 0;
  @Input() disabled = false;
  @Input() wide = false;

  @Output() valueChange = new EventEmitter<number>();

  onInput(event: Event) {
    const v = Number((event.target as HTMLInputElement).value);
    this.value = v;
    this.valueChange.emit(v);
  }
}
