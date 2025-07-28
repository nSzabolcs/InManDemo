import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { MatAccordion, MatExpansionModule, MatExpansionPanel } from '@angular/material/expansion';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { ImagemodalComponent } from '../imagemodal/imagemodal.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SnackbarService } from '../../services/snackbar.service';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';

@Component({
  selector: 'app-levels',
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
  templateUrl: './levels.component.html',
  styleUrl: './levels.component.scss'
})

export class LevelsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatExpansionPanel) panel!: MatExpansionPanel;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  readonly route = inject(ActivatedRoute);
  displayedColumns: string[] = ['id', 'preview', 'name', 'rooms', 'occupancy', 'actions'];
  dataSource = new MatTableDataSource<any>();

  constructor(
    private api: ApiService,
    private dialog: MatDialog,
    private snackbar: SnackbarService

  ) { }

  buildingId!: number;
  building: any = '';
  levels: any[] = [];

  levelForm = {
    id: null,
    building_id: 0,
    name: '',
    floorplan: null
  };

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.buildingId = +id;
        this.loadBuilding();
        this.loadLevels();

      }
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadBuilding() {
    this.api.select('buildings', this.buildingId).subscribe({
      next: (res) => {
        this.building = res;
      },
      error: (err) => {
        console.error('Épület lekérdezési hiba:', err);
        this.snackbar.show('Hiba történt az épület betöltésekor.', 'error');
      }
    });
  }

  loadLevels() {
    this.api.selectAll('levels_vt').subscribe({
      next: (res) => {
        this.levels = (res as any[]).filter(l => l.building_id == this.buildingId)
          .map(level => ({
            ...level,
            occupancy: Math.floor(level.occupied * 100 / level.rooms)
          }));

        this.dataSource.data = this.levels;
      },
      error: (err) => {
        console.error('Szintek lekérdezési hiba:', err);
        this.snackbar.show('Hiba történt a szintek betöltésekor.', 'error');
      }
    });
  }

  save() {
    const { id, name } = this.levelForm;

    if (!name) {
      this.snackbar.show('A szint neve kötelező!', 'error');
      return;
    }

    this.levelForm.building_id = this.buildingId;

    if (id) {
      this.api.update('levels', id, this.levelForm).subscribe({
        next: () => {
          this.snackbar.show('Sikeres módosítás!', 'success');
          this.loadLevels();
          this.resetForm();
        },
        error: (err) => {
          this.snackbar.show('Hiba módosítás közben: ' + (err?.error || 'Ismeretlen hiba'), 'error');
        }
      });
    } else {
      this.api.insert('levels', this.levelForm).subscribe({
        next: () => {
          this.snackbar.show('Sikeres mentés!', 'success');
          this.loadLevels();
          this.resetForm();
        },
        error: (err) => {
          this.snackbar.show('Hiba mentés közben: ' + (err?.error || 'Ismeretlen hiba'), 'error');
        }
      });
    }
  }

  onEdit(level: any) {
    this.levelForm = {
      id: level.id,
      building_id: level.building_id,
      name: level.name,
      floorplan: level.floorplan || null
    };
    this.panel.open();
  }

  onDelete(level: any) {
    if (confirm(`Biztosan törlöd a(z) "${level.name}" szintet?`)) {
      this.api.delete('levels', level.id).subscribe({
        next: () => {
          this.snackbar.show('Sikeres törlés!', 'success');
          this.loadLevels();
          this.resetForm();
        },
        error: (err) => {
          this.snackbar.show('Hiba törlés közben: ' + (err?.error || 'Ismeretlen hiba'), 'error');
        }
      });
    }
  }

  resetForm() {
    this.levelForm = {
      id: null,
      building_id: this.buildingId,
      name: '',
      floorplan: null
    };
  }

  openImageDialog(image: string): void {
    this.dialog.open(ImagemodalComponent, {
      data: { image },
      panelClass: 'fullscreen-dialog'
    });
  }

}