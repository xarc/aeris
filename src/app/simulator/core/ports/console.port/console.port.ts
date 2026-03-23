import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'

export type ConsoleLevel = 'log' | 'warn' | 'error' | 'input' | 'system'

export interface ConsoleEntry {
  timestamp: number
  level: ConsoleLevel
  message: string
}

export interface ConsoleState {
  entries: ConsoleEntry[]
  allowInput: boolean
}

@Injectable({ providedIn: 'root' })
export abstract class ConsolePort {
  abstract readonly state$: Observable<ConsoleState>
  abstract readonly allowInput$: Observable<boolean>
  abstract readonly input$: Observable<string>
 
  abstract getSnapshot(): ConsoleState

  abstract print(message: string, level?: ConsoleLevel): void
  abstract clear(): void
  abstract setAllowInput(flag: boolean): void
  abstract echoInput(line: string): void
}
