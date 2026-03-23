import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { App } from './app';
import { SimulatorModule } from './simulator/features/simulator/simulator-module';

@NgModule({
  declarations: [App],
  imports: [BrowserModule, SimulatorModule],
  providers: [provideBrowserGlobalErrorListeners()],
  bootstrap: [App],
})
export class AppModule {}
