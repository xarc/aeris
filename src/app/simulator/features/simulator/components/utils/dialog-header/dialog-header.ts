import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DIALOG_HEADER_ICONS, DialogHeaderIcon } from './dialog-header.icons';

@Component({
  selector: 'app-dialog-header',
  standalone: false,
  templateUrl: './dialog-header.html',
  styleUrl: './dialog-header.scss',
})
export class DialogHeader {
  @Input() icon!: DialogHeaderIcon;
  @Input() title = '';
  @Input() description = '';

  @Output() close = new EventEmitter<void>();

  icons = DIALOG_HEADER_ICONS;
}
