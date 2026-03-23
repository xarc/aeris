import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConsolePort } from '../ports/console.port/console.port';
import { MemoryConsoleAdapter } from './memory-console.adapter/memory-console.adapter';
import { FilePort } from '../ports/file.port/file.port';
import { FileSaverAdapter } from './file-saver.adapter/file-saver.adapter';
import { SyscallAdapter } from './syscall.adapter/syscall.adapter';
import { SyscallPort } from '../ports/syscall.port/syscall.port';

@NgModule({
  declarations: [],
  imports: [CommonModule],
  providers: [
    { provide: ConsolePort, useExisting: MemoryConsoleAdapter },
    { provide: FilePort, useExisting: FileSaverAdapter },
    { provide: SyscallPort, useClass: SyscallAdapter },
  ],
})
export class AdaptersModule {}
