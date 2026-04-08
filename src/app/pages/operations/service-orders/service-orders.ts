import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  effect,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { CardModule } from 'primeng/card';

import { ServiceOrderService } from '../services/service-order.service';
import { ServiceOrder } from '../interfaces/service-order.interface';
import { ProjectsApiService } from '../../../shared/services/projects-api.service';
import { Project } from '../../../shared/interfaces/project.interface';
import { MenuService } from '../../../shared/services/menu.service';

@Component({
  selector: 'app-service-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    DialogModule,
    SelectModule,
    DatePickerModule,
    TagModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    CardModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './service-orders.html',
  styleUrl: './service-orders.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceOrdersPage implements OnInit {
  private readonly serviceOrderApi = inject(ServiceOrderService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly menuService = inject(MenuService);
  private readonly fb = inject(FormBuilder);

  // Signals
  serviceOrders = signal<ServiceOrder[]>([]);
  projects = signal<Project[]>([]);
  loading = signal<boolean>(false);
  showDialog = signal<boolean>(false);
  editing = signal<ServiceOrder | null>(null);
  query = signal<string>('');
  expandedRows = signal<Set<string>>(new Set());

  // Formulario
  osForm = this.fb.group({
    code: ['', Validators.required],
    projectId: ['', Validators.required],
    description: ['', Validators.required],
    receptionDate: [new Date(), Validators.required],
    status: ['PENDIENTE'],
    emailReference: [''],
  });

  statusOptions = [
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'En Proceso', value: 'EN_PROCESO' },
    { label: 'Completado', value: 'COMPLETADO' },
    { label: 'Cancelado', value: 'CANCELADO' },
  ];

  readonly canEdit = computed(() => this.menuService.canEdit('/operations/service-orders'));

  constructor() {
    effect(() => {
      if (!this.showDialog()) {
        this.editing.set(null);
        this.osForm.reset({
          code: '',
          projectId: '',
          description: '',
          receptionDate: new Date(),
          status: 'PENDIENTE',
          emailReference: '',
        });
      }
    });
  }

  ngOnInit() {
    this.loadServiceOrders();
    this.loadProjects();
  }

  loadServiceOrders() {
    this.loading.set(true);
    this.serviceOrderApi.list({ q: this.query() }).subscribe({
      next: (data) => {
        this.serviceOrders.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las órdenes' });
        this.loading.set(false);
      }
    });
  }

  loadProjects() {
    this.projectsApi.list().subscribe({
      next: (data) => this.projects.set(data),
      error: (err) => console.error(err)
    });
  }

  newOS() {
    this.showDialog.set(true);
  }

  editOS(os: ServiceOrder) {
    this.editing.set(os);
    this.osForm.patchValue({
      code: os.code,
      projectId: typeof os.projectId === 'object' ? os.projectId._id : os.projectId,
      description: os.description,
      receptionDate: os.receptionDate ? new Date(os.receptionDate) : new Date(),
      status: os.status,
      emailReference: os.emailReference || '',
    });
    this.showDialog.set(true);
  }

  save() {
    if (this.osForm.invalid) return;

    const formValue = this.osForm.value;
    const data: Partial<ServiceOrder> = {
      code: formValue.code!,
      projectId: formValue.projectId!,
      description: formValue.description!,
      receptionDate: formValue.receptionDate!,
      status: formValue.status as any,
      emailReference: formValue.emailReference || '',
    };

    const operation = this.editing() 
      ? this.serviceOrderApi.update(this.editing()!._id!, data)
      : this.serviceOrderApi.create(data);

    operation.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Orden guardada' });
        this.showDialog.set(false);
        this.loadServiceOrders();
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la orden' });
      }
    });
  }

  deleteOS(os: ServiceOrder) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de eliminar esta orden?',
      header: 'Confirmar eliminación',
      accept: () => {
        this.serviceOrderApi.delete(os._id!).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Orden eliminada' });
            this.loadServiceOrders();
          },
          error: (err) => console.error(err)
        });
      }
    });
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    switch (status) {
      case 'PENDIENTE': return 'warn';
      case 'EN_PROCESO': return 'info';
      case 'COMPLETADO': return 'success';
      case 'CANCELADO': return 'danger';
      default: return 'info';
    }
  }

  getStatusLabel(status: string): string {
    return this.statusOptions.find(o => o.value === status)?.label ?? status;
  }

  getProjectName(proj: any): string {
    if (!proj) return '-';
    return typeof proj === 'object' ? proj.name : proj;
  }

  toggleRow(id: string | undefined) {
    if (!id) return;
    this.expandedRows.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  isRowExpanded(id: string | undefined): boolean {
    return !!id && this.expandedRows().has(id);
  }
}
