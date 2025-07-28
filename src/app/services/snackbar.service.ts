import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})

export class SnackbarService {

  constructor(private snackBar: MatSnackBar) {}

  show(message: string, type: 'success' | 'error' = 'success'): void {
    this.snackBar.open(message, 'Bezár', {
      duration: 3000,
      panelClass: type === 'success' ? ['snackbar-success'] : ['snackbar-error'],
      verticalPosition: 'bottom',
      horizontalPosition: 'center'
    });
  }
  
}
