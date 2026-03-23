import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Subject } from 'rxjs';
import {
  ConsoleEntry,
  ConsoleLevel,
  ConsolePort,
  ConsoleState,
} from '../../ports/console.port/console.port';

const INITIAL_CONSOLE_STATE: ConsoleState = { entries: [], allowInput: false };
const MAX_CONSOLE_ENTRIES = 5000;

@Injectable({ providedIn: 'root' })
export class MemoryConsoleAdapter extends ConsolePort {
  private readonly stateSubject = new BehaviorSubject<ConsoleState>(INITIAL_CONSOLE_STATE);

  private readonly inputSubject = new Subject<string>();

  public readonly state$ = this.stateSubject.asObservable();
  public readonly allowInput$ = this.state$.pipe(map((state) => state.allowInput));

  public readonly input$ = this.inputSubject.asObservable();

  public getSnapshot(): ConsoleState {
    return this.stateSubject.value;
  }

  public print(message: string, level: ConsoleLevel = 'log'): void {
    const newEntry: ConsoleEntry = { timestamp: Date.now(), level, message };
    const current = this.stateSubject.value;
    const nextEntries = [...current.entries, newEntry].slice(-MAX_CONSOLE_ENTRIES);
    this.stateSubject.next({ ...current, entries: nextEntries });
  }

  public clear(): void {
    const current = this.stateSubject.value;
    this.stateSubject.next({ ...current, entries: [] });
  }

  public setAllowInput(flag: boolean): void {
    const current = this.stateSubject.value;
    if (current.allowInput !== flag) {
      this.stateSubject.next({ ...current, allowInput: flag });
    }
  }

  public echoInput(line: string): void {
    const value = line ?? '';

    // this.print(value, 'input');

    this.inputSubject.next(value);
  }
}
