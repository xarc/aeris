import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DUMP_TYPES, DumpType } from '../../../../core/shared/dump-formats';

@Component({
  selector: 'app-dump-file-dialog',
  standalone: false,
  templateUrl: './dump-file-dialog.html',
  styleUrl: './dump-file-dialog.scss',
})
export class DumpFileDialog {
  constructor(public dialogRef: MatDialogRef<DumpFileDialog>) {}

  types = DUMP_TYPES;
  type: DumpType = this.types[0];

  dumpFile(): void {
    this.dialogRef.close(this.type);
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
