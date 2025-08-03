import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatTabsModule } from '@angular/material/tabs';
import { ApiService } from '../../services/api.service';
import { ObjectFilterPipe } from './object-filter.pipe';
import { SnackbarService } from '../../services/snackbar.service';
import * as fabric from 'fabric';
interface Template {
  name: string;
  json: string;
}
@Component({
  selector: 'app-floorplan',
  standalone: true,
  imports: [MatButtonToggleModule, MatIconModule, MatButtonModule, RouterModule, FormsModule, MatCheckboxModule, CommonModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatSliderModule, MatTabsModule, ObjectFilterPipe],
  templateUrl: './floorplan.component.html',
  styleUrl: './floorplan.component.scss'
})

export class FloorplanComponent implements AfterViewInit, OnInit, OnDestroy {


  readonly route = inject(ActivatedRoute);
  mode: 'select' | 'line' | 'rect' | 'polygon' | 'textbox' | 'ellipse' | 'polyline' | 'image' | 'arc' | 'template' = 'select';
  levelId: any = null;
  buildingId: any = null;
  currentLevel: any = null;
  currentBuilding: any = null;
  rooms: any[] = [];
  gridSnapEnabled: boolean = false;
  showGrid: boolean = true;
  activeTabIndex: number = 1;
  objectList: fabric.Object[] = [];
  elementSearch: string = '';
  editingObject: fabric.Object | null = null;
  showAreaLabels = false;
  zoomedAlready: boolean = false;
  zoom = 1;
  undoStack: string[] = [];
  redoStack: string[] = [];
  maxHistory = 10;
  suppressHistory = false;
  clipboard: fabric.Object[] = [];
  public canvas!: fabric.Canvas;
  private isShiftDown = false;
  private points: { x: number, y: number }[] = [];
  private pointCircles: fabric.Circle[] = [];
  private lineCircles: fabric.Circle[] = [];
  private rectCircles: fabric.Circle[] = [];
  private ellipseCircles: fabric.Circle[] = [];
  private hoveredVertexMarker?: fabric.Circle;
  private arcPoints: { x: number, y: number }[] = [];
  private arcRadiusPreview: fabric.Line | null = null;
  private arcPathPreview: fabric.Path | null = null;
  private lines: fabric.Line[] = [];
  private radius = 5;
  private previewLine: fabric.Line | null = null;
  private rectStartPoint: { x: number, y: number } | null = null;
  private rectPreview: fabric.Rect | null = null;
  private ellipsePreview: fabric.Ellipse | null = null;
  private lineStartPoint: { x: number, y: number } | null = null;
  private linePreview: fabric.Line | null = null;
  private isPanning = false;
  private lastPanPoint: fabric.Point | null = null;
  private gridSpacing = 50;
  private objectCounters: { [type: string]: number } = {};
  private editingVertices: fabric.Circle[] = [];
  private ellipseCentered: boolean = false;
  private rectHintText?: fabric.Text;
  private lineHintText?: fabric.Text;
  private polylineHintText?: fabric.Text;
  private ellipseHintText?: fabric.Text;
  private snapPoints: { x: number; y: number }[] = [];
  private snapThreshold = 10;

  constructor(
    private api: ApiService,
    private snackbar: SnackbarService
  ) { }

  @HostListener('window:resize')
  onResize() {
    this.resizeCanvas();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapePressed() {

    if (this.rectHintText) {
      this.canvas.remove(this.rectHintText);
      this.rectHintText = undefined;
    }

    if (this.lineHintText) {
      this.canvas.remove(this.lineHintText);
      this.lineHintText = undefined;
    }

    if (this.polylineHintText) {
      this.canvas.remove(this.polylineHintText);
      this.polylineHintText = undefined;
    }

    if (this.ellipseHintText) {
      this.canvas.remove(this.ellipseHintText);
      this.ellipseHintText = undefined;
    }

    this.disableVertexEditing();
    const drawingWasActive = this.cancelDrawing();

    if (!drawingWasActive) {
      this.mode = 'select';
      this.updateCanvasSelectability();
    }
  }

  formTextStyle = {
    name: '',
    text: 'Adj meg egy szöveget',
    fill: '#000000',
    fontSize: 20,
    fontFamily: 'Arial',
    fontWeight: 'normal' as 'normal' | 'bold',
    fontStyle: 'normal' as 'normal' | 'italic',
    textAlign: 'center' as 'left' | 'center' | 'right',
    underline: false,
    linethrough: false
  };

  formLineStyle = {
    name: '',
    stroke: '#000000',
    strokeWidth: 2,
    strokeDashArray: 'solid'
  };

  formPolylineStyle = {
    name: '',
    stroke: '#000000',
    strokeWidth: 2,
    strokeDashArray: 'solid'
  };

  formRectStyle = {
    name: '',
    stroke: '#000000',
    strokeWidth: 2,
    strokeDashArray: 'solid',
    fill: '#cccccc',
    fillOpacity: 50,
    fillPattern: 'none' as 'none' | 'diagonal1' | 'diagonal2' | 'cross' | 'horizontal' | 'vertical' | 'grid' | 'dots',
    fillPatternSize: 10
  };

  formEllipseStyle = {
    name: '',
    stroke: '#000000',
    strokeWidth: 2,
    strokeDashArray: 'solid',
    fill: '#cccccc',
    fillOpacity: 50,
    fillPattern: 'none' as 'none' | 'diagonal1' | 'diagonal2' | 'cross' | 'horizontal' | 'vertical' | 'grid' | 'dots',
    fillPatternSize: 10
  };

  formPolygonStyle = {
    name: '',
    stroke: '#000000',
    strokeWidth: 2,
    strokeDashArray: 'solid',
    fill: '#88ccff',
    fillOpacity: 50,
    fillPattern: 'none' as 'none' | 'diagonal1' | 'diagonal2' | 'cross' | 'horizontal' | 'vertical' | 'grid' | 'dots',
    fillPatternSize: 10
  };

  formImageStyle = {
    name: '',
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    angle: 0
  };

  formTemplateStyle = {
    name: '',
    templateName: '',
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    angle: 0
  };

  formArcStyle = {
    name: '',
    stroke: '#000000',
    strokeWidth: 2,
    strokeDashArray: 'solid'
  };

  selectedLineObject: fabric.Line | null = null;
  selectedTextObject: fabric.Textbox | null = null;
  selectedPolylineObject: fabric.Polyline | null = null;
  selectedRectObject: fabric.Rect | null = null;
  selectedEllipseObject: fabric.Ellipse | null = null;
  selectedPolygonObject: fabric.Polygon | null = null;
  selectedImageFile: File | null = null;
  selectedImageObject: fabric.Image | null = null;
  selectedArcObject: fabric.Path | null = null;
  selectedRoomId: number | null = null;
  selectedTemplateObject: Template | null = null;
  savedTemplates: Template[] = [];
  newTemplate: Template = {
    name: '',
    json: ''
  };

  get showTextPanel(): boolean {
    const objects = this.canvas?.getActiveObjects() || [];
    return this.mode === 'textbox' || (objects.length > 0 && objects.every(o => o.type === 'textbox'));
  }

  get showLinePanel(): boolean {
    const objects = this.canvas?.getActiveObjects() || [];
    return this.mode === 'line' || (objects.length > 0 && objects.every(o => o.type === 'line'));
  }

  get showPolylinePanel(): boolean {
    const objects = this.canvas?.getActiveObjects() || [];
    return this.mode === 'polyline' || (objects.length > 0 && objects.every(o => o.type === 'polyline'));
  }

  get showRectPanel(): boolean {
    const objects = this.canvas?.getActiveObjects() || [];
    return this.mode === 'rect' || (objects.length > 0 && objects.every(o => o.type === 'rect'));
  }

  get showEllipsePanel(): boolean {
    const objects = this.canvas?.getActiveObjects() || [];
    return this.mode === 'ellipse' || (objects.length > 0 && objects.every(o => o.type === 'ellipse'));
  }

  get showPolygonPanel(): boolean {
    const objects = this.canvas?.getActiveObjects() || [];
    return this.mode === 'polygon' || (objects.length > 0 && objects.every(o => o.type === 'polygon'));
  }

  get showImagePanel(): boolean {
    return this.mode === 'image' || !!this.selectedImageObject;;
  }

  get showTemplatePanel(): boolean {
    return this.mode === 'template' || !!this.selectedTemplateObject;
  }

  get showArcPanel(): boolean {
    const objects = this.canvas?.getActiveObjects() || [];
    return this.mode === 'arc' || (objects.length > 0 && objects.every(o => o.type === 'path'));
  }

  get isObjectSelected(): boolean {
    return this.mode === 'select' && this.canvas?.getActiveObjects()?.length > 0;
  }

  get isObjectsSelected(): boolean {
    return this.canvas?.getActiveObjects()?.length > 0;
  }

  get selectedTextObjects(): fabric.Textbox[] {
    return (this.canvas?.getActiveObjects() || []).filter(o => o.type === 'textbox') as fabric.Textbox[];
  }

  get selectedLineObjects(): fabric.Line[] {
    return (this.canvas?.getActiveObjects() || []).filter(o => o.type === 'line') as fabric.Line[];
  }

  get selectedRectObjects(): fabric.Rect[] {
    return (this.canvas?.getActiveObjects() || []).filter(o => o.type === 'rect') as fabric.Rect[];
  }

  get selectedEllipseObjects(): fabric.Ellipse[] {
    return (this.canvas?.getActiveObjects() || []).filter(o => o.type === 'ellipse') as fabric.Ellipse[];
  }

  get selectedPolyLineObjects(): fabric.Polyline[] {
    return (this.canvas?.getActiveObjects() || []).filter(o => o.type === 'polyline') as fabric.Polyline[];
  }

  get selectedPolygonObjects(): fabric.Polygon[] {
    return (this.canvas?.getActiveObjects() || []).filter(o => o.type === 'polygon') as fabric.Polygon[];
  }

  get selectedArcObjects(): fabric.Path[] {
    return (this.canvas?.getActiveObjects() || []).filter(o => o.type === 'path') as fabric.Path[];
  }

  get isAreaObjectSelected(): boolean {
    return !!(this.selectedRectObject || this.selectedEllipseObject || this.selectedPolygonObject);
  }

  get selectedObjectsCount() {
    return this.canvas.getActiveObjects().length;
  }

  resizeCanvas(): void {
    const container = document.querySelector('.toolbar') as HTMLElement;
    const details = document.querySelector('.details') as HTMLElement;

    if (container && details) {
      const totalWidth = container.clientWidth;
      const canvasWidth = totalWidth - details.offsetWidth - 35;
      this.canvas.setWidth(canvasWidth);
      this.canvas.setHeight(750); // vagy dinamikusan is számolhatod
      this.canvas.renderAll();
    }
  }

  handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Shift') {
      this.isShiftDown = true;
    }

    if (e.key === 'Alt') {
      this.canvas.setCursor('grabbing');
      this.canvas.renderAll();
    }

    if (e.key === 'Control') {
      this.canvas.setCursor('copy'); // vagy saját pipetta ikon
      this.canvas.defaultCursor = 'copy';
      this.canvas.renderAll();
    }

    if (e.ctrlKey && e.key.toLowerCase() === 'a') {
      e.preventDefault(); // ne jelölje ki a teljes oldalt

      const allObjects = this.canvas.getObjects().filter(o => o.visible /*&& o.selectable*/);

      if (this.mode === 'select') {
        // minden objektum kijelölése
        this.canvas.discardActiveObject();
        if (allObjects.length > 0) {
          const selection = new fabric.ActiveSelection(allObjects, { canvas: this.canvas });
          this.canvas.setActiveObject(selection);
        }
      } else {
        // csak a módhoz tartozó típus kiválasztása
        let type = '';
        switch (this.mode) {
          case 'line': type = 'line'; break;
          case 'rect': type = 'rect'; break;
          case 'ellipse': type = 'ellipse'; break;
          case 'polygon': type = 'polygon'; break;
          case 'polyline': type = 'polyline'; break;
          case 'textbox': type = 'textbox'; break;
          case 'image': type = 'image'; break;
          case 'arc': type = 'path'; break; // az arc path típus
        }

        const sameTypeObjects = allObjects.filter(o => o.type === type);

        this.canvas.discardActiveObject();
        if (sameTypeObjects.length > 0) {
          const selection = new fabric.ActiveSelection(sameTypeObjects, { canvas: this.canvas });
          this.canvas.setActiveObject(selection);
        }
      }

      this.canvas.requestRenderAll();
    }

    if (e.key === 'Delete' && this.mode === 'select') {
      const activeObjects = this.canvas.getActiveObjects();
      if (activeObjects.length > 0) {
        this.saveHistory();
        activeObjects.forEach(obj => this.canvas.remove(obj));
        this.canvas.discardActiveObject(); // kijelölés megszüntetése
        this.canvas.renderAll();
      }
    }
  };

  handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Shift') {
      this.isShiftDown = false;
    }

    if (e.key === 'Alt') {
      this.canvas.setCursor('crosshair');
      this.canvas.renderAll();
    }

    if (e.key === 'Control') {
      this.canvas.setCursor(this.mode === 'select' ? 'default' : 'crosshair');
      this.canvas.defaultCursor = this.mode === 'select' ? 'default' : 'crosshair';
      this.canvas.renderAll();
    }

  };

  loadBuilding() {
    this.api.select('buildings', this.buildingId).subscribe({
      next: (res) => this.currentBuilding = res,
      error: (err) => console.error('Épület lekérdezési hiba:', err)
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.levelId = params.get('id');


      this.api.select('levels', this.levelId).subscribe({
        next: (res) => {
          this.buildingId = res.building_id;
          this.loadBuilding();

          this.currentLevel = res;
          this.loadRooms();
          // console.log(res.floorplan)
          if (res.floorplan && res.floorplan !== '' && res.floorplan != '{"version":"6.7.0","objects":[]}') {
            this.canvas.loadFromJSON(res.floorplan, this.canvas.renderAll.bind(this.canvas));

            // Figyeljük, mikor történik meg a teljes betöltés (pl. képek is)
            this.canvas.on('after:render', () => {
              if (!this.zoomedAlready) {
                this.zoomedAlready = true;

                setTimeout(() => {
                  this.resizeCanvas();
                  this.relinkAreaLabels();
                  this.updateCountersFromCanvas();
                  this.updateCanvasSelectability();
                  this.zoomToFit();
                }, 100);
              }
            });
          } else {
            this.resetView();
          }
        }
      });
    });

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

  }

  ngOnDestroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  ngAfterViewInit(): void {

    fabric.Object.prototype.toObject = (function (originalToObject) {
      return function (this: any, properties?: string[]) {
        const safeProps = Array.isArray(properties) ? properties : [];
        return originalToObject.call(this, [
          ...safeProps,
          'name',
          'templateName',
          'areaLabelId',
          'areaLinked',
          'showAreaLabel',
          'lockMovementX',
          'lockMovementY',
          'selectable',
          'evented',
          'id',
          'visible',
          'fillColor',
          'fillPattern',
          'fillPatternSize',
          'fillOpacity',
          'roomId'
        ]);
      };
    })(fabric.Object.prototype.toObject);

    this.canvas = new fabric.Canvas('canvas-id', {
      selection: true,
      preserveObjectStacking: true,
      defaultCursor: 'crosshair'
    });

    this.canvas.upperCanvasEl.addEventListener('mousedown', (evt: MouseEvent) => {
      if (evt.button === 1 || evt.button === 2) {
        // középső vagy jobb gomb
        this.isPanning = true;
        this.canvas.upperCanvasEl.style.cursor = 'grabbing';
        this.lastPanPoint = new fabric.Point(evt.clientX, evt.clientY);
        evt.preventDefault(); // fontos!
      }
    });

    window.addEventListener('mouseup', () => {
      this.isPanning = false;
      this.lastPanPoint = null;
      this.canvas.upperCanvasEl.style.cursor = this.mode === 'select' ? 'default' : 'crosshair';
    });

    this.canvas.upperCanvasEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    this.resizeCanvas();

    this.canvas.on('before:render', () => {
      this.drawInfiniteGrid();
    });

    this.canvas.on('mouse:down', (event) => {

      const evt = event.e as MouseEvent;

      if (evt.ctrlKey && this.mode === 'select') {
        const target = event.target;
        if (target) {
          this.copyStyleFromObject(target);
          evt.preventDefault();
          return;
        }
      }

      // if (evt.altKey && evt.button === 0) {  // Középső egérgomb
      if (evt.button === 1) {
        this.isPanning = true;
        this.lastPanPoint = new fabric.Point(evt.clientX, evt.clientY);
        evt.preventDefault();
        return;
      }

      const pointer = this.getSnappedPointer(this.canvas.getPointer(event.e));

      // --- SELECT ---
      if (this.mode === 'select') return;

      // --- LINE ---
      if (this.mode === 'line') {
        if (!this.lineStartPoint) {
          this.saveHistory();
          // első kattintás: kezdőpont mentése
          this.lineStartPoint = pointer;

          // kis  kör az első ponthoz
          const circle = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: this.radius,
            fill: 'red',
            selectable: false,
            originX: 'center',
            originY: 'center',
            excludeFromExport: true
          });
          this.lineCircles.push(circle);
          this.canvas.add(circle);
        } else {


          // második kattintás: végleges vonal
          const line = new fabric.Line(
            [this.lineStartPoint.x, this.lineStartPoint.y, pointer.x, pointer.y],
            {
              stroke: this.formLineStyle.stroke,
              strokeWidth: this.formLineStyle.strokeWidth,
              strokeDashArray: this.formLineStyle.strokeDashArray === 'solid' ? [0, 0] :
                this.formLineStyle.strokeDashArray === 'dashed' ? [5, 5] :
                  [2, 2]
            }
          );

          (line as any).name = this.formLineStyle.name;
          this.canvas.add(line);
          this.formLineStyle.name = this.generateAutoName('line');


          // kis kör a második ponthoz
          const circle = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: this.radius,
            fill: 'red',
            selectable: false,
            originX: 'center',
            originY: 'center',
            excludeFromExport: true
          });
          this.lineCircles.push(circle);
          this.canvas.add(circle);

          // körök eltávolítása
          this.lineCircles.forEach(c => this.canvas.remove(c));
          this.lineCircles = [];

          this.lineStartPoint = null;

          if (this.linePreview) {
            this.canvas.remove(this.linePreview);
            this.linePreview = null;
            if (this.lineHintText) {
              this.canvas.remove(this.lineHintText);
              this.lineHintText = undefined;
            }

          }
        }


        return;
      }

      // --- POLYLINE ---
      if (this.mode === 'polyline') {
        this.handlePolylineMouseDown(pointer);
        return;
      }

      // --- RECTANGLE ---
      if (this.mode === 'rect') {
        if (!this.rectStartPoint) {
          // első kattintás: kezdőpont mentése
          this.saveHistory();
          this.rectStartPoint = pointer;

          const startCircle = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: this.radius,
            fill: 'red',
            selectable: false,
            originX: 'center',
            originY: 'center',
            excludeFromExport: true
          });
          this.rectCircles.push(startCircle);
          this.canvas.add(startCircle);


        } else {

          let fillValue: string | fabric.Pattern;

          if (this.formRectStyle.fillPattern !== 'none') {
            const patternCanvas = this.createPatternCanvas(
              this.formRectStyle.fillPattern,
              this.formRectStyle.fill,
              this.formRectStyle.fillOpacity,
              this.formRectStyle.fillPatternSize
            );

            fillValue = new fabric.Pattern({
              source: patternCanvas,
              repeat: 'repeat'
            });
          } else {
            const alpha = this.formRectStyle.fillOpacity / 100;
            fillValue = this.hexToRgba(this.formRectStyle.fill, alpha);
          }
          // második kattintás: végleges téglalap
          const rect = this.createRectFromPoints(this.rectStartPoint, pointer, {
            fill: fillValue,
            stroke: this.formRectStyle.stroke,
            strokeWidth: this.formRectStyle.strokeWidth,
            strokeDashArray: this.formRectStyle.strokeDashArray === 'solid' ? [] :
              this.formRectStyle.strokeDashArray === 'dashed' ? [5, 5] : [2, 2]
          });

          // **Kitöltés adatok hozzáadása az objektumhoz**
          (rect as any).fillPattern = this.formRectStyle.fillPattern;
          (rect as any).fillPatternSize = this.formRectStyle.fillPatternSize;
          (rect as any).fillColor = this.formRectStyle.fill;
          (rect as any).fillOpacity = this.formRectStyle.fillOpacity;

          //  this.canvas.add(rect);

          const areaValue = (rect.width! * rect.height!) / (this.gridSpacing * this.gridSpacing);
          const areaText = areaValue.toFixed(2) + ' m²';

          const textbox = new fabric.Textbox(areaText, {
            width: rect.width,
            left: rect.left! + rect.width! / 2,
            top: rect.top! + rect.height! / 2,
            originX: 'center',
            originY: 'center',
            fontSize: 12,
            fill: '#000',
            editable: true,
            textAlign: 'center',
            visible: this.showAreaLabels
          });


          (textbox as any).areaLinked = true;
          (textbox as any).id = 'label-' + Math.random().toString(36).substr(2, 9);
          (rect as any).areaLabel = textbox;
          (rect as any).showAreaLabel = this.showAreaLabels;
          (rect as any).areaLabelId = (textbox as any).id;
          (rect as any).name = this.formRectStyle.name;
          (textbox as any).name = this.formRectStyle.name + ' címke';

          this.canvas.add(rect);
          this.formRectStyle.name = this.generateAutoName('rect');
          this.canvas.add(textbox);

          // kis piros kör a végponthoz
          const endCircle = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: this.radius,
            fill: 'red',
            selectable: false,
            originX: 'center',
            originY: 'center',
            excludeFromExport: true
          });
          this.rectCircles.push(endCircle);
          this.canvas.add(endCircle);

          // körök törlése
          this.rectCircles.forEach(c => this.canvas.remove(c));
          this.rectCircles = [];


          this.rectStartPoint = null;

          if (this.rectPreview) {
            this.canvas.remove(this.rectPreview);
            this.rectPreview = null;
            if (this.rectHintText) {
              this.canvas.remove(this.rectHintText);
              this.rectHintText = undefined;
            }
          }
        }
        return;
      }

      // --- POLYGON ---
      if (this.mode === 'polygon') {
        this.handlePolygonMouseDown(pointer);
        return
      }

      // --- ELLIPSE ---
      if (this.mode === 'ellipse') {
        if (!this.rectStartPoint) {
          this.saveHistory();
          this.rectStartPoint = pointer;

          const startCircle = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: this.radius,
            fill: 'red',
            selectable: false,
            originX: 'center',
            originY: 'center',
            excludeFromExport: true
          });
          this.ellipseCircles.push(startCircle);
          this.canvas.add(startCircle);


        } else {
          let cx: number, cy: number;
          let rx: number, ry: number;

          if (this.ellipseCentered) {
            cx = this.rectStartPoint.x;
            cy = this.rectStartPoint.y;
            rx = Math.abs(pointer.x - cx);
            ry = Math.abs(pointer.y - cy);
          } else {
            rx = Math.abs(pointer.x - this.rectStartPoint.x) / 2;
            ry = Math.abs(pointer.y - this.rectStartPoint.y) / 2;
            cx = (pointer.x + this.rectStartPoint.x) / 2;
            cy = (pointer.y + this.rectStartPoint.y) / 2;
          }

          if (this.isShiftDown) {
            const r = Math.min(rx, ry);
            rx = ry = r;
          }

          this.ellipseCentered = false;

          let fillValue: string | fabric.Pattern;

          if (this.formEllipseStyle.fillPattern !== 'none') {
            const patternCanvas = this.createPatternCanvas(
              this.formEllipseStyle.fillPattern,
              this.formEllipseStyle.fill,
              this.formEllipseStyle.fillOpacity,
              this.formEllipseStyle.fillPatternSize
            );
            fillValue = new fabric.Pattern({
              source: patternCanvas,
              repeat: 'repeat'
            });
          } else {
            const alpha = this.formEllipseStyle.fillOpacity / 100;
            fillValue = this.hexToRgba(this.formEllipseStyle.fill, alpha);
          }

          const ellipse = new fabric.Ellipse({
            left: cx - rx,
            top: cy - ry,
            originX: 'left',
            originY: 'top',
            rx,
            ry,
            fill: fillValue,
            stroke: this.formEllipseStyle.stroke,
            strokeWidth: this.formEllipseStyle.strokeWidth,
            strokeDashArray:
              this.formEllipseStyle.strokeDashArray === 'solid' ? [] :
                this.formEllipseStyle.strokeDashArray === 'dashed' ? [5, 5] :
                  [2, 2]
          });

          // **Kitöltés adatok hozzáadása az objektumhoz**
          (ellipse as any).fillPattern = this.formEllipseStyle.fillPattern;
          (ellipse as any).fillPatternSize = this.formEllipseStyle.fillPatternSize;
          (ellipse as any).fillColor = this.formEllipseStyle.fill;
          (ellipse as any).fillOpacity = this.formEllipseStyle.fillOpacity;

          (ellipse as any).name = this.formEllipseStyle.name;
          (ellipse as any).showAreaLabel = this.showAreaLabels;

          const label = this.createAreaLabelForEllipse(ellipse);
          (ellipse as any).areaLabel = label;
          (ellipse as any).areaLabelId = (label as any).id;

          this.canvas.add(ellipse);
          this.canvas.add(label);

          this.formEllipseStyle.name = this.generateAutoName('ellipse');
          this.rectStartPoint = null;

          const endCircle = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: this.radius,
            fill: 'red',
            selectable: false,
            originX: 'center',
            originY: 'center',
            excludeFromExport: true
          });
          this.ellipseCircles.push(endCircle);
          this.canvas.add(endCircle);

          // Körök eltávolítása
          this.ellipseCircles.forEach(c => this.canvas.remove(c));
          this.ellipseCircles = [];

          if (this.ellipsePreview) {
            this.canvas.remove(this.ellipsePreview);
            this.ellipsePreview = null;
          }

          if (this.ellipseHintText) {
            this.canvas.remove(this.ellipseHintText);
            this.ellipseHintText = undefined;
          }

        }
        return;
      }

      // --- TEXT ---
      if (this.mode === 'textbox') {
        this.saveHistory();
        const textbox = new fabric.Textbox('Adj meg egy szöveget', {
          left: pointer.x,
          top: pointer.y,
          fontSize: this.formTextStyle.fontSize,
          fill: this.formTextStyle.fill,
          fontFamily: this.formTextStyle.fontFamily,
          fontWeight: this.formTextStyle.fontWeight,
          fontStyle: this.formTextStyle.fontStyle,
          underline: this.formTextStyle.underline,
          linethrough: this.formTextStyle.linethrough,
          editable: true,
          textAlign: this.formTextStyle.textAlign,
          originX: this.formTextStyle.textAlign,
          originY: 'center'
        });

        (textbox as any).name = this.formTextStyle.name;
        this.canvas.add(textbox);
        this.formTextStyle.name = this.generateAutoName('textbox');
        //    this.canvas.setActiveObject(textbox);
        this.canvas.renderAll();

        return;
      }

      // --- IMAGE ---
      if (this.mode === 'image') {
        this.saveHistory();
        //      const pointer = this.canvas.getPointer(event.e);

        if (!this.selectedImageFile) {
          this.snackbar.show('Nincs kép kiválasztva!', 'error');
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;

          const htmlImage = new Image();
          htmlImage.onload = () => {
            const fabricImage = new fabric.Image(htmlImage, {
              left: pointer.x,
              top: pointer.y,
              originX: 'center',
              originY: 'center',
              scaleX: 1.0,
              scaleY: 1.0
            });

            (fabricImage as any).name = this.formImageStyle.name;
            this.canvas.add(fabricImage);
            this.formImageStyle.name = this.generateAutoName('image');
            //   this.canvas.setActiveObject(fabricImage);
            this.canvas.renderAll();

          };

          htmlImage.onerror = (e) => {
            console.error('Nem sikerült betölteni a képet:', e);
          };

          htmlImage.src = dataUrl;
        };
        reader.readAsDataURL(this.selectedImageFile!);

        return;
      }

      // --- TEMPLATE ---
      if (this.mode === 'template') {
        //  const pointer = this.canvas.getPointer(event.e);
        this.placeTemplateAt(pointer);
      }

      // --- ARC ---
      if (this.mode === 'arc') {
        //    const pointer = this.canvas.getPointer(event.e);
        this.arcPoints.push(pointer);

        if (this.arcPoints.length === 3) {
          const [center, start, anglePoint] = this.arcPoints;

          const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
          const endAngle = Math.atan2(anglePoint.y - center.y, anglePoint.x - center.x);

          let angleDeg = (endAngle - startAngle) * (180 / Math.PI);
          if (angleDeg <= 0) angleDeg += 360;

          const pathStr = this.createArcPathFromAngle(center, start, angleDeg);
          const arc = new fabric.Path(pathStr, {
            stroke: this.formArcStyle.stroke,
            strokeWidth: this.formArcStyle.strokeWidth,
            strokeDashArray: this.formArcStyle.strokeDashArray === 'solid' ? [0, 0] :
              this.formArcStyle.strokeDashArray === 'dashed' ? [5, 5] :
                [2, 2],
            fill: ''
          });

          arc.set({ name: this.generateAutoName('arc') });
          this.canvas.add(arc);

          // előnézeti vonalak törlése
          if (this.arcRadiusPreview) {
            this.canvas.remove(this.arcRadiusPreview);
            this.arcRadiusPreview = null;
          }
          if (this.arcPathPreview) {
            this.canvas.remove(this.arcPathPreview);
            this.arcPathPreview = null;
          }

          this.arcPoints = [];
          this.canvas.renderAll();
        }

        return;
      }

    });

    this.canvas.on('mouse:move', (event) => {
      const evt = event.e as MouseEvent;
      // --- CURSOR ---
      if (this.isPanning) {
        this.canvas.upperCanvasEl.style.cursor = 'grabbing';
      } else {
        this.canvas.upperCanvasEl.style.cursor = this.mode === 'select' ? 'default' : 'crosshair';
      }

      // --- PANNING ---
      if (this.isPanning && this.lastPanPoint) {
        const newPoint = new fabric.Point(evt.clientX, evt.clientY);
        const delta = newPoint.subtract(this.lastPanPoint);

        this.canvas.relativePan(delta);
        this.lastPanPoint = newPoint;

        evt.preventDefault();
        return;
      }

      const rawPointer = this.canvas.getPointer(event.e);
      const pointer = this.getSnappedPointer(rawPointer);

      // --- SELECT ---
      if (this.mode === 'select') {
        //   const pointer = this.canvas.getPointer(event.e);
        let foundNearPoint = false;

        const threshold = 6; // px

        this.canvas.getObjects().forEach(obj => {

          if (obj.type === 'polygon' || obj.type === 'polyline') {
            const points = (obj as fabric.Polygon | fabric.Polyline).points;
            if (!points) return;

            const matrix = obj.calcTransformMatrix();

            for (const pt of points) {
              const transformed = fabric.util.transformPoint(
                new fabric.Point(
                  pt.x - (obj as fabric.Polygon | fabric.Polyline).pathOffset.x,
                  pt.y - (obj as fabric.Polygon | fabric.Polyline).pathOffset.y
                ),

                matrix
              );

              const dx = transformed.x - pointer.x;
              const dy = transformed.y - pointer.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < threshold) {
                this.showVertexMarker(transformed.x, transformed.y);
                foundNearPoint = true;
              }
            }
          }

          // téglalap sarkok detektálása (opcionális)
          if (obj.type === 'rect') {
            const corners = [
              { x: obj.left!, y: obj.top! },
              { x: obj.left! + obj.width!, y: obj.top! },
              { x: obj.left! + obj.width!, y: obj.top! + obj.height! },
              { x: obj.left!, y: obj.top! + obj.height! }
            ];

            for (const pt of corners) {
              const dx = pt.x - pointer.x;
              const dy = pt.y - pointer.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < threshold) {
                this.showVertexMarker(pt.x, pt.y);
                foundNearPoint = true;
              }
            }
          }

          // --- LINE végpontok ---
          if (obj.type === 'line') {
            const line = obj as fabric.Line;
            const matrix = line.calcTransformMatrix();
            const p1 = fabric.util.transformPoint(new fabric.Point(line.x1!, line.y1!), matrix);
            const p2 = fabric.util.transformPoint(new fabric.Point(line.x2!, line.y2!), matrix);

            const dist1 = Math.hypot(pointer.x - p1.x, pointer.y - p1.y);
            const dist2 = Math.hypot(pointer.x - p2.x, pointer.y - p2.y);

            if (dist1 < threshold) {
              this.showVertexMarker(p1.x, p1.y);
              foundNearPoint = true;
            }
            if (dist2 < threshold) {
              this.showVertexMarker(p2.x, p2.y);
              foundNearPoint = true;
            }
          }

          // --- CIRCLE középpont ---
          if (obj.type === 'circle') {
            const circle = obj as fabric.Circle;
            const center = circle.getCenterPoint();
            const dx = pointer.x - center.x;
            const dy = pointer.y - center.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (Math.abs(dist - circle.radius! * obj.scaleX!) < threshold) {
              this.showVertexMarker(center.x, center.y);
              foundNearPoint = true;
            }
          }

          // --- TEXT középpont ---
          if (obj.type === 'textbox') {
            const center = obj.getCenterPoint();
            const dx = pointer.x - center.x;
            const dy = pointer.y - center.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < threshold) {
              this.showVertexMarker(center.x, center.y);
              foundNearPoint = true;
            }
          }

          // --- IMAGE sarkok (mint rect) ---
          if (obj.type === 'image') {
            const bounds = obj.getBoundingRect();
            const corners = [
              { x: bounds.left, y: bounds.top },
              { x: bounds.left + bounds.width, y: bounds.top },
              { x: bounds.left + bounds.width, y: bounds.top + bounds.height },
              { x: bounds.left, y: bounds.top + bounds.height }
            ];

            for (const pt of corners) {
              const dx = pt.x - pointer.x;
              const dy = pt.y - pointer.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < threshold) {
                this.showVertexMarker(pointer.x, pointer.y);
                foundNearPoint = true;
              }
            }
          }

        });

        if (!foundNearPoint) {
          this.removeVertexMarker();
        }
        this.canvas.setCursor(foundNearPoint ? 'pointer' : 'default');
        this.canvas.renderAll();
        return; // ne fusson tovább más cursor vagy panning logika
      }

      // --- LINE ---
      if (this.mode === 'line' && this.lineStartPoint) {
        if (this.linePreview) {
          this.linePreview.set({ x2: pointer.x, y2: pointer.y });
        } else {
          this.linePreview = new fabric.Line(
            [this.lineStartPoint.x, this.lineStartPoint.y, pointer.x, pointer.y],
            {
              stroke: 'gray',
              strokeDashArray: [5, 5],
              strokeWidth: 1,
              selectable: false,
              evented: false
            }
          );
          this.canvas.add(this.linePreview);
        }

        if (this.mode === 'line' && this.lineStartPoint && this.linePreview) {
          const dxPx = pointer.x - this.lineStartPoint.x;
          const dyPx = pointer.y - this.lineStartPoint.y;

          const dxM = dxPx / this.gridSpacing;
          const dyM = dyPx / this.gridSpacing;
          const rM = Math.sqrt(dxM * dxM + dyM * dyM);

          const hint = `x: ${dxM.toFixed(2)} m\n` +
            `y: ${dyM.toFixed(2)} m\n` +
            `r: ${rM.toFixed(2)} m`;

          if (!this.lineHintText) {
            this.lineHintText = new fabric.Text(hint, {
              left: pointer.x + 10,
              top: pointer.y + 10,
              fontSize: 20,
              fill: 'black',
              backgroundColor: 'rgba(145, 175, 214, 0.2)',
              selectable: false,
              evented: false,
              excludeFromExport: true
            });
            this.canvas.add(this.lineHintText);
          } else {
            this.lineHintText.set({
              text: hint,
              left: pointer.x + 10,
              top: pointer.y + 10
            });
          }

          this.canvas.renderAll();
        }

        this.canvas.renderAll();
        return;
      }

      // --- RECTANGLE ---
      if (this.mode === 'rect' && this.rectStartPoint) {
        const rectData = this.getRectDimensions(this.rectStartPoint, pointer);
        if (this.rectPreview) {
          this.rectPreview.set(rectData);
        } else {
          this.rectPreview = new fabric.Rect({
            ...rectData,
            stroke: 'gray',
            strokeDashArray: [5, 5],
            fill: 'rgba(0,0,0,0)',
            selectable: false,
            evented: false
          });
          this.canvas.add(this.rectPreview);
        }

        if (this.rectStartPoint && this.rectPreview) {
          const dxPx = pointer.x - this.rectStartPoint.x;
          const dyPx = pointer.y - this.rectStartPoint.y;

          const dxM = Math.abs(dxPx / this.gridSpacing);
          const dyM = Math.abs(dyPx / this.gridSpacing);
          const areaM2 = dxM * dyM;

          const hint = `x: ${dxM.toFixed(2)} m\n` +
            `y: ${dyM.toFixed(2)} m\n` +
            `T: ${areaM2.toFixed(2)} m²`;

          if (!this.rectHintText) {
            this.rectHintText = new fabric.Text(hint, {
              left: pointer.x + 10,
              top: pointer.y + 10,
              fontSize: 20,
              fill: 'black',
              backgroundColor: 'rgba(145, 175, 214, 0.2)',
              selectable: false,
              evented: false,
              excludeFromExport: true
            });
            this.canvas.add(this.rectHintText);
          } else {
            this.rectHintText.set({
              text: hint,
              left: pointer.x + 10,
              top: pointer.y + 10,
            });
          }

          this.canvas.renderAll();

        }

        this.canvas.renderAll();
        return;
      }

      // --- ELLIPSE ---
      if (this.mode === 'ellipse' && this.rectStartPoint) {
        const p1 = this.rectStartPoint;
        const p2 = rawPointer;

        let cx: number, cy: number;
        let rx: number, ry: number;
        this.ellipseCentered = evt.altKey;

        if (evt.altKey) {
          // ALT → kezdőpont a középpont
          cx = p1.x;
          cy = p1.y;
          rx = Math.abs(p2.x - p1.x);
          ry = Math.abs(p2.y - p1.y);
        } else {
          // normál → kezdőpont az egyik sarok
          rx = Math.abs(p2.x - p1.x) / 2;
          ry = Math.abs(p2.y - p1.y) / 2;
          cx = (p1.x + p2.x) / 2;
          cy = (p1.y + p2.y) / 2;
        }

        // SHIFT → szabályos kör
        if (this.isShiftDown) {
          const r = Math.min(rx, ry);
          rx = ry = r;
        }


        if (this.ellipsePreview) {
          this.ellipsePreview.set({ left: cx - rx, top: cy - ry, rx, ry });
        } else {
          this.ellipsePreview = new fabric.Ellipse({
            left: cx - rx,
            top: cy - ry,
            originX: 'left',
            originY: 'top',
            rx,
            ry,
            fill: 'rgba(0,0,0,0)',
            stroke: 'gray',
            strokeDashArray: [5, 5],
            strokeWidth: 1,
            selectable: false,
            evented: false
          });
          this.canvas.add(this.ellipsePreview);
        }

        // --- ÚJ: Hint generálás ---
        const rxM = rx / this.gridSpacing;
        const ryM = ry / this.gridSpacing;
        const xM = rxM * 2;
        const yM = ryM * 2;
        const rM = (rxM + ryM) / 2;
        const areaM2 = Math.PI * rxM * ryM;

        const hint = `x: ${xM.toFixed(2)} m\n` +
          `y: ${yM.toFixed(2)} m\n` +
          `r: ${rM.toFixed(2)} m\n` +
          `T: ${areaM2.toFixed(2)} m²`;

        if (!this.ellipseHintText) {
          this.ellipseHintText = new fabric.Text(hint, {
            left: p2.x + 10,
            top: p2.y + 10,
            fontSize: 20,
            fill: 'black',
            backgroundColor: 'rgba(145, 175, 214, 0.2)',
            selectable: false,
            evented: false,
            excludeFromExport: true
          });
          this.canvas.add(this.ellipseHintText);
        } else {
          this.ellipseHintText.set({
            text: hint,
            left: p2.x + 10,
            top: p2.y + 10
          });
        }

        this.canvas.renderAll();
        return;
      }

      // --- POLYGON és POLYLINE ---
      if ((this.mode === 'polygon' || this.mode === 'polyline') && this.points.length > 0) {

        const lastPoint = this.points[this.points.length - 1];

        if (this.previewLine) {
          this.previewLine.set({ x2: pointer.x, y2: pointer.y });
          this.canvas.renderAll();
        } else {
          this.previewLine = new fabric.Line(
            [lastPoint.x, lastPoint.y, pointer.x, pointer.y],
            {
              stroke: 'gray',
              strokeDashArray: [5, 5],
              strokeWidth: 1,
              selectable: false,
              evented: false
            }
          );

          this.canvas.add(this.previewLine);
        }

        // --- Hint szöveg generálás ---
        const dxPx = pointer.x - lastPoint.x;
        const dyPx = pointer.y - lastPoint.y;
        const dxM = dxPx / this.gridSpacing;
        const dyM = dyPx / this.gridSpacing;
        const segmentLengthM = Math.sqrt(dxM * dxM + dyM * dyM);

        // Teljes hossz kiszámítás (mindkét módban)
        let totalLengthM = 0;
        for (let i = 1; i < this.points.length; i++) {
          const a = this.points[i - 1];
          const b = this.points[i];
          const dx = (b.x - a.x) / this.gridSpacing;
          const dy = (b.y - a.y) / this.gridSpacing;
          totalLengthM += Math.sqrt(dx * dx + dy * dy);
        }
        totalLengthM += segmentLengthM;

        // Polygon terület (ha polygon módban vagyunk)
        let areaM2 = 0;
        if (this.mode === 'polygon') {
          const polyPoints = [...this.points, { x: pointer.x, y: pointer.y }];
          const n = polyPoints.length;
          let sum = 0;
          for (let i = 0; i < n; i++) {
            const p1 = polyPoints[i];
            const p2 = polyPoints[(i + 1) % n];
            sum += (p1.x * p2.y - p2.x * p1.y);
          }
          areaM2 = Math.abs(sum) / 2 / (this.gridSpacing ** 2);
        }

        // Hint szöveg összeállítása
        let hintText = `x: ${dxM.toFixed(2)} m\n` +
          `y: ${dyM.toFixed(2)} m\n` +
          `r: ${segmentLengthM.toFixed(2)} m\n` +
          `H: ${totalLengthM.toFixed(2)} m`;

        if (this.mode === 'polygon') {
          hintText += `\nT: ${areaM2.toFixed(2)} m²`;
        }

        if (!this.polylineHintText) {
          this.polylineHintText = new fabric.Text(hintText, {
            left: pointer.x + 10,
            top: pointer.y + 10,
            fontSize: 20,
            fill: 'black',
            backgroundColor: 'rgba(145, 175, 214, 0.2)',
            selectable: false,
            evented: false,
            excludeFromExport: true
          });
          this.canvas.add(this.polylineHintText);
        } else {
          this.polylineHintText.set({
            text: hintText,
            left: pointer.x + 10,
            top: pointer.y + 10
          });
        }

        this.canvas.renderAll();

      }

      // --- ARC ---
      if (this.mode === 'arc' && this.arcPoints.length === 2) {
        const [center, start] = this.arcPoints;
        const pointer = this.canvas.getPointer(event.e);

        const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
        const endAngle = Math.atan2(pointer.y - center.y, pointer.x - center.x);

        let angleDeg = (endAngle - startAngle) * (180 / Math.PI);
        if (angleDeg <= 0) angleDeg += 360;

        const arcPath = this.createArcPathFromAngle(center, start, angleDeg);

        if (this.arcPathPreview) {
          this.arcPathPreview.set({ path: new fabric.Path(arcPath).path });
        } else {
          this.arcPathPreview = new fabric.Path(arcPath, {
            stroke: 'gray',
            strokeWidth: 1,
            strokeDashArray: [5, 5],
            fill: '',
            selectable: false,
            evented: false,
            excludeFromExport: true
          });
          this.canvas.add(this.arcPathPreview);
        }

        this.canvas.renderAll();
        return;
      }

      if (this.mode === 'arc' && this.arcPoints.length === 1) {
        const center = this.arcPoints[0];
        const pointer = this.canvas.getPointer(event.e);

        if (this.arcRadiusPreview) {
          this.arcRadiusPreview.set({ x1: center.x, y1: center.y, x2: pointer.x, y2: pointer.y });
        } else {
          this.arcRadiusPreview = new fabric.Line(
            [center.x, center.y, pointer.x, pointer.y],
            {
              stroke: 'gray',
              strokeDashArray: [5, 5],
              strokeWidth: 1,
              selectable: false,
              evented: false,
              excludeFromExport: true
            }
          );
          this.canvas.add(this.arcRadiusPreview);
        }

        this.canvas.renderAll();
        return;
      }

    });

    this.canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = this.canvas.getZoom();

      // Skála változtatása
      zoom *= 0.999 ** delta;

      // Zoom korlátok
      zoom = Math.max(0.1, Math.min(zoom, 100));

      const pointer = this.canvas.getPointer(opt.e);

      const point = new fabric.Point(opt.e.offsetX, opt.e.offsetY);
      this.canvas.zoomToPoint(point, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    this.canvas.on('mouse:up', () => {
      //   this.isPanning = false;
      //   this.lastPanPoint = null;
    });

    this.canvas.on('object:moving', (e) => {
      const obj = e.target;

      if (!obj) return;

      if ((obj as any).areaLabel && (obj as any).showAreaLabel) {
        const label = (obj as any).areaLabel as fabric.Textbox;
        label.left = obj.left! + obj.width! / 2;
        label.top = obj.top! + obj.height! / 2;
        label.setCoords();
      }

      // grid snap (ha van)
      if (this.gridSnapEnabled) {
        const spacing = this.gridSpacing;
        obj.set({
          left: Math.round(obj.left! / spacing) * spacing,
          top: Math.round(obj.top! / spacing) * spacing
        });
        obj.setCoords();
      }
    });

    this.canvas.on('mouse:dblclick', (e) => {
      const target = e.target;
      if (!target) return;

      if (target.type === 'polyline' || target.type === 'polygon') {
        this.enableVertexEditing(target as fabric.Polyline | fabric.Polygon);
        this.canvas.discardActiveObject();
        this.canvas.requestRenderAll();
      }
    });

    this.canvas.on('object:added', () => {
      //   this.saveHistory();
      this.refreshObjectList()
    });

    this.canvas.on('object:removed', (e) => {
      const removed = e.target;
      if (!removed) return;

      // ha a törölt objektum rect/ellipse/polygon és van hozzá kapcsolt label
      const type = removed.type;
      if (type === 'rect' || type === 'ellipse' || type === 'polygon') {
        const areaLabel = (removed as any).areaLabel as fabric.Textbox;
        if (areaLabel && this.canvas.getObjects().includes(areaLabel)) {
          this.canvas.remove(areaLabel);
        }
      }

      this.refreshObjectList();
    });


    this.canvas.on('object:modified', () => {
      //    this.saveHistory();
      this.refreshObjectList()
    });

    this.canvas.on('selection:created', (e) => {
      this.onSelectionChanged(e);
      this.refreshObjectList();
    });

    this.canvas.on('selection:updated', (e) => {
      this.onSelectionChanged(e);
      this.refreshObjectList();
    });

    this.canvas.on('selection:cleared', () => {
      this.selectedTextObject = null;
      this.selectedLineObject = null;
      this.selectedPolylineObject = null;
      this.selectedRectObject = null;
      this.selectedEllipseObject = null;
      this.selectedPolygonObject = null;
      this.selectedImageObject = null;
      this.selectedArcObject = null;
      this.selectedTemplateObject = null;
      this.selectedRoomId = null;
      this.activeTabIndex = 1;
      this.refreshObjectList();
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        this.copy();
      } else if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        this.paste();
      } else if (e.key === 'Backspace') {
        this.handleBackspaceDuringDrawing();
      }
    });

    this.drawInfiniteGrid();

    this.updateSnapPoints();

  }

  createArcPathFromAngle(
    center: { x: number; y: number },
    start: { x: number; y: number },
    angleDegrees: number
  ): string {
    const r = Math.sqrt((start.x - center.x) ** 2 + (start.y - center.y) ** 2);

    const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
    const endAngle = startAngle + (angleDegrees * Math.PI) / 180;

    const endX = center.x + r * Math.cos(endAngle);
    const endY = center.y + r * Math.sin(endAngle);

    const largeArcFlag = angleDegrees > 180 ? 1 : 0;
    const sweepFlag = 1; // mindig pozitív irányba

    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
  }

  refreshObjectList(): void {
    this.objectList = this.canvas.getObjects().filter(obj => !obj.excludeFromExport);
    this.updateSnapPoints();

  }

  toggleVisibility(obj: fabric.Object): void {
    this.saveHistory();
    obj.visible = !obj.visible;

    if ((obj as any).areaLabel) {
      const label = (obj as any).areaLabel as fabric.Textbox;
      label.visible = obj.visible;
      label.excludeFromExport = false;
      (obj as any).showAreaLabel = obj.visible;
    }

    this.canvas.renderAll();
  }

  toggleLock(obj: fabric.Object): void {
    this.saveHistory();

    const isLocked = obj.lockMovementX || !obj.selectable;

    if (isLocked) {
      // UNLOCK
      obj.set({
        lockMovementX: false,
        lockMovementY: false,
        lockScalingX: false,
        lockScalingY: false,
        lockRotation: false,
        selectable: true,
        evented: true
      });

      // Textbox esetén külön kell engedélyezni a szerkeszthetőséget is
      if (obj.type === 'textbox') {
        (obj as fabric.Textbox).editable = true;
      }

    } else {
      // LOCK
      obj.set({
        lockMovementX: true,
        lockMovementY: true,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: true,
        selectable: false,
        evented: false
      });

      if (obj.type === 'textbox') {
        (obj as fabric.Textbox).editable = false;
      }
    }

    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  getObjectLabel(obj: any): string {
    if (obj.name === undefined)
      return obj.type
    else
      return obj.name;
  }

  private onSelectionChanged(e: Partial<fabric.TEvent<fabric.TPointerEvent>>) {

    const activeObj = this.canvas.getActiveObject();

    if ((activeObj as any)?.roomId)
      this.selectedRoomId = (activeObj as any)?.roomId
    else
      this.selectedRoomId = null;

    if (activeObj && activeObj.type !== 'select') {
      this.activeTabIndex = 0;
    }

    if (activeObj && activeObj.type === 'select') {
      this.activeTabIndex = 1;
    }

    if (activeObj && activeObj.type === 'textbox') {
      this.selectedTextObject = activeObj as fabric.Textbox;
      // Szinkronizálás a formTextStyle-lal
      this.formTextStyle.name = (activeObj as any).name;
      this.formTextStyle.text = (activeObj as any).text;
      this.formTextStyle.fill = this.selectedTextObject.fill as string;
      this.formTextStyle.fontSize = this.selectedTextObject.fontSize ?? 20;
      this.formTextStyle.fontFamily = this.selectedTextObject.fontFamily ?? 'Arial';
      this.formTextStyle.fontWeight = this.selectedTextObject.fontWeight === 'bold' ? 'bold' : 'normal';
      this.formTextStyle.fontStyle = this.selectedTextObject.fontStyle === 'italic' ? 'italic' : 'normal';
      this.formTextStyle.underline = this.selectedTextObject.underline ?? false;
      this.formTextStyle.linethrough = this.selectedTextObject.linethrough ?? false;
      this.formTextStyle.textAlign = (this.selectedTextObject.textAlign ?? 'left') as 'left' | 'center' | 'right';

    } else {
      this.selectedTextObject = null;
    }

    if (activeObj && activeObj.type === 'line') {
      this.selectedLineObject = activeObj as fabric.Line;
      this.formLineStyle.stroke = this.parseColorToHex(this.selectedLineObject.stroke as string);
      this.formLineStyle.strokeWidth = this.selectedLineObject.strokeWidth ?? 2;
      this.formLineStyle.name = (activeObj as any).name;
      const dashArray = this.selectedLineObject.strokeDashArray;

      if (!dashArray || dashArray.length === 0) {
        this.formLineStyle.strokeDashArray = 'solid';
      } else if (dashArray[0] === 0 && dashArray[1] === 0) {
        this.formLineStyle.strokeDashArray = 'solid';
      } else if (dashArray[0] === 5 && dashArray[1] === 5) {
        this.formLineStyle.strokeDashArray = 'dashed';
      } else if (dashArray[0] === 2 && dashArray[1] === 2) {
        this.formLineStyle.strokeDashArray = 'dotted';
      }
    } else {
      this.selectedLineObject = null;
    }

    if (activeObj && activeObj.type === 'polyline') {
      this.selectedPolylineObject = activeObj as fabric.Polyline;
      this.formPolylineStyle.name = (activeObj as any).name;
      this.formPolylineStyle.stroke = this.parseColorToHex(this.selectedPolylineObject.stroke as string);
      this.formPolylineStyle.strokeWidth = this.selectedPolylineObject.strokeWidth ?? 2;

      const dashArray = this.selectedPolylineObject.strokeDashArray;
      if (!dashArray || dashArray.length === 0) {
        this.formPolylineStyle.strokeDashArray = 'solid';
      } else if (dashArray[0] === 0 && dashArray[1] === 0) {
        this.formPolylineStyle.strokeDashArray = 'solid';
      } else if (dashArray[0] === 5 && dashArray[1] === 5) {
        this.formPolylineStyle.strokeDashArray = 'dashed';
      } else if (dashArray[0] === 2 && dashArray[1] === 2) {
        this.formPolylineStyle.strokeDashArray = 'dotted';
      }
    } else {
      this.selectedPolylineObject = null;
    }

    if (activeObj && activeObj.type === 'rect') {
      this.selectedRectObject = activeObj as fabric.Rect;
      this.formRectStyle.stroke = this.parseColorToHex(this.selectedRectObject.stroke as string);
      this.formRectStyle.strokeWidth = this.selectedRectObject.strokeWidth ?? 2;
      this.formRectStyle.name = (activeObj as any).name;

      // Kitöltés adatok: ha mentettünk pattern-t
      const savedPattern = (activeObj as any).fillPattern ?? 'none';
      this.formRectStyle.fillPattern = savedPattern;

      this.formRectStyle.fillPatternSize = (activeObj as any).fillPatternSize ?? 10;

      if (savedPattern === 'none') {
        // sima szín
        const { hex, opacity } = this.extractFillAndOpacity(activeObj.fill as string);
        this.formRectStyle.fill = hex;
        this.formRectStyle.fillOpacity = opacity;
      } else {
        // Pattern esetén a mentett szín és opacity is ott lehet az objektumon
        this.formRectStyle.fill = (activeObj as any).fillColor ?? '#cccccc';
        this.formRectStyle.fillOpacity = (activeObj as any).fillOpacity ?? 100;
      }

      (this.selectedRectObject as any).showAreaLabel = (activeObj as any).showAreaLabel ?? true;

      // vonal stílus
      const dashArray = this.selectedRectObject.strokeDashArray;
      if (!dashArray || dashArray.length === 0) {
        this.formRectStyle.strokeDashArray = 'solid';
      } else if (dashArray[0] === 5 && dashArray[1] === 5) {
        this.formRectStyle.strokeDashArray = 'dashed';
      } else if (dashArray[0] === 2 && dashArray[1] === 2) {
        this.formRectStyle.strokeDashArray = 'dotted';
      } else {
        this.formRectStyle.strokeDashArray = 'solid';
      }
    } else {
      this.selectedRectObject = null;
    }

    if (activeObj && activeObj.type === 'ellipse') {
      this.selectedEllipseObject = activeObj as fabric.Ellipse;
      this.formEllipseStyle.name = (activeObj as any).name;
      this.formEllipseStyle.stroke = this.parseColorToHex(this.selectedEllipseObject.stroke as string);
      this.formEllipseStyle.strokeWidth = this.selectedEllipseObject.strokeWidth ?? 2;

      // pattern kezelés
      const savedPattern = (activeObj as any).fillPattern ?? 'none';
      this.formEllipseStyle.fillPattern = savedPattern;
      this.formEllipseStyle.fillPatternSize = (activeObj as any).fillPatternSize ?? 10;

      if (savedPattern === 'none') {
        // sima szín
        const { hex, opacity } = this.extractFillAndOpacity(activeObj.fill as string);
        this.formEllipseStyle.fill = hex;
        this.formEllipseStyle.fillOpacity = opacity;
      } else {
        // Pattern esetén a mentett szín és opacity
        this.formEllipseStyle.fill = (activeObj as any).fillColor ?? '#cccccc';
        this.formEllipseStyle.fillOpacity = (activeObj as any).fillOpacity ?? 100;
      }

      const dashArray = this.selectedEllipseObject.strokeDashArray;
      if (!dashArray || dashArray.length === 0) {
        this.formEllipseStyle.strokeDashArray = 'solid';
      } else if (dashArray[0] === 5 && dashArray[1] === 5) {
        this.formEllipseStyle.strokeDashArray = 'dashed';
      } else if (dashArray[0] === 2 && dashArray[1] === 2) {
        this.formEllipseStyle.strokeDashArray = 'dotted';
      } else {
        this.formEllipseStyle.strokeDashArray = 'solid';
      }
    } else {
      this.selectedEllipseObject = null;
    }

    if (activeObj && activeObj.type === 'polygon') {
      this.selectedPolygonObject = activeObj as fabric.Polygon;
      this.formPolygonStyle.name = (activeObj as any).name;

      // pattern kezelés
      const savedPattern = (activeObj as any).fillPattern ?? 'none';
      this.formPolygonStyle.fillPattern = savedPattern;
      this.formPolygonStyle.fillPatternSize = (activeObj as any).fillPatternSize ?? 10;

      if (savedPattern === 'none') {
        const { hex, opacity } = this.extractFillAndOpacity(activeObj.fill as string);
        this.formPolygonStyle.fill = hex;
        this.formPolygonStyle.fillOpacity = opacity;
      } else {
        this.formPolygonStyle.fill = (activeObj as any).fillColor ?? '#cccccc';
        this.formPolygonStyle.fillOpacity = (activeObj as any).fillOpacity ?? 100;
      }

      this.formPolygonStyle.stroke = this.parseColorToHex(this.selectedPolygonObject.stroke as string);
      this.formPolygonStyle.strokeWidth = this.selectedPolygonObject.strokeWidth ?? 2;

      const dashArray = this.selectedPolygonObject.strokeDashArray;
      if (!dashArray || dashArray.length === 0) {
        this.formPolygonStyle.strokeDashArray = 'solid';
      } else if (dashArray[0] === 5 && dashArray[1] === 5) {
        this.formPolygonStyle.strokeDashArray = 'dashed';
      } else if (dashArray[0] === 2 && dashArray[1] === 2) {
        this.formPolygonStyle.strokeDashArray = 'dotted';
      } else {
        this.formPolygonStyle.strokeDashArray = 'solid';
      }

      (this.formPolygonStyle as any).showAreaLabel = (activeObj as any).showAreaLabel ?? true;
    } else {
      this.selectedPolygonObject = null;
    }

    if (activeObj && activeObj.type === 'image') {
      this.selectedImageObject = activeObj as fabric.Image;
      this.formImageStyle.name = (activeObj as any).name;
      this.formImageStyle.opacity = this.selectedImageObject.opacity ?? 1;
      this.formImageStyle.scaleX = this.selectedImageObject.scaleX ?? 1;
      this.formImageStyle.scaleY = this.selectedImageObject.scaleY ?? 1;
      this.formImageStyle.angle = this.selectedImageObject.angle ?? 0;
    } else {
      this.selectedImageObject = null;
    }

    if (activeObj && activeObj.type === 'path') {
      this.selectedArcObject = activeObj as fabric.Path;
      this.formArcStyle.name = (activeObj as any).name;
      this.formArcStyle.stroke = this.parseColorToHex(activeObj.stroke as string);
      this.formArcStyle.strokeWidth = activeObj.strokeWidth ?? 2;

      const dashArray = activeObj.strokeDashArray;
      if (!dashArray || dashArray.length === 0) {
        this.formArcStyle.strokeDashArray = 'solid';
      } else if (dashArray[0] === 5 && dashArray[1] === 5) {
        this.formArcStyle.strokeDashArray = 'dashed';
      } else if (dashArray[0] === 2 && dashArray[1] === 2) {
        this.formArcStyle.strokeDashArray = 'dotted';
      }
    } else {
      this.selectedArcObject = null;
    }

    if (activeObj && activeObj.type === 'group') {
      this.selectedTemplateObject = activeObj as any;

      this.formTemplateStyle.name = (activeObj as any).name ?? '';
      this.formTemplateStyle.templateName = (activeObj as any).templateName ?? '';
      this.formTemplateStyle.opacity = activeObj.opacity ?? 1;
      this.formTemplateStyle.scaleX = activeObj.scaleX ?? 1;
      this.formTemplateStyle.scaleY = activeObj.scaleY ?? 1;
      this.formTemplateStyle.angle = activeObj.angle ?? 0;
    } else {
      this.selectedTemplateObject = null;
    }


  }

  private parseColorToHex(color: string | undefined | null): string {
    if (!color) return '#000000';

    if (color.startsWith('rgba') || color.startsWith('rgb')) {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const [_, r, g, b] = match;
        return this.rgbToHex(parseInt(r), parseInt(g), parseInt(b));
      }
    }

    return color; // ha már hex vagy érvényes CSS név
  }

  private extractFillAndOpacity(fill: string | undefined): { hex: string; opacity: number } {
    if (!fill) return { hex: '#cccccc', opacity: 100 };

    if (fill.startsWith('rgba')) {
      const match = fill.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
      if (match) {
        const [_, r, g, b, a] = match;
        return {
          hex: this.rgbToHex(+r, +g, +b),
          opacity: Math.round(+a * 100)
        };
      }
    }

    if (fill.startsWith('rgb')) {
      const match = fill.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const [_, r, g, b] = match;
        return {
          hex: this.rgbToHex(+r, +g, +b),
          opacity: 100
        };
      }
    }

    return { hex: fill, opacity: 100 };
  }

  applyTextStyle(): void {
    this.saveHistory();
    const style = this.formTextStyle;
    this.selectedTextObjects.forEach(obj => {
      obj.set({
        name: this.formTextStyle.name,
        text: this.formTextStyle.text,
        fill: style.fill,
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
        textAlign: style.textAlign,
        underline: style.underline,
        linethrough: style.linethrough
      });
      obj.setCoords();
    });
    this.canvas.renderAll();
  }

  applyLineStyle(): void {
    this.saveHistory();
    const style = this.formLineStyle;

    this.selectedLineObjects.forEach(obj => {
      obj.set({
        name: style.name,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        strokeDashArray: style.strokeDashArray === 'solid' ? [] : style.strokeDashArray === 'dashed' ? [5, 5] : [2, 2]
      });

    });
    this.canvas.renderAll();

  }

  applyPolylineStyle(): void {
    this.saveHistory();
    const style = this.formPolylineStyle;

    this.selectedPolyLineObjects.forEach(obj => {
      obj.set({
        name: style.name,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        strokeDashArray: style.strokeDashArray === 'solid' ? [] : style.strokeDashArray === 'dashed' ? [5, 5] : [2, 2]
      });

    });
    this.canvas.renderAll();

  }

  applyRectStyle(): void {
    this.saveHistory();
    const style = this.formRectStyle;

    this.selectedRectObjects.forEach(obj => {
      let fill: string | fabric.Pattern;

      if (style.fillPattern !== 'none') {
        const patternCanvas = this.createPatternCanvas(style.fillPattern, style.fill, style.fillOpacity, style.fillPatternSize);
        fill = new fabric.Pattern({
          source: patternCanvas,
          repeat: 'repeat'
        });
      } else {
        const alpha = style.fillOpacity / 100;
        fill = this.hexToRgba(style.fill, alpha);
      }

      obj.set({
        name: style.name,
        stroke: style.stroke,
        fill: fill,
        fillPattern: style.fillPattern,
        fillPatternSize: style.fillPatternSize,
        fillColor: style.fill,
        fillOpacity: style.fillOpacity,
        strokeWidth: style.strokeWidth,
        strokeDashArray: style.strokeDashArray === 'solid' ? [] : style.strokeDashArray === 'dashed' ? [5, 5] : [2, 2]
      });
    });

    this.canvas.renderAll();

  }

  applyEllipseStyle(): void {
    this.saveHistory();
    const style = this.formEllipseStyle;

    this.selectedEllipseObjects.forEach(obj => {
      let fill: string | fabric.Pattern;

      if (style.fillPattern !== 'none') {
        const patternCanvas = this.createPatternCanvas(
          style.fillPattern,
          style.fill,
          style.fillOpacity,
          style.fillPatternSize
        );
        fill = new fabric.Pattern({
          source: patternCanvas,
          repeat: 'repeat'
        });
      } else {
        const alpha = style.fillOpacity / 100;
        fill = this.hexToRgba(style.fill, alpha);
      }

      obj.set({
        name: style.name,
        stroke: style.stroke,
        fill: fill,
        strokeWidth: style.strokeWidth,
        strokeDashArray:
          style.strokeDashArray === 'solid'
            ? []
            : style.strokeDashArray === 'dashed'
              ? [5, 5]
              : [2, 2]
      });

      // extra property-k mentése
      (obj as any).fillPattern = style.fillPattern;
      (obj as any).fillPatternSize = style.fillPatternSize;
      (obj as any).fillColor = style.fill;
      (obj as any).fillOpacity = style.fillOpacity;
    });

    this.canvas.renderAll();
  }

  applyPolygonStyle(): void {
    this.saveHistory();
    const style = this.formPolygonStyle;

    this.selectedPolygonObjects.forEach(obj => {
      let fill: string | fabric.Pattern;

      if (style.fillPattern !== 'none') {
        const patternCanvas = this.createPatternCanvas(
          style.fillPattern,
          style.fill,
          style.fillOpacity,
          style.fillPatternSize
        );
        fill = new fabric.Pattern({
          source: patternCanvas,
          repeat: 'repeat'
        });
      } else {
        const alpha = style.fillOpacity / 100;
        fill = this.hexToRgba(style.fill, alpha);
      }

      obj.set({
        name: style.name,
        stroke: style.stroke,
        fill: fill,
        strokeWidth: style.strokeWidth,
        strokeDashArray:
          style.strokeDashArray === 'solid'
            ? []
            : style.strokeDashArray === 'dashed'
              ? [5, 5]
              : [2, 2]
      });

      // extra property-k mentése
      (obj as any).fillPattern = style.fillPattern;
      (obj as any).fillPatternSize = style.fillPatternSize;
      (obj as any).fillColor = style.fill;
      (obj as any).fillOpacity = style.fillOpacity;
    });

    this.canvas.renderAll();
  }

  applyImageStyle(): void {
    this.saveHistory();
    if (!this.selectedImageObject) return;

    this.selectedImageObject.set({
      name: this.formImageStyle.name,
      opacity: this.formImageStyle.opacity,
      scaleX: this.formImageStyle.scaleX,
      scaleY: this.formImageStyle.scaleY,
      angle: this.formImageStyle.angle
    });

    this.canvas.renderAll();
  }

  selectedTemplate(): { name: string } | string {
    return this.savedTemplates.find(t => t.name === this.selectedTemplateObject?.name) || '';
  }
/*
applyTemplateStyle(): void {
  this.saveHistory();

  if (!this.formTemplateStyle.templateName) {
    this.selectedTemplateObject = null;
    return;
  }

  // Megkeressük a kiválasztott sablont
  this.selectedTemplateObject = this.savedTemplates.find(
    t => t.name === this.formTemplateStyle.templateName
  ) ?? null;

  if (!this.selectedTemplateObject) return;
console.log(this.selectedTemplateObject)
  const groupData = JSON.parse(this.selectedTemplateObject.json);

  fabric.Group.fromObject(groupData).then(group => {
    // Alkalmazzuk a beállításokat
    group.set({
      opacity: this.formTemplateStyle.opacity,
      scaleX: this.formTemplateStyle.scaleX,
      scaleY: this.formTemplateStyle.scaleY,
      angle: this.formTemplateStyle.angle,
      originX: 'center',
      originY: 'center',
      selectable: true,
      evented: true
    });

    (group as any).name = this.formTemplateStyle.name;
    (group as any).templateName = this.formTemplateStyle.templateName;
  //  (group as any).type = 'group'; // ← Tipp: elírás volt: "tempalte"

    // Előnézet frissítés céljából (pl. az oldalon valahol megjeleníted)
    this.canvas.renderAll();
  });
}*/

/*
applyTemplateStyle(): void {
  this.saveHistory();

  const activeObj = this.canvas.getActiveObject();

  // Ellenőrzés: valóban egy template típusú elem van kiválasztva?
  if (!activeObj || !(activeObj as any).templateName) return;

  activeObj.set({
    opacity: this.formTemplateStyle.opacity ?? 1,
    scaleX: this.formTemplateStyle.scaleX ?? 1,
    scaleY: this.formTemplateStyle.scaleY ?? 1,
    angle: this.formTemplateStyle.angle ?? 0
  });

  (activeObj as any).name = this.formTemplateStyle.name;
  (activeObj as any).templateName = this.formTemplateStyle.templateName;

  this.canvas.renderAll();
}*/

applyTemplateStyle(): void {
  this.saveHistory();

  const activeObj = this.canvas.getActiveObject();

  // Ha aktív sablon van kijelölve, módosítjuk
  if (activeObj && (activeObj as any).templateName) {
    activeObj.set({
      opacity: this.formTemplateStyle.opacity ?? 1,
      scaleX: this.formTemplateStyle.scaleX ?? 1,
      scaleY: this.formTemplateStyle.scaleY ?? 1,
      angle: this.formTemplateStyle.angle ?? 0
    });

    (activeObj as any).name = this.formTemplateStyle.name;
    (activeObj as any).templateName = this.formTemplateStyle.templateName;

    this.canvas.renderAll();
    return;
  }

  // Ha nincs aktív objektum, kiválasztott sablon beállítása (de nem szúrunk be semmit!)
  const selected = this.savedTemplates.find(
    t => t.name === this.formTemplateStyle.templateName
  );

  this.selectedTemplateObject = selected ?? null;
}



  applyArcStyle(): void {
    this.saveHistory();
    const style = this.formArcStyle;
    this.selectedArcObjects.forEach(obj => {
      obj.set({
        name: style.name,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        strokeDashArray:
          style.strokeDashArray === 'solid' ? [] :
            style.strokeDashArray === 'dashed' ? [5, 5] :
              [2, 2]
      });
    });

    this.canvas.renderAll();
  }

  bringToFront() {
    const active = this.canvas.getActiveObject();
    if (active) {
      this.canvas.remove(active);
      this.canvas.add(active);
      this.canvas.setActiveObject(active);
      this.canvas.renderAll();
    }
  }

  sendToBack() {
    const active = this.canvas.getActiveObject();
    if (active) {
      this.canvas.remove(active);
      this.canvas.insertAt(0, active);
      this.canvas.setActiveObject(active);
      this.canvas.renderAll();
    }
  }

  bringForward() {
    const active = this.canvas.getActiveObject();
    if (active) {
      const index = this.canvas.getObjects().indexOf(active);
      this.canvas.remove(active);
      this.canvas.insertAt(index + 1, active);
      this.canvas.setActiveObject(active);
      this.canvas.renderAll();
    }
  }

  sendBackward() {
    const active = this.canvas.getActiveObject();
    if (active) {
      const index = this.canvas.getObjects().indexOf(active);
      this.canvas.remove(active);
      this.canvas.insertAt(index - 1, active);
      this.canvas.setActiveObject(active);
      this.canvas.renderAll();
    }
  }

  hexToRgba(hex: string, alpha: number): string {
    const bigint = parseInt(hex.replace('#', ''), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  }

  ngOnChanges(): void {
    this.updateCanvasSelectability();
  }

  private copyStyleFromObject(obj: fabric.Object): void {
    if (obj.type === 'rect') {
      this.formRectStyle.stroke = this.parseColorToHex(obj.stroke as string);
      this.formRectStyle.strokeWidth = obj.strokeWidth ?? 2;
      const { hex, opacity } = this.extractFillAndOpacity(obj.fill as string);
      this.formRectStyle.fill = hex;
      this.formRectStyle.fillOpacity = opacity;

      const dash = obj.strokeDashArray;
      if (!dash || dash.length === 0) {
        this.formRectStyle.strokeDashArray = 'solid';
      } else if (dash[0] === 5 && dash[1] === 5) {
        this.formRectStyle.strokeDashArray = 'dashed';
      } else if (dash[0] === 2 && dash[1] === 2) {
        this.formRectStyle.strokeDashArray = 'dotted';
      }
    }

    if (obj.type === 'line') {
      this.formLineStyle.stroke = this.parseColorToHex(obj.stroke as string);
      this.formLineStyle.strokeWidth = obj.strokeWidth ?? 2;
      const dash = obj.strokeDashArray;
      this.formLineStyle.strokeDashArray = (!dash || dash.length === 0) ? 'solid' :
        dash[0] === 5 ? 'dashed' : 'dotted';
    }

    if (obj.type === 'textbox') {
      const text = obj as fabric.Textbox;
      this.formTextStyle.fill = text.fill as string;
      this.formTextStyle.fontSize = text.fontSize ?? 20;
      this.formTextStyle.fontFamily = text.fontFamily ?? 'Arial';
      this.formTextStyle.fontWeight = text.fontWeight === 'bold' ? 'bold' : 'normal';
      this.formTextStyle.fontStyle = text.fontStyle === 'italic' ? 'italic' : 'normal';
      this.formTextStyle.textAlign = text.textAlign as any;
      this.formTextStyle.underline = text.underline ?? false;
      this.formTextStyle.linethrough = text.linethrough ?? false;
    }

    // Hasonlóan bővíthető ellipse, polygon, polyline stílusokkal

    this.snackbar.show('Stílus másolva!', 'success');
  }

  private updateCanvasSelectability(): void {
    const isSelectable = this.mode === 'select';
    this.canvas.selection = isSelectable;

    this.canvas.forEachObject(obj => {
      if ((obj as any).isGridLine) return; // rácsot kihagyjuk
      obj.selectable = isSelectable;
    });
  }

  private drawInfiniteGrid(): void {

    if (!this.showGrid) return;

    const ctx = this.canvas.getContext();
    const zoom = this.canvas.getZoom();
    this.zoom = zoom;
    const vpt = this.canvas.viewportTransform;

    if (!ctx || !vpt) return;

    const spacing = this.gridSpacing * zoom;
    const width = this.canvas.getWidth();
    const height = this.canvas.getHeight();

    const xOffset = vpt[4] % spacing;
    const yOffset = vpt[5] % spacing;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#eee';

    // Rácsvonalak
    for (let x = xOffset; x <= width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = yOffset; y <= height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // X a világ (0,0) pontján
    const originX = vpt[4]; // canvas-x of (0,0)
    const originY = vpt[5]; // canvas-y of (0,0)
    const crossSize = 8 * zoom; // méretarányos X méret

    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.moveTo(originX - crossSize, originY - crossSize);
    ctx.lineTo(originX + crossSize, originY + crossSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(originX - crossSize, originY + crossSize);
    ctx.lineTo(originX + crossSize, originY - crossSize);
    ctx.stroke();

    ctx.restore();
  }

  onModeChange(): void {
    const isSelectable = this.mode === 'select';
    this.canvas.selection = isSelectable;


    // Minden objektum kijelölhetőségének frissítése
    this.canvas.forEachObject(obj => {
      if ((obj as any).isGridLine) return;
      obj.selectable = isSelectable;
    });

    // Kijelölések törlése módváltáskor
    this.canvas.discardActiveObject();
    this.selectedTextObject = null;
    this.selectedLineObject = null;
    this.selectedPolylineObject = null;
    this.selectedRectObject = null;
    this.selectedEllipseObject = null;
    this.selectedPolygonObject = null;

    this.updateCountersFromCanvas();
    this.canvas.renderAll();
    // Kurzor frissítése
    this.canvas.upperCanvasEl.style.cursor = this.mode === 'select' ? 'default' : 'crosshair';
    if (this.mode == 'select') {
      this.activeTabIndex = 1;
    } else {
      this.activeTabIndex = 0;
    }
  }

  toggleAreaLabel(obj: fabric.Object | null): void {
    if (!obj) return;

    const label = (obj as any).areaLabel as fabric.Textbox;
    const show = (obj as any).showAreaLabel;

    if (label) {
      label.visible = show;
      this.canvas.renderAll();
    }
  }

  get showArea(): boolean {
    return (
      (this.selectedRectObject as any)?.showAreaLabel ??
      (this.selectedPolygonObject as any)?.showAreaLabel ??
      (this.selectedEllipseObject as any)?.showAreaLabel ??
      this.showAreaLabels
    );
  }

  set showArea(value: boolean) {
    if (this.selectedRectObject) {
      (this.selectedRectObject as any).showAreaLabel = value;
      this.toggleAreaLabel(this.selectedRectObject);
    } else if (this.selectedPolygonObject) {
      (this.selectedPolygonObject as any).showAreaLabel = value;
      this.toggleAreaLabel(this.selectedPolygonObject);
    } else if (this.selectedEllipseObject) {
      (this.selectedEllipseObject as any).showAreaLabel = value;
      this.toggleAreaLabel(this.selectedEllipseObject);
    } else {
      this.showAreaLabels = value;
    }
  }

  private handlePolygonMouseDown(pointer: { x: number, y: number }) {
    if (this.points.length == 0) {
      this.saveHistory();
    }
    const clickedPointIndex = this.pointCircles.findIndex(circle =>
      this.isPointNear(pointer, circle.left!, circle.top!, this.radius + 3)
    );

    if (clickedPointIndex === 0 && this.points.length >= 3) {
      this.finishPolygon();
      return;
    }

    const newPoint = { x: pointer.x, y: pointer.y };
    this.points.push(newPoint);

    const circle = new fabric.Circle({
      left: newPoint.x,
      top: newPoint.y,
      radius: this.radius,
      fill: 'red',
      selectable: false,
      originX: 'center',
      originY: 'center'
    });
    this.pointCircles.push(circle);
    this.canvas.add(circle);

    if (this.points.length > 1) {
      const prev = this.points[this.points.length - 2];
      const line = new fabric.Line([prev.x, prev.y, newPoint.x, newPoint.y], {
        stroke: this.formPolygonStyle.stroke,
        strokeWidth: this.formPolygonStyle.strokeWidth,
        strokeDashArray: this.formPolygonStyle.strokeDashArray === 'solid' ? [] : this.formPolygonStyle.strokeDashArray === 'dashed' ? [5, 5] : [2, 2],
        selectable: false
      });
      this.lines.push(line);
      this.canvas.add(line);
    }

    if (this.previewLine) {
      this.canvas.remove(this.previewLine);
      this.previewLine = null;
    }
  }

  private handlePolylineMouseDown(rawPointer: { x: number, y: number }) {

    const pointer = this.getSnappedPointer(rawPointer);
    if (this.points.length == 0) {
      this.saveHistory();
    }
    if (this.points.length > 0) {
      const last = this.points[this.points.length - 1];
      const dx = pointer.x - last.x;
      const dy = pointer.y - last.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 5 && this.points.length >= 2) {
        // ugyanoda kattintottunk vissza → lezárás
        const polyline = new fabric.Polyline(this.points, {
          name: this.formPolylineStyle.name,
          fill: '',
          stroke: this.formPolylineStyle.stroke,
          strokeWidth: this.formPolylineStyle.strokeWidth,
          strokeDashArray: this.formPolylineStyle.strokeDashArray === 'solid' ? [0, 0] : this.formPolylineStyle.strokeDashArray === 'dashed' ? [5, 5] : [2, 2],
          selectable: true
        });

        (polyline as any).name = this.formPolylineStyle.name;
        this.canvas.add(polyline);
        this.formPolylineStyle.name = this.generateAutoName('polyline');

        this.pointCircles.forEach(c => this.canvas.remove(c));
        this.lines.forEach(l => this.canvas.remove(l));

        const lastLine = this.canvas.getObjects('line').reverse().find(line =>
          !line.selectable && !line.evented && Array.isArray(line.strokeDashArray)
        );

        if (lastLine) {
          this.canvas.remove(lastLine);

        }

        this.canvas.renderAll();

        this.points = [];
        this.pointCircles = [];
        this.lines = [];
        this.previewLine = null;
        if (this.polylineHintText) {
          this.canvas.remove(this.polylineHintText);
          this.polylineHintText = undefined;
        }
        return;
      }
    }

    // új pont hozzáadása
    const newPoint = { x: pointer.x, y: pointer.y };
    this.points.push(newPoint);

    const circle = new fabric.Circle({
      left: newPoint.x,
      top: newPoint.y,
      radius: this.radius,
      fill: 'red',
      selectable: false,
      originX: 'center',
      originY: 'center',
      excludeFromExport: true
    });
    this.pointCircles.push(circle);
    this.canvas.add(circle);

    if (this.points.length > 1) {
      const prev = this.points[this.points.length - 2];
      const line = new fabric.Line([prev.x, prev.y, newPoint.x, newPoint.y], {
        stroke: this.formPolylineStyle.stroke,
        strokeWidth: this.formPolylineStyle.strokeWidth,
        strokeDashArray: this.formPolylineStyle.strokeDashArray === 'solid' ? [] : this.formPolylineStyle.strokeDashArray === 'dashed' ? [5, 5] : [2, 2],
        selectable: false
      });
      this.lines.push(line);
      this.canvas.add(line);
    }

    if (this.previewLine) {
      this.canvas.remove(this.previewLine);
      this.previewLine = null;
    }
  }

  private isPointNear(p: { x: number, y: number }, x: number, y: number, threshold = 5): boolean {
    const dx = p.x - x;
    const dy = p.y - y;
    return Math.sqrt(dx * dx + dy * dy) <= threshold;
  }

  private finishPolygon(): void {
    let fillValue: string | fabric.Pattern;

    if (this.formPolygonStyle.fillPattern !== 'none') {
      const patternCanvas = this.createPatternCanvas(
        this.formPolygonStyle.fillPattern,
        this.formPolygonStyle.fill,
        this.formPolygonStyle.fillOpacity,
        this.formPolygonStyle.fillPatternSize
      );

      fillValue = new fabric.Pattern({
        source: patternCanvas,
        repeat: 'repeat'
      });
    } else {
      const alpha = this.formPolygonStyle.fillOpacity / 100;
      fillValue = this.hexToRgba(this.formPolygonStyle.fill, alpha);
    }

    const polygon = new fabric.Polygon(this.points, {
      fill: fillValue,
      stroke: this.formPolygonStyle.stroke,
      strokeWidth: this.formPolygonStyle.strokeWidth,
      strokeDashArray: this.formPolygonStyle.strokeDashArray === 'solid' ? [] :
        this.formPolygonStyle.strokeDashArray === 'dashed' ? [5, 5] : [2, 2],
      selectable: true
    });

    // **Kitöltés adatok hozzáadása az objektumhoz**
    (polygon as any).fillPattern = this.formPolygonStyle.fillPattern;
    (polygon as any).fillPatternSize = this.formPolygonStyle.fillPatternSize;
    (polygon as any).fillColor = this.formPolygonStyle.fill;
    (polygon as any).fillOpacity = this.formPolygonStyle.fillOpacity;

    (polygon as any).name = this.formPolygonStyle.name;
    (polygon as any).showAreaLabel = this.showAreaLabels;

    const label = this.createAreaLabelForPolygon(polygon);
    (polygon as any).areaLabel = label;
    (polygon as any).areaLabelId = (label as any).id;

    this.canvas.add(polygon);
    this.canvas.add(label);
    this.formPolygonStyle.name = this.generateAutoName('polygon');

    this.pointCircles.forEach(c => this.canvas.remove(c));
    this.lines.forEach(l => this.canvas.remove(l));
    if (this.linePreview) {
      this.canvas.remove(this.linePreview);
      this.linePreview = null;
    }

    this.canvas.renderAll();

    this.points = [];
    this.pointCircles = [];
    this.lines = [];

    const lastLine = this.canvas.getObjects('line').reverse().find(line =>
      !line.selectable && !line.evented && Array.isArray(line.strokeDashArray)
    );

    if (lastLine) {
      this.canvas.remove(lastLine);
    }

    if (this.linePreview) {
      this.linePreview = null;
    }

    if (this.polylineHintText) {
      this.canvas.remove(this.polylineHintText);
      this.polylineHintText = undefined;
    }

  }

  private getSnappedPointer(pointer: { x: number; y: number }): { x: number; y: number } {

    const snap = this.snapPoints.find(p => {
      const dx = pointer.x - p.x;
      const dy = pointer.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist < this.snapThreshold;
    });

    if (snap) {
      this.showVertexMarker(snap.x, snap.y);
      return { x: snap.x, y: snap.y };
    }

    this.removeVertexMarker();

    let refPoint: { x: number; y: number } | null = null;

    if ((this.mode === 'polygon' || this.mode === 'polyline') && this.points.length > 0) {
      refPoint = this.points[this.points.length - 1];
    }

    if (this.mode === 'line' && this.lineStartPoint) {
      refPoint = this.lineStartPoint;
    }

    // Ha grid snap be van kapcsolva, kerekítsük a legközelebbi rácsvonalra
    if (this.gridSnapEnabled) {
      const spacing = this.gridSpacing;
      const snappedX = Math.round(pointer.x / spacing) * spacing;
      const snappedY = Math.round(pointer.y / spacing) * spacing;
      return { x: snappedX, y: snappedY };
    }

    // Ha Shift le van nyomva és van ref pont, akkor irány szög snapping
    if (this.isShiftDown && refPoint) {
      const dx = pointer.x - refPoint.x;
      const dy = pointer.y - refPoint.y;

      const angle = Math.atan2(dy, dx);
      const snapAngle = (Math.round(angle / (Math.PI / 4))) * (Math.PI / 4); // 8 irány

      const dist = Math.sqrt(dx * dx + dy * dy);
      const snappedX = refPoint.x + Math.cos(snapAngle) * dist;
      const snappedY = refPoint.y + Math.sin(snapAngle) * dist;

      return { x: snappedX, y: snappedY };
    }

    // Alapértelmezett: nincs snap
    return pointer;
  }

  saveToDatabase(): void {

    this.canvas.getObjects().forEach(obj => {
      if ((obj as any).areaLabel) {
        const label = (obj as any).areaLabel as fabric.Textbox;
        //  label.visible = (obj as any).showAreaLabel;
        label.excludeFromExport = false;

        if (!(label as any).id) {
          (label as any).id = 'label-' + Math.random().toString(36).substr(2, 9);
        }

        (label as any).areaLinked = true;
        (obj as any).areaLabelId = (label as any).id;
      }
    });

    const json = JSON.stringify(
      (this.canvas.toJSON as any)(['name', 'areaLabelId', 'areaLinked', 'id', 'showAreaLabel'])
    );
    // console.log(JSON.parse(json));

    const payload = {
      floorplan: json
    };

    this.api.update('levels', this.levelId!, payload).subscribe({
      next: () => this.snackbar.show('Sikeres mentés!', 'success'),
      error: err => this.snackbar.show('Hiba történt! ' + err.message, 'error')
    });
  }

  downloadSvg(): void {
    const svg = this.canvas.toSVG();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'rajzolt.svg';
    a.click();

    URL.revokeObjectURL(url);
  }

  loadSvgFromText(svgText: string): void {
    fabric.loadSVGFromString(svgText).then(({ objects }: any) => {
      if (!objects || objects.length === 0) {
        console.error('Nem sikerült betölteni SVG objektumokat');
        return;
      }

      this.canvas.clear();
      for (const obj of objects) {
        this.canvas.add(obj);
      }

      this.updateCountersFromCanvas();
      this.canvas.renderAll();
    });
  }

  private relinkAreaLabels(): void {
    const objects = this.canvas.getObjects();

    const labels = objects.filter(obj => (obj as any).areaLinked);
    const areaObjects = objects.filter(obj =>
      obj.type === 'rect' || obj.type === 'polygon' || obj.type === 'ellipse'
    );

    areaObjects.forEach(obj => {
      const labelId = (obj as any).areaLabelId;
      if (labelId) {
        const label = labels.find(l => (l as any).id === labelId);
        if (label) {
          (obj as any).areaLabel = label;
          (obj as any).areaLinked = true;
          (label as any).areaLinked = true;
        }
      }
    });
  }


  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.selectedImageFile = input.files[0];
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const svgText = reader.result as string;
      this.loadSvgFromText(svgText);
    };

    reader.readAsText(file);
  }

  clearCanvas(): void {
    this.saveHistory();

    this.canvas.clear();

    // Poligon állapot is nullázva legyen, ha félbehagyta:
    this.points = [];
    this.pointCircles = [];
    this.lines = [];
    this.previewLine = null;

    // Visszaállítjuk az alap beállításokat (kijelölés módhoz például)
    this.updateCanvasSelectability();

    this.canvas.renderAll();
  }

  private getRectDimensions(p1: { x: number, y: number }, p2: { x: number, y: number }) {
    const left = Math.min(p1.x, p2.x);
    const top = Math.min(p1.y, p2.y);
    const width = Math.abs(p2.x - p1.x);
    const height = Math.abs(p2.y - p1.y);
    return { left, top, width, height };
  }

  private createRectFromPoints(
    p1: { x: number, y: number },
    p2: { x: number, y: number },
    options: {
      fill?: string | fabric.Pattern;
      stroke?: string;
      strokeWidth?: number;
      opacity?: number;
      strokeDashArray?: number[];
    }
  ): fabric.Rect {
    const dims = this.getRectDimensions(p1, p2);
    return new fabric.Rect({
      ...dims,
      ...options
    });
  }

  resetView(): void {
    const canvasWidth = this.canvas.getWidth();
    const canvasHeight = this.canvas.getHeight();

    const zoom = 1; // alapértelmezett nagyítás
    this.canvas.setZoom(zoom);

    const panX = canvasWidth / 2;
    const panY = canvasHeight / 2;

    this.canvas.setViewportTransform([zoom, 0, 0, zoom, panX, panY]);
    this.canvas.renderAll();
  }

  zoomToFit(): void {
    const objects = this.canvas.getObjects().filter(obj => obj.visible !== false);

    if (objects.length === 0) return;

    // Margin (px)
    const margin = 20;

    // Bounding box kiszámítása
    const bounds = this.canvas.getObjects().reduce((acc, obj) => {
      const objBounds = obj.getBoundingRect();
      acc.left = Math.min(acc.left, objBounds.left);
      acc.top = Math.min(acc.top, objBounds.top);
      acc.right = Math.max(acc.right, objBounds.left + objBounds.width);
      acc.bottom = Math.max(acc.bottom, objBounds.top + objBounds.height);
      return acc;
    }, {
      left: Infinity,
      top: Infinity,
      right: -Infinity,
      bottom: -Infinity
    });

    const totalWidth = bounds.right - bounds.left;
    const totalHeight = bounds.bottom - bounds.top;

    const canvasWidth = this.canvas.getWidth() - 2 * margin;
    const canvasHeight = this.canvas.getHeight() - 2 * margin;

    const scaleX = canvasWidth / totalWidth;
    const scaleY = canvasHeight / totalHeight;

    const zoom = Math.min(scaleX, scaleY);

    // A fabric.js zoom középpontját (viewportTransform alapján) kell beállítani
    this.canvas.setZoom(zoom);

    // Pan: úgy, hogy a bounding box középpontja a canvas közepére essen
    const centerX = bounds.left + totalWidth / 2;
    const centerY = bounds.top + totalHeight / 2;

    const canvasCenterX = this.canvas.getWidth() / 2;
    const canvasCenterY = this.canvas.getHeight() / 2;

    const panX = canvasCenterX - centerX * zoom;
    const panY = canvasCenterY - centerY * zoom;

    this.canvas.viewportTransform![4] = panX;
    this.canvas.viewportTransform![5] = panY;

    this.canvas.requestRenderAll();

    // --- KÉP generálás és feltöltés ---
    const preview = this.generateCanvasPreview();

    this.uploadCanvasPreview(this.levelId, preview);
  }

  onOpacityChange(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.formRectStyle.fillOpacity = value;
    this.applyRectStyle();
  }

  onEllipseOpacityChange(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.formEllipseStyle.fillOpacity = value;
    this.applyEllipseStyle();
  }

  onPolygonOpacityChange(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.formPolygonStyle.fillOpacity = value;
    this.applyPolygonStyle();
  }

  private generateAutoName(obj: string): string {
    const type = obj ?? 'object';
    this.objectCounters[type] = (this.objectCounters[type] || 0) + 1;

    const label = {
      'rect': 'Téglalap',
      'textbox': 'Szöveg',
      'line': 'Vonal',
      'ellipse': 'Ellipszis',
      'polygon': 'Poligon',
      'polyline': 'Vonallánc',
      'image': 'Kép',
      'arc': 'Körív',
      'template': 'Sablon',
    }[type] || 'Objektum';

    return `${label} ${this.objectCounters[type]}`;
  }

  private updateCountersFromCanvas(): void {
    this.objectCounters = {};
    this.canvas.getObjects().forEach(obj => {
      const type = obj.type ?? 'object';
      this.objectCounters[type] = (this.objectCounters[type] || 0) + 1;
    });

    this.formLineStyle.name = this.generateAutoName('line');
    this.formPolylineStyle.name = this.generateAutoName('polyline');
    this.formRectStyle.name = this.generateAutoName('rect');
    this.formEllipseStyle.name = this.generateAutoName('ellipse');
    this.formPolygonStyle.name = this.generateAutoName('polygon');
    this.formTextStyle.name = this.generateAutoName('textbox');
    this.formImageStyle.name = this.generateAutoName('image');
    this.formArcStyle.name = this.generateAutoName('arc');
    this.formTemplateStyle.name = this.generateAutoName('template');

    this.loadSavedTemplates();
  }

  private createAreaLabelForPolygon(polygon: fabric.Polygon): fabric.Textbox {
    const points = polygon.points;
    const area = this.calculatePolygonArea(points) / (this.gridSpacing * this.gridSpacing);
    const areaText = area.toFixed(2) + ' m²';

    const center = polygon.getCenterPoint(); // <-- Itt a kulcs!

    const textbox = new fabric.Textbox(areaText, {
      left: center.x,
      top: center.y,
      originX: 'center',
      originY: 'center',
      fontSize: 12,
      fill: '#000',
      editable: true,
      textAlign: 'center',
      visible: this.showAreaLabels
    });

    (textbox as any).areaLinked = true;
    (textbox as any).id = 'label-' + Math.random().toString(36).substr(2, 9);
    (textbox as any).name = (polygon as any).name + ' címke';

    return textbox;
  }

  private calculatePolygonArea(points: { x: number; y: number }[]): number {
    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].x * points[j].y - points[j].x * points[i].y;
    }

    return Math.abs(area / 2);
  }

  private createAreaLabelForEllipse(ellipse: fabric.Ellipse): fabric.Textbox {
    const area = Math.PI * ellipse.rx * ellipse.ry / (this.gridSpacing * this.gridSpacing);
    const areaText = area.toFixed(2) + ' m²';

    // A Fabric-ben az ellipse originX/Y miatt középpont:
    const center = ellipse.getCenterPoint();

    const textbox = new fabric.Textbox(areaText, {
      left: center.x,
      top: center.y,
      originX: 'center',
      originY: 'center',
      fontSize: 12,
      fill: '#000',
      editable: true,
      textAlign: 'center',
      visible: this.showAreaLabels
    });

    (textbox as any).areaLinked = true;
    (textbox as any).id = 'label-' + Math.random().toString(36).substr(2, 9);
    (textbox as any).name = (ellipse as any).name + ' címke';

    return textbox;
  }

  private enableVertexEditing(object: fabric.Polygon | fabric.Polyline): void {
    const canvas = this.canvas;
    this.disableVertexEditing(); // előző pontok eltávolítása, ha van
    this.editingObject = object;
    object.set({
      selectable: false,
      evented: false,
    });
    const offset = object.calcTransformMatrix();

    object.points.forEach((pt, index) => {
      const transformed = fabric.util.transformPoint(
        new fabric.Point(pt.x - object.pathOffset.x, pt.y - object.pathOffset.y),
        offset
      );

      const circle = new fabric.Circle({
        excludeFromExport: true,
        left: transformed.x,
        top: transformed.y,
        radius: 5,
        fill: 'red',
        originX: 'center',
        originY: 'center',
        hasBorders: false,
        hasControls: false,
        selectable: true,
        hoverCursor: 'move',
        evented: true,
      });

      (circle as any).vertexIndex = index;
      (circle as any).linkedObject = object;

      circle.on('moving', () => {
        const i = (circle as any).vertexIndex;
        const poly = (circle as any).linkedObject;

        const inverse = fabric.util.invertTransform(poly.calcTransformMatrix());
        const local = fabric.util.transformPoint(
          new fabric.Point(circle.left!, circle.top!),
          inverse
        );

        poly.points[i].x = local.x + poly.pathOffset.x;
        poly.points[i].y = local.y + poly.pathOffset.y;

        poly.set({ dirty: true });
        poly.setCoords();
        this.canvas.renderAll();
      });
      circle.on('mousedown', () => {
        circle.set('fill', 'brown');
        this.canvas.renderAll();
      });

      this.canvas.on('mouse:up', () => {
        if (this.editingVertices.length > 0) {
          for (const circle of this.editingVertices) {
            const poly = (circle as any).linkedObject;

            if ((poly as any).areaLabel && poly.type === 'polygon') {
              // újraterület-számítás
              const area = this.calculatePolygonArea(poly.points);
              const areaM2 = area / (this.gridSpacing * this.gridSpacing);
              const label = (poly as any).areaLabel;

              label.set({
                text: areaM2.toFixed(2) + ' m²',
                left: poly.getCenterPoint().x,
                top: poly.getCenterPoint().y
              });
            }

            if ((poly as any).areaLabel) {
              const label = (poly as any).areaLabel;
              const center = poly.getCenterPoint();
              label.set({ left: center.x, top: center.y });
            }
          }
          circle.set('fill', 'red');
          this.canvas.discardActiveObject();
          this.canvas.renderAll();
        }
      });

      this.canvas.on('mouse:move', (opt) => {
        const target = opt.target;
        if ((target as any)?.vertexIndex !== undefined) {
          this.canvas.setCursor('move');
        } else {
          this.canvas.setCursor('default');
        }
      });

      this.editingVertices.push(circle);
      canvas.add(circle);
    });
  }

  disableVertexEditing(): void {
    this.editingVertices.forEach(c => this.canvas.remove(c));
    this.editingVertices = [];

    if (this.editingObject) {
      this.editingObject.set({
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true
      });

      // ⚠️ Nem hívjuk meg: _setPositionDimensions()

      // ✅ Csak sima setCoords()
      this.editingObject.setCoords();
      this.editingObject = null;
    }

    this.canvas.renderAll();
  }

  cancelDrawing(): boolean {
    let wasDrawing = false;
    this.canvas.discardActiveObject();

    // --- Line ---
    if (this.lineStartPoint || this.linePreview) {
      wasDrawing = true;
      this.lineStartPoint = null;
      if (this.linePreview) {
        this.canvas.remove(this.linePreview);
        this.linePreview = null;
      }
      this.lineCircles.forEach(c => this.canvas.remove(c));
      this.lineCircles = [];
    }

    // --- Rect / Ellipse ---
    if (this.rectStartPoint || this.rectPreview || this.ellipsePreview) {
      wasDrawing = true;
      this.rectStartPoint = null;
      this.rectCircles.forEach(c => this.canvas.remove(c));
      this.ellipseCircles.forEach(c => this.canvas.remove(c));
      this.rectCircles = [];
      this.ellipseCircles = [];
    }

    if (this.rectPreview) {
      this.canvas.remove(this.rectPreview);
      this.rectPreview = null;
    }

    if (this.ellipsePreview) {
      this.canvas.remove(this.ellipsePreview);
      this.ellipsePreview = null;
    }

    // --- Polygon / Polyline ---
    if (this.points.length > 0 || this.previewLine) {
      wasDrawing   // console.log('Room frissítve:', updatedRoom); = true;
      this.points = [];
      this.pointCircles.forEach(c => this.canvas.remove(c));
      this.pointCircles = [];
      this.lines.forEach(l => this.canvas.remove(l));
      this.lines = [];
      if (this.previewLine) {
        this.canvas.remove(this.previewLine);
        this.previewLine = null;
      }
    }

    // --- Arc ---
    if (this.arcPoints.length > 0 || this.arcRadiusPreview || this.arcPathPreview) {
      wasDrawing = true;
      this.arcPoints = [];

      if (this.arcRadiusPreview) {
        this.canvas.remove(this.arcRadiusPreview);
        this.arcRadiusPreview = null;
      }

      if (this.arcPathPreview) {
        this.canvas.remove(this.arcPathPreview);
        this.arcPathPreview = null;
      }
    }

    this.selectedRoomId = null;
    this.canvas.renderAll();
    return wasDrawing;
  }

  deleteAllObjects(): void {
    this.saveHistory();
    this.canvas.getObjects().forEach(obj => {
      if (!(obj as any).isGridLine) {
        this.canvas.remove(obj);
      }
    });

    this.points = [];
    this.pointCircles = [];
    this.lines = [];
    this.linePreview = null;
    this.rectStartPoint = null;
    this.rectPreview = null;
    this.ellipsePreview = null;

    this.updateCountersFromCanvas();
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
    this.updateCanvasSelectability();
    this.snackbar.show('A vászon minden eleme törölve lett.', 'success');
  }

  deleteSelectedObjects(): void {
    const activeObjects = this.canvas.getActiveObjects();

    if (activeObjects.length > 0) {
      this.saveHistory();

      activeObjects.forEach(obj => this.canvas.remove(obj));
      this.canvas.discardActiveObject();
      this.canvas.renderAll();
      this.snackbar.show('A kijelölt elem(ek) törölve lettek.', 'success');
    } else {
      this.snackbar.show('Nincs kijelölt objektum.', 'error');
    }
  }

  saveHistory(): void {

    if (this.suppressHistory) return;

    const json = this.getCanvasJson();
    this.undoStack.push(json);

    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    this.redoStack = []; // új művelet után a redo stack ürül
  }

  undo(): void {
    if (this.undoStack.length === 0) return;

    const current = this.getCanvasJson();
    this.redoStack.push(current);

    const previous = this.undoStack.pop()!;
    this.suppressHistory = true;
    this.canvas.loadFromJSON(previous, () => {
      setTimeout(() => {
        this.resizeCanvas();
        this.relinkAreaLabels();
        this.updateCountersFromCanvas();
        this.canvas.renderAll();
        this.suppressHistory = false;
      }, 100);

    });
  }

  redo(): void {
    if (this.redoStack.length === 0) return;

    const current = this.getCanvasJson();
    this.undoStack.push(current);

    const next = this.redoStack.pop()!;
    this.suppressHistory = true;
    this.canvas.loadFromJSON(next, () => {
      setTimeout(() => {
        this.resizeCanvas();
        this.relinkAreaLabels();
        this.updateCountersFromCanvas();
        this.canvas.renderAll();
        this.suppressHistory = false;
      }, 100);
    });
  }

  getCanvasJson(): string {
    return JSON.stringify(
      (this.canvas.toJSON as (props: string[]) => any)([
        'name', 'areaLabelId', 'areaLinked', 'id', 'showAreaLabel'
      ])
    );
  }

  generateCanvasPreview(): string {

    // Létrehozunk egy új HTMLCanvasElement-et
    const origCanvasEl = this.canvas.getElement();
    const width = origCanvasEl.width;
    const height = origCanvasEl.height;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;

    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return '';

    // Fehér háttér kirajzolása
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Kirendereljük az aktuális fabric tartalmat ide
    this.canvas.renderAll(); // biztos, ami biztos
    ctx.drawImage(origCanvasEl, 0, 0);

    // Végül tömörített adatként lekérjük
    return tempCanvas.toDataURL('image/jpeg', 0.7); // quality: 70%

  }

  uploadCanvasPreview(levelId: string, previewDataUrl: string): void {
    const payload = { preview: previewDataUrl };

    this.api.update('levels', levelId, payload).subscribe({
      next: () => {
        //   this.snackbar.show('Előnézet frissítve', 'success');
      },
      error: (err) => {
        console.error('Nem sikerült frissíteni az előnézetet: ', err);
        this.snackbar.show('Hiba történt az előnézet frissítése közben!', 'error');
      }
    });
  }

  async copy(): Promise<void> {
    const active = this.canvas.getActiveObject();
    if (!active) return;

    this.clipboard = [];

    const objectsToClone: fabric.Object[] =
      active.type === 'activeselection'
        ? (active as fabric.ActiveSelection).getObjects()
        : [active];

    for (const obj of objectsToClone) {
      const cloned = await obj.clone();
      const areaLabel = (obj as any).areaLabel;

      if (areaLabel && areaLabel instanceof fabric.Textbox) {
        const labelClone = await areaLabel.clone();
        (cloned as any).areaLabel = labelClone;
        (cloned as any).areaLabelId = (areaLabel as any).id;
        (cloned as any).areaLinked = true;
      }

      this.clipboard.push(cloned);
    }

    this.snackbar.show(`${this.clipboard.length} elem másolva`, 'success');
  }

  async paste(): Promise<void> {
    if (!this.clipboard?.length) return;

    this.saveHistory();

    const pastedObjects: fabric.Object[] = [];

    for (const original of this.clipboard) {
      const cloned = await original.clone();

      const newId = 'obj-' + Math.random().toString(36).substr(2, 9);
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
        id: newId,
        selectable: true,
        evented: true,
      });

      this.canvas.add(cloned);
      pastedObjects.push(cloned);

      const areaLabel = (original as any).areaLabel;
      if (areaLabel && areaLabel instanceof fabric.Textbox) {
        const labelClone = await areaLabel.clone();
        const labelId = 'label-' + Math.random().toString(36).substr(2, 9);
        const center = cloned.getCenterPoint();

        labelClone.set({
          left: center.x,
          top: center.y,
          originX: 'center',
          originY: 'center',
          id: labelId,
          selectable: true,
          evented: true,
        });

        this.canvas.add(labelClone);
        (cloned as any).areaLabel = labelClone;
        (cloned as any).areaLabelId = labelId;
        (cloned as any).areaLinked = true;
      }
    }

    // Kijelölés beállítása külön objektumokra
    const selection = new fabric.ActiveSelection(pastedObjects, {
      canvas: this.canvas,
    });

    this.canvas.setActiveObject(selection);
    this.canvas.requestRenderAll();
    this.snackbar.show('Elemek beillesztve!', 'success');
  }

  private handleBackspaceDuringDrawing(): void {

    if ((this.mode === 'polygon' || this.mode === 'polyline') && this.points.length > 0) {
      // Remove last point
      this.points.pop();
      // Remove last visual circle
      const lastCircle = this.pointCircles.pop();
      if (lastCircle) {
        this.canvas.remove(lastCircle);
      }
      // Remove last line
      const lastLine = this.lines.pop();
      if (lastLine) {
        this.canvas.remove(lastLine);
      }
      // Remove preview line if exists
      if (this.previewLine) {
        this.canvas.remove(this.previewLine);
        this.previewLine = null;
      }
      // Force re-render to update the display
      this.canvas.renderAll();
    }
  }

  private showVertexMarker(x: number, y: number) {
    const zoom = this.canvas.getZoom();
    const baseRadius = 5;

    // Zoom függvényében skálázunk, de adunk min/max határt
    let scaledRadius = baseRadius / zoom;
    if (scaledRadius < 2) scaledRadius = 2;  // minimális méret
    if (scaledRadius > 8) scaledRadius = 6;  // maximális méret

    if (this.hoveredVertexMarker) {
      this.hoveredVertexMarker.set({
        left: x,
        top: y,
        radius: scaledRadius
      });
    } else {
      this.hoveredVertexMarker = new fabric.Circle({
        left: x,
        top: y,
        radius: scaledRadius,
        fill: 'red',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
        excludeFromExport: true
      });
      this.canvas.add(this.hoveredVertexMarker);
    }
    this.canvas.requestRenderAll();
  }

  private removeVertexMarker() {
    if (this.hoveredVertexMarker) {
      this.canvas.remove(this.hoveredVertexMarker);
      this.hoveredVertexMarker = undefined;
      this.canvas.requestRenderAll();
    }
  }

  isThisObjectSelected(obj: fabric.Object): boolean {
    const active = this.canvas.getActiveObject();
    const activeGroup = this.canvas.getActiveObjects(); // lehet több is
    return active === obj || activeGroup.includes(obj);
  }

  onRoomAssignChange() {
    const active = this.canvas?.getActiveObject();
    if (!active || !this.selectedRoomId) return;

    // Mentés a canvas objektumba
    (active as any).roomId = this.selectedRoomId;

    // Kapcsolt areaLabel alapján terület kinyerése
    let areaText = '';
    if ((active as any).areaLabel) {
      areaText = ((active as any).areaLabel as any).text || '';
    }

    const areaValue = this.extractArea(areaText); // Pl. "24.45 m2" -> 24.45

    // PATCH vagy PUT a backend felé
    const updatedRoom = {
      //id: this.selectedRoomId,
      area: areaValue,
    };

    this.api.update('rooms', this.selectedRoomId, updatedRoom).subscribe({
      next: () => {
        // console.log('Room frissítve:', updatedRoom);
        this.loadRooms();
        this.saveToDatabase();
      },
      error: (err) => {
        console.error('Room frissítés sikertelen:', err);
      }
    });

    this.canvas.renderAll();
  }

  extractArea(areaText: string): number {
    if (!areaText) return 0;
    const match = areaText.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }

  loadRooms() {
    this.api.selectAll('rooms').subscribe({
      next: (data) => {
        this.rooms = data.filter((room: any) =>
          //  Number(room.status) === 0 &&
          Number(room.level_id) === Number(this.levelId) &&
          Number(room.building_id) === Number(this.buildingId)
        );
      },
      error: (err) => {
        console.error('Helyiségek betöltése sikertelen', err);
      }
    });
  }

  onRoomUnassign() {

    const active = this.canvas?.getActiveObject();

    if (!active || !this.selectedRoomId) return;
    const updatedRoom = {
      //id: this.selectedRoomId,
      area: 0,
    };

    this.api.update('rooms', this.selectedRoomId, updatedRoom).subscribe({
      next: () => {
        (active as any).roomId = null;
        // console.log('Room frissítve:', updatedRoom);
        this.selectedRoomId = null;
        this.loadRooms();
        this.saveToDatabase();
      },
      error: (err) => {
        console.error('Room frissítés sikertelen:', err);
      }
    });

    this.canvas.renderAll();
  }

  private createPatternCanvas(
    type: string,
    color: string,
    opacity: number,
    size: number
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.lineWidth = 1;
    ctx.globalAlpha = opacity / 100;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    if (type === 'diagonal1') {
      // átlós csík ↘
      ctx.beginPath();
      ctx.moveTo(0, size);
      ctx.lineTo(size, 0);
      ctx.stroke();
    }

    if (type === 'diagonal2') {
      // átlós csík ↗
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size, size);
      ctx.stroke();
    }

    if (type === 'cross') {
      // mindkét átló (X)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size, size);
      ctx.moveTo(0, size);
      ctx.lineTo(size, 0);
      ctx.stroke();
    }

    if (type === 'horizontal') {
      // vízszintes csík
      ctx.beginPath();
      ctx.moveTo(0, size / 2);
      ctx.lineTo(size, size / 2);
      ctx.stroke();
    }

    if (type === 'vertical') {
      // függőleges csík
      ctx.beginPath();
      ctx.moveTo(size / 2, 0);
      ctx.lineTo(size / 2, size);
      ctx.stroke();
    }

    if (type === 'grid') {
      // rács
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, size);
      ctx.moveTo(size, 0);
      ctx.lineTo(size, size);
      ctx.moveTo(0, 0);
      ctx.lineTo(size, 0);
      ctx.moveTo(0, size);
      ctx.lineTo(size, size);
      ctx.stroke();
    }

    if (type === 'dots') {
      // pötty
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas;
  }

  resetFormStyle(type: string) {
    switch (type) {
      case 'text': {
        this.formTextStyle = {
          name: this.generateAutoName('textbox'),
          text: 'Adj meg egy szöveget',
          fill: '#000000',
          fontSize: 20,
          fontFamily: 'Arial',
          fontWeight: 'normal' as 'normal' | 'bold',
          fontStyle: 'normal' as 'normal' | 'italic',
          textAlign: 'left' as 'left' | 'center' | 'right',
          underline: false,
          linethrough: false
        };
        break;
      }
      case 'line': {
        this.formLineStyle = {
          name: this.generateAutoName('line'),
          stroke: '#000000',
          strokeWidth: 2,
          strokeDashArray: 'solid'
        };
        break;
      }
      case 'polyline': {
        this.formPolylineStyle = {
          name: this.generateAutoName('polyline'),
          stroke: '#000000',
          strokeWidth: 2,
          strokeDashArray: 'solid'
        };
        break;
      }
      case 'rect': {
        this.formRectStyle = {
          name: this.generateAutoName('rect'),
          stroke: '#000000',
          strokeWidth: 2,
          strokeDashArray: 'solid',
          fill: '#cccccc',
          fillOpacity: 50,
          fillPattern: 'none' as 'none' | 'diagonal1' | 'diagonal2' | 'cross' | 'horizontal' | 'vertical' | 'grid' | 'dots',
          fillPatternSize: 10
        };
        break;
      }
      case 'ellipse': {
        this.formEllipseStyle = {
          name: this.generateAutoName('ellipse'),
          stroke: '#000000',
          strokeWidth: 2,
          strokeDashArray: 'solid',
          fill: '#cccccc',
          fillOpacity: 50,
          fillPattern: 'none' as 'none' | 'diagonal1' | 'diagonal2' | 'cross' | 'horizontal' | 'vertical' | 'grid' | 'dots',
          fillPatternSize: 10
        };

        break;
      }
      case 'polygon': {
        this.formPolygonStyle = {
          name: this.generateAutoName('polygon'),
          stroke: '#000000',
          strokeWidth: 2,
          strokeDashArray: 'solid',
          fill: '#88ccff',
          fillOpacity: 50,
          fillPattern: 'none' as 'none' | 'diagonal1' | 'diagonal2' | 'cross' | 'horizontal' | 'vertical' | 'grid' | 'dots',
          fillPatternSize: 10
        };
        break;
      }
      case 'image': {
        this.formImageStyle = {
          name: this.generateAutoName('image'),
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
          angle: 0
        };
        break;
      }
      case 'arc': {
        this.formArcStyle = {
          name: this.generateAutoName('arc'),
          stroke: '#000000',
          strokeWidth: 2,
          strokeDashArray: 'solid'
        };
        break;
      }
      case 'template': {
        this.formTemplateStyle = {
          name: this.generateAutoName('template'),
          templateName: '',
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
          angle: 0
        };
        break;
      }
    }

  }

  enableGrid() {
    this.showGrid = true;
    this.canvas.renderAll();
  }

  disableGrid() {
    this.showGrid = false;
    this.canvas.renderAll();
  }

  private updateSnapPoints(): void {
    this.snapPoints = [];

    this.canvas.getObjects().forEach(obj => {
      if ((obj as any).excludeFromExport) return;

      // --- LINE ---
      if (obj.type === 'line') {
        const line = obj as fabric.Line;
        this.snapPoints.push({ x: line.x1!, y: line.y1! });
        this.snapPoints.push({ x: line.x2!, y: line.y2! });
      }

      // --- RECT ---
      if (obj.type === 'rect') {
        const rect = obj as fabric.Rect;
        const left = rect.left!;
        const top = rect.top!;
        const width = rect.width! * rect.scaleX!;
        const height = rect.height! * rect.scaleY!;
        this.snapPoints.push(
          { x: left, y: top },
          { x: left + width, y: top },
          { x: left, y: top + height },
          { x: left + width, y: top + height }
        );
      }

      // --- ELLIPSE ---
      if (obj.type === 'ellipse') {
        const center = obj.getCenterPoint();
        this.snapPoints.push(center);
      }

      // --- POLYGON / POLYLINE ---
      if (obj.type === 'polygon' || obj.type === 'polyline') {
        const poly = obj as fabric.Polygon | fabric.Polyline;
        const matrix = obj.calcTransformMatrix();
        const offsetX = poly.pathOffset?.x || 0;
        const offsetY = poly.pathOffset?.y || 0;

        poly.points.forEach(pt => {
          const p = fabric.util.transformPoint(
            new fabric.Point(pt.x - offsetX, pt.y - offsetY),
            matrix
          );
          this.snapPoints.push({ x: p.x, y: p.y });
        });
      }

      // --- TEXTBOX ---
      if (obj.type === 'textbox') {
        const center = obj.getCenterPoint();
        this.snapPoints.push(center);
      }

      // --- IMAGE ---
      if (obj.type === 'image') {
        const bounds = obj.getBoundingRect();
        this.snapPoints.push(
          { x: bounds.left, y: bounds.top },
          { x: bounds.left + bounds.width, y: bounds.top },
          { x: bounds.left, y: bounds.top + bounds.height },
          { x: bounds.left + bounds.width, y: bounds.top + bounds.height },
          { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
        );
      }

      // --- ARC (fabric.Path) ---
      if (obj.type === 'path') {
        const center = obj.getCenterPoint();
        this.snapPoints.push(center);

        const bounds = obj.getBoundingRect();
        this.snapPoints.push(
          { x: bounds.left, y: bounds.top },
          { x: bounds.left + bounds.width, y: bounds.top },
          { x: bounds.left, y: bounds.top + bounds.height },
          { x: bounds.left + bounds.width, y: bounds.top + bounds.height }
        );
      }
    });
  }

placeTemplateAt(pointer: { x: number; y: number }) {
  if (!this.selectedTemplateObject) {
    this.snackbar.show('Nincs kiválasztott sablon!', 'error');
    return;
  }

  const groupData = JSON.parse(this.selectedTemplateObject.json);

  fabric.Group.fromObject(groupData).then(group => {
    group.set({
      left: pointer.x,
      top: pointer.y,
      originX: 'center',
      originY: 'center',
      selectable: true,
      evented: true,

      // Itt alkalmazzuk a stílusbeállításokat is:
      opacity: this.formTemplateStyle.opacity ?? 1,
      scaleX: this.formTemplateStyle.scaleX ?? 1,
      scaleY: this.formTemplateStyle.scaleY ?? 1,
      angle: this.formTemplateStyle.angle ?? 0
    });

    (group as any).name = this.formTemplateStyle.name;
    (group as any).templateName = this.formTemplateStyle.templateName;
  //  (group as any).type = 'template';

    this.canvas.add(group);
    this.formTemplateStyle.name = this.generateAutoName('template');
  //  this.canvas.setActiveObject(group);
    this.canvas.renderAll();
  });
}


  saveTemplate() {

    const name = this.newTemplate.name.trim();

    if (!name) {
      alert('Adj meg egy nevet a sablonnak!');
      return;
    }

    const active = this.canvas.getActiveObject();

    if (!active) {
      alert('Nincs kijelölt objektum!');
      return;
    }

    const group = active.type === 'activeSelection'
      ? active
      : new fabric.Group([active]);

    const json = JSON.stringify(group.toObject());

    this.savedTemplates.push({ name, json });
    localStorage.setItem('savedTemplates', JSON.stringify(this.savedTemplates));
    // Frissítjük a dropdown-t

    this.newTemplate.name = '';
    alert(`"${name}" sablon elmentve.`);
  }

  loadSavedTemplates(): void {
    const raw = localStorage.getItem('savedTemplates');
    if (raw) {
      try {
        this.savedTemplates = JSON.parse(raw);
      } catch (e) {
        console.error('Hiba a sablonok betöltésekor:', e);
        this.savedTemplates = [];
      }
    } else {
      this.savedTemplates = [];
    }
  }

}

