import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormatValuePipe } from './format-value/format-value-pipe';
 


@NgModule({
  declarations: [
     FormatValuePipe
  ],
  imports: [
    CommonModule
  ]
})
export class PipesModule { }
