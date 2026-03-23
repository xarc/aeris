import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export abstract class FilePort {
  abstract saveText(filename: string, content: string, mime?: string): void;
  abstract saveBytes(filename: string, bytes: Uint8Array, mime?: string): void;
}
