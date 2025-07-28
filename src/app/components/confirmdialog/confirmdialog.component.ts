import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogActions, MatDialogClose, MatDialogModule, MatDialogTitle } from '@angular/material/dialog';

@Component({
  selector: 'app-confirmdialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatDialogActions, MatDialogClose, MatDialogTitle],
  templateUrl: './confirmdialog.component.html',
  styleUrl: './confirmdialog.component.scss'
})

export class ConfirmdialogComponent {

}
