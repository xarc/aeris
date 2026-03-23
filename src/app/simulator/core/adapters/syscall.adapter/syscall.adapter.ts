import { Injectable } from '@angular/core';
import { ConsolePort } from '../../ports/console.port/console.port';
import { SyscallPort } from '../../ports/syscall.port/syscall.port';
import { SyscallEffect, SyscallAdapterResult } from '../../domain/riscv/syscall/types';

@Injectable({ providedIn: 'root' })
export class SyscallAdapter extends SyscallPort {
  constructor(private console: ConsolePort) {
    super();
  }

  async execute(effect: SyscallEffect): Promise<SyscallAdapterResult> {
    switch (effect.kind) {
      case 'print':
        this.console.print(effect.text, 'system');
        return {};

      case 'read':
        this.console.setAllowInput(true);
        const input = await this.waitForInput();
        this.console.setAllowInput(false);
        if (effect.type === 'int') {
          const trimmed = input.trim();

          if (!/^-?\d+$/.test(trimmed)) {
            this.console.print(`Invalid integer input: "${input}"`, 'error');
            throw new Error('Invalid integer input');
          }
          this.console.print(input, 'system');
          return {
            newRegisters: { a0: parseInt(trimmed, 10) },
          };
        }
        this.console.print(input, 'system');
        return { input };

      default:
        return {};
    }
  }

  private waitForInput(): Promise<string> {
    return new Promise((resolve) => {
      const sub = this.console.input$.subscribe((line) => {
        resolve(line);
        sub.unsubscribe();
      });
    });
  }
}
