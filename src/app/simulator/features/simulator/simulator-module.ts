import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimulatorPage } from './pages/simulator-page/simulator-page';
import { Menu } from './components/menu/menu';
import { Editor } from './components/editor/editor';
import { Exec } from './components/exec/exec';
import { Register } from './components/registers/registers';
import { Console } from './components/console/console';
import { DumpFileDialog } from './dialogs/dump-file-dialog/dump-file-dialog';
import { SettingsDialog } from './dialogs/settings-dialog/settings-dialog';
import { HelpDialog } from './dialogs/help-dialog/help-dialog';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { Runtime } from './components/runtime/runtime';
import { monacoConfig } from '../../core/monaco/monaco.config';
import { MonacoEditorModule, provideMonacoEditor } from 'ngx-monaco-editor-v2';
import { AdaptersModule } from '../../core/adapters/adapters-module';
import { Select } from './components/utils/select/select';
import { DialogHeader } from './components/utils/dialog-header/dialog-header';
import { Checkbox } from './components/utils/checkbox/checkbox';
import { Toggle } from './components/utils/toggle/toggle';
import { Slider } from './components/utils/slider/slider';
 
@NgModule({
  declarations: [
    SimulatorPage,
    Menu,
    Editor,
    Exec,
    Register,
    Console,
    DumpFileDialog,
    HelpDialog,
    Runtime,
    SettingsDialog,
    Select,
    DialogHeader,
    Checkbox,
    Toggle,
    Slider,
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDialogModule,
    MatInputModule,
    MatIconModule,
    MatDialogModule,
    MatTabsModule,
    MonacoEditorModule.forRoot(monacoConfig),
    AdaptersModule,
  ],
  providers: [
    provideMonacoEditor({
      baseUrl: 'assets/monaco/vs',
      defaultOptions: { scrollBeyondLastLine: false },
      onMonacoLoad: monacoConfig.onMonacoLoad,
    }),
  ],
  exports: [SimulatorPage],
})
export class SimulatorModule {}
