import { Routes } from '@angular/router';
import { BuildingsComponent } from './components/buildings/buildings.component';
import { LevelsComponent } from './components/levels/levels.component';
import { FloorplanComponent } from './components/floorplan/floorplan.component';
import { RoomsComponent } from './components/rooms/rooms.component';


export const routes: Routes = [
  { path: 'buildings', component: BuildingsComponent },
  { path: 'levels/:id', component: LevelsComponent },
  { path: 'floorplan/:id', component: FloorplanComponent },
  { path: 'rooms/:id', component: RoomsComponent },
  { path: '**', redirectTo: 'buildings', pathMatch: 'full'}
];
