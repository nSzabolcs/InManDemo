import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-imagemodal',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './imagemodal.component.html',
  styleUrl: './imagemodal.component.scss'
})

export class ImagemodalComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { image: string }) {}

}
