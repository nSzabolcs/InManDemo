import { Pipe, PipeTransform } from '@angular/core';
import * as fabric from 'fabric';

@Pipe({
  name: 'objectFilter',
  standalone: true
})
export class ObjectFilterPipe implements PipeTransform {
  transform(objects: fabric.Object[], searchText: string): fabric.Object[] {
    if (!objects) return [];
    if (!searchText) return objects;

    const lower = searchText.toLowerCase();

    return objects.filter(obj =>
      obj.type.toLowerCase().includes(lower) ||
      ((obj as any).name?.toLowerCase?.().includes(lower)) ||
      ((obj as any).id?.toString().includes(lower))
    );
  }
}
