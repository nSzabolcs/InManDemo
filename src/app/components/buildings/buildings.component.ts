import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatAccordion, MatExpansionModule, MatExpansionPanel } from '@angular/material/expansion';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmdialogComponent } from '../confirmdialog/confirmdialog.component';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ImagemodalComponent } from '../imagemodal/imagemodal.component';
import { SnackbarService } from '../../services/snackbar.service';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';

@Component({
  selector: 'app-buildings',
  standalone: true,
  imports: [
    CommonModule, 
    MatButtonModule, 
    MatExpansionModule, 
    MatAccordion, 
    MatTableModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatIconModule, 
    MatDialogModule, 
    FormsModule, 
    RouterModule, 
    MatProgressBarModule,
    MatPaginatorModule,
    MatSortModule
  ],
  templateUrl: './buildings.component.html',
  styleUrl: './buildings.component.scss'
})

export class BuildingsComponent implements OnInit, AfterViewInit {
  readonly dialog = inject(MatDialog);
  @ViewChild(MatExpansionPanel) panel!: MatExpansionPanel;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['id', 'preview', 'name', 'address', 'levels', 'occupancy', 'actions'];
  dataSource = new MatTableDataSource<any>();
  buildings: any[] = [];

  buildingForm = {
    id: null,
    name: '',
    address: '',
    preview: ''
  };

  constructor(
    private api: ApiService,
    private snackbar: SnackbarService
  ) { }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        this.buildingForm.preview = reader.result as string;
      };

      reader.readAsDataURL(file); // base64-re olvassa be
    }
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  save() {
    const { id, name, address, preview } = this.buildingForm;

    if (!name || !address) {
      this.snackbar.show('Minden mező kitöltése kötelező!', 'error');
      return;
    }

    const payload = { name, address, preview };

    if (id) {
      // MÓDOSÍTÁS
      this.api.update('buildings', id, payload).subscribe({
        next: () => {
          this.snackbar.show('Sikeres módosítás!', 'success');

          this.loadData();
          this.resetForm();
        },
        error: err => {
          this.snackbar.show('Hiba módosítás közben: ' + (err?.error || 'Ismeretlen hiba'), 'error');
        }
      });
    } else {
      // ÚJ LÉTREHOZÁS
      this.api.insert('buildings', payload).subscribe({
        next: () => {
          this.snackbar.show('Sikeres mentés!', 'success');
          this.loadData();
          this.resetForm();
        },
        error: err => {
          this.snackbar.show('Hiba mentés közben: ' + (err?.error || 'Ismeretlen hiba'), 'error');
        }
      });
    }
  }

  onEdit(row: any): void {
    this.buildingForm = {
      id: row.id,
      name: row.name,
      address: row.address,
      preview: row.preview
    };

    this.panel.open();
  }

  onDelete(row: any): void {
    const dialogRef = this.dialog.open(ConfirmdialogComponent, {});

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.api.delete('buildings', row.id).subscribe({
          next: () => {
            this.snackbar.show('Sikeres törlés!', 'success');
            this.loadData();
            this.resetForm();
          },
          error: err => {
            this.snackbar.show('Hiba törlés közben: ' + (err?.error || 'Ismeretlen hiba'), 'error');
          }
        });
      } 
    });
  }

  loadData() {
    this.api.selectAll('buildings_vt').subscribe({
      next: (res) => {
        this.buildings = res as any[];
       /* this.buildings = (res as any[])
          .map(building => ({
            ...building,
            occupancy: Math.floor(Math.random() * 100) + 1  // 1-100%
          }));*/
        this.dataSource.data = this.buildings;
      }
    });
  }

  resetForm(): void {
    this.buildingForm = {
      id: null,
      name: '',
      address: '',
      preview: ''
    };
  }

  openImageDialog(image: string): void {
    this.dialog.open(ImagemodalComponent, {
      data: { image },
      panelClass: 'fullscreen-dialog'
    });
  }

  removePreview(): void {
    this.buildingForm.preview = '';
  }

}
