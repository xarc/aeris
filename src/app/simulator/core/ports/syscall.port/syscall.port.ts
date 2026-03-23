import { Injectable } from '@angular/core';
import { SyscallEffect, SyscallAdapterResult } from '../../domain/riscv/syscall/types';
 
@Injectable({
  providedIn: 'root'
})
export abstract class SyscallPort {
    abstract execute(effect: SyscallEffect): Promise<SyscallAdapterResult >;
}
