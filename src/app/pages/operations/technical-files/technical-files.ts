import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { MessageService, ConfirmationService } from 'primeng/api';

import { ServiceOrderService } from '../services/service-order.service';
import { PlanningApiService } from '../services/planning.service';
import { ServiceOrder } from '../interfaces/service-order.interface';
import { TechnicalFile } from '../interfaces/planning.interface';
import { MenuService } from '../../../shared/services/menu.service';

const FILE_TYPE_LABELS: Record<string, string> = {
  PLANO: 'Plano',
  CRONOGRAMA: 'Cronograma',
  PRESUPUESTO: 'Presupuesto',
  OTRO: 'Otro',
};

@Component({
  selector: 'app-technical-files',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    SelectModule,
    TagModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    CardModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './technical-files.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechnicalFilesPage implements OnInit {
  private readonly serviceOrderApi = inject(ServiceOrderService);
  private readonly planningApi = inject(PlanningApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly menuService = inject(MenuService);
  private readonly fb = inject(FormBuilder);

  serviceOrders = signal<ServiceOrder[]>([]);
  selectedOSId = signal<string>('');
  files = signal<TechnicalFile[]>([]);
  loading = signal(false);
  showDialog = signal(false);

  readonly canEdit = computed(() => this.menuService.canEdit('/operations/technical-files'));

  readonly selectedOS = computed(() =>
    this.serviceOrders().find(os => os._id === this.selectedOSId())
  );

  readonly filesByType = computed(() => {
    const all = this.files();
    return {
      PLANO: all.filter(f => f.type === 'PLANO'),
      CRONOGRAMA: all.filter(f => f.type === 'CRONOGRAMA'),
      PRESUPUESTO: all.filter(f => f.type === 'PRESUPUESTO'),
      OTRO: all.filter(f => f.type === 'OTRO'),
    };
  });

  fileForm = this.fb.group({
    name: ['', Validators.required],
    url: ['', Validators.required],
    type: ['OTRO', Validators.required],
  });

  typeOptions = [
    { label: 'Plano', value: 'PLANO' },
    { label: 'Cronograma', value: 'CRONOGRAMA' },
    { label: 'Presupuesto', value: 'PRESUPUESTO' },
    { label: 'Otro', value: 'OTRO' },
  ];

  ngOnInit() {
    this.serviceOrderApi.list().subscribe({
      next: (data) => this.serviceOrders.set(data),
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las OS' }),
    });
  }

  onSelectOS(id: string) {
    this.selectedOSId.set(id);
    this.loadFiles();
  }

  loadFiles() {
    const id = this.selectedOSId();
    if (!id) { this.files.set([]); return; }
    this.loading.set(true);
    this.planningApi.getTechnicalFiles(id).subscribe({
      next: (data) => { this.files.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  openAddDialog() {
    this.fileForm.reset({ name: '', url: '', type: 'OTRO' });
    this.showDialog.set(true);
  }

  saveFile() {
    if (this.fileForm.invalid) return;
    const v = this.fileForm.value;
    const data: Partial<TechnicalFile> = {
      serviceOrderId: this.selectedOSId(),
      name: v.name!,
      url: v.url!,
      type: v.type as TechnicalFile['type'],
    };
    this.planningApi.createTechnicalFile(data).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Archivo registrado' });
        this.showDialog.set(false);
        this.loadFiles();
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar' }),
    });
  }

  deleteFile(file: TechnicalFile) {
    this.confirmationService.confirm({
      message: `¿Eliminar "${file.name}"?`,
      header: 'Confirmar eliminación',
      accept: () => {
        this.planningApi.deleteTechnicalFile(file._id!).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Archivo eliminado' });
            this.loadFiles();
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' }),
        });
      },
    });
  }

  getTypeLabel(type: string) {
    return FILE_TYPE_LABELS[type] ?? type;
  }

  getTypeSeverity(type: string): 'info' | 'success' | 'warn' | 'secondary' {
    switch (type) {
      case 'PLANO': return 'info';
      case 'CRONOGRAMA': return 'success';
      case 'PRESUPUESTO': return 'warn';
      default: return 'secondary';
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'PLANO': return 'pi pi-map';
      case 'CRONOGRAMA': return 'pi pi-calendar';
      case 'PRESUPUESTO': return 'pi pi-dollar';
      default: return 'pi pi-file';
    }
  }
}
