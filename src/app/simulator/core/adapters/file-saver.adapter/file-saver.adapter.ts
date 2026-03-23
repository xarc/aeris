import { Injectable } from '@angular/core';
import { FilePort } from '../../ports/file.port/file.port';

@Injectable({ providedIn: 'root' })
export class FileSaverAdapter extends FilePort {
  saveText(filename: string, content: string, mime = 'text/plain'): void {
    const blob = new Blob([content], { type: mime });
    this.triggerDownload(filename, blob);
  }
  
  saveBytes(filename: string, bytes: Uint8Array, mime = 'application/octet-stream'): void {
    const view = new Uint8Array(bytes.byteLength);
    view.set(bytes);
    const blob = new Blob([view.buffer], { type: mime });
    this.triggerDownload(filename, blob);
  }

  private triggerDownload(filename: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const element = document.createElement('a');
    element.href = url;
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    element.remove();
    URL.revokeObjectURL(url);
  }
}
