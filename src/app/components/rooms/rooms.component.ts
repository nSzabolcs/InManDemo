import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { SnackbarService } from '../../services/snackbar.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule, MatAccordion, MatExpansionPanel } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ImagemodalComponent } from '../imagemodal/imagemodal.component';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';

@Component({
  selector: 'app-rooms',
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
    MatSelectModule,
    MatPaginatorModule,
    MatSortModule
  ],
  templateUrl: './rooms.component.html',
  styleUrl: './rooms.component.scss'
})

export class RoomsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatExpansionPanel) panel!: MatExpansionPanel;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  stats = {
    totalCount: 0,
    totalArea: 0,
    emptyCount: 0,
    emptyArea: 0,
    occupiedCount: 0,
    occupiedArea: 0,
    emptyRatioByCount: 0,
    emptyRatioByArea: 0,
  };

  levelId: any = null;
  buildingId: any = null;
  currentLevel: any = null;
  currentBuilding: any = null;

  rooms: any[] = [];
  displayedColumns: string[] = ['id', 'name', 'description', 'area', 'status', 'actions'];
  dataSource = new MatTableDataSource<any>();

  roomForm = {
    id: null,
    building_id: 0,
    level_id: 0,
    name: '',
    area: 0,
    description: '',
    status: 0
  };

  readonly route = inject(ActivatedRoute);

  constructor(
    private api: ApiService,
    private dialog: MatDialog,
    private snackbar: SnackbarService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.levelId = params.get('id');

      this.api.select('levels', this.levelId).subscribe({
        next: (res) => {
          this.buildingId = res.building_id;
          this.loadBuilding();
          this.currentLevel = res;
          this.loadRooms();
        }
      })
    })
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  calculateStats() {
    const rooms = this.dataSource.data;

    this.stats.totalCount = rooms.length;
    this.stats.totalArea = rooms.reduce((sum, r) => sum + (Number(r.area) || 0), 0);

    const emptyRooms = rooms.filter(r => Number(r.status) === 0);
    const occupiedRooms = rooms.filter(r => Number(r.status) === 1);

    this.stats.emptyCount = emptyRooms.length;
    this.stats.emptyArea = emptyRooms.reduce((sum, r) => sum + (Number(r.area) || 0), 0);

    this.stats.occupiedCount = occupiedRooms.length;
    this.stats.occupiedArea = occupiedRooms.reduce((sum, r) => sum + (Number(r.area) || 0), 0);

    this.stats.emptyRatioByCount = this.stats.totalCount > 0
      ? Math.round((this.stats.emptyCount / this.stats.totalCount) * 100)
      : 100;

    this.stats.emptyRatioByArea = this.stats.totalArea > 0
      ? Math.round((this.stats.emptyArea / this.stats.totalArea) * 100)
      : 100;
  }

  loadBuilding() {
    this.api.select('buildings', this.buildingId).subscribe({
      next: (res) => this.currentBuilding = res,
      error: (err) => console.error('Épület lekérdezési hiba:', err)
    });
  }

  loadRooms() {
    this.api.selectAll('rooms').subscribe({
      next: (res) => {
        this.rooms = (res as any[]).filter(r => r.level_id == this.levelId);
        this.dataSource.data = this.rooms;
        this.calculateStats();

        this.route.queryParams.subscribe(params => {
          const roomIdToEdit = params['edit'];
          console.log(roomIdToEdit)
          if (roomIdToEdit) {
            const room = this.rooms.find(r => r.id === roomIdToEdit);
            if (room) {
              this.onEdit(room);
            }
          }
        });

      },
      error: (err) => {
        console.error('Szintek lekérdezési hiba:', err);
        this.snackbar.show('Hiba történt a szintek betöltésekor.', 'error');
      }
    });
  }

  save() {
    const { id, name, building_id, level_id, area, description } = this.roomForm;

    if (!name) {
      this.snackbar.show('A helység neve kötelező!', 'error');
      return;
    }

    this.roomForm.building_id = this.buildingId;
    this.roomForm.level_id = this.levelId;

    if (id) {
      this.api.update('rooms', id, this.roomForm).subscribe({
        next: () => {
          this.snackbar.show('Sikeres módosítás!', 'success');
          this.loadRooms();
          this.resetForm();
        },
        error: (err) => {
          this.snackbar.show('Hiba módosítás közben: ' + (err?.error || 'Ismeretlen hiba'), 'error');
        }
      });
    } else {
      this.api.insert('rooms', this.roomForm).subscribe({
        next: () => {
          this.snackbar.show('Sikeres mentés!', 'success');
          this.loadRooms();
          this.resetForm();
        },
        error: (err) => {
          this.snackbar.show('Hiba mentés közben: ' + (err?.error || 'Ismeretlen hiba'), 'error');
        }
      });
    }
  }

  onEdit(room: any) {
    this.roomForm = {
      id: room.id,
      building_id: room.building_id,
      level_id: room.level_id,
      name: room.name,
      area: room.area,
      description: room.description,
      status: Number(room.status)
    };
    this.panel.open();
  }

  onDelete(room: any) {
    if (confirm(`Biztosan törlöd a(z) "${room.name}" helységet?`)) {
      this.api.delete('rooms', room.id).subscribe({
        next: () => {
          this.snackbar.show('Sikeres törlés!', 'success');
          this.loadRooms();
          this.resetForm();
        },
        error: (err) => {
          this.snackbar.show('Hiba törlés közben: ' + (err?.error || 'Ismeretlen hiba'), 'error');
        }
      });
    }
  }

  resetForm() {
    this.roomForm = {
      id: null,
      building_id: this.buildingId,
      level_id: this.levelId,
      name: '',
      area: 0,
      description: '',
      status: 0
    };
  }

  openImageDialog(image: string): void {
    this.dialog.open(ImagemodalComponent, {
      data: { image },
      panelClass: 'fullscreen-dialog'
    });
  }

}
