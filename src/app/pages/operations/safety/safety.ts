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
import { TextareaModule } from 'primeng/textarea';
import { CardModule } from 'primeng/card';
import { MessageService, ConfirmationService } from 'primeng/api';

import { ServiceOrderService } from '../services/service-order.service';
import { PlanningApiService } from '../services/planning.service';
import { ServiceOrder } from '../interfaces/service-order.interface';
import { SafetyDocument } from '../interfaces/planning.interface';
import { MenuService } from '../../../shared/services/menu.service';

@Component({
  selector: 'app-safety',
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
    TextareaModule,
    CardModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './safety.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SafetyPage implements OnInit {
  private readonly serviceOrderApi = inject(ServiceOrderService);
  private readonly planningApi = inject(PlanningApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly menuService = inject(MenuService);
  private readonly fb = inject(FormBuilder);

  serviceOrders = signal<ServiceOrder[]>([]);
  selectedOSId = signal<string>('');
  docs = signal<SafetyDocument[]>([]);
  loading = signal(false);
  showAddDialog = signal(false);
  showRejectDialog = signal(false);
  rejectingDocId = signal<string>('');

  readonly canEdit = computed(() => this.menuService.canEdit('/operations/safety'));

  readonly pets = computed(() => this.docs().filter(d => d.type === 'PETS'));
  readonly iperc = computed(() => this.docs().filter(d => d.type === 'IPERC'));

  addForm = this.fb.group({
    type: ['PETS', Validators.required],
    name: ['', Validators.required],
    url: ['', Validators.required],
    description: [''],
    version: [''],
  });

  rejectForm = this.fb.group({
    reason: ['', Validators.required],
  });

  typeOptions = [
    { label: 'PETS – Procedimiento Escrito de Trabajo Seguro', value: 'PETS' },
    { label: 'IPERC – Identificación de Peligros, Evaluación de Riesgos y Controles', value: 'IPERC' },
  ];

  ngOnInit() {
    this.serviceOrderApi.list().subscribe({ next: (data) => this.serviceOrders.set(data) });
  }

  onSelectOS(id: string) {
    this.selectedOSId.set(id);
    this.loadDocs();
  }

  loadDocs() {
    const id = this.selectedOSId();
    if (!id) { this.docs.set([]); return; }
    this.loading.set(true);
    this.planningApi.getSafetyDocs(id).subscribe({
      next: (data) => { this.docs.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openAddDialog() {
    this.addForm.reset({ type: 'PETS', name: '', url: '', description: '', version: '' });
    this.showAddDialog.set(true);
  }

  saveDoc() {
    if (this.addForm.invalid) return;
    const v = this.addForm.value;
    const data: Partial<SafetyDocument> = {
      serviceOrderId: this.selectedOSId(),
      type: v.type as 'PETS' | 'IPERC',
      name: v.name!,
      url: v.url!,
      description: v.description || undefined,
      version: v.version || undefined,
    };
    this.planningApi.createSafetyDoc(data).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Registrado', detail: 'Documento de seguridad registrado' });
        this.showAddDialog.set(false);
        this.loadDocs();
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo registrar el documento' }),
    });
  }

  sendToReview(doc: SafetyDocument) {
    this.planningApi.sendToReview(doc._id!).subscribe({
      next: () => {
        this.messageService.add({ severity: 'info', summary: 'En Revisión', detail: `"${doc.name}" enviado a revisión` });
        this.loadDocs();
      },
    });
  }

  approve(doc: SafetyDocument) {
    this.confirmationService.confirm({
      message: `¿Aprobar el documento "${doc.name}"?`,
      header: 'Confirmar aprobación',
      accept: () => {
        this.planningApi.approveSafetyDoc(doc._id!).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Aprobado', detail: `"${doc.name}" aprobado` });
            this.loadDocs();
          },
        });
      },
    });
  }

  openRejectDialog(doc: SafetyDocument) {
    this.rejectingDocId.set(doc._id!);
    this.rejectForm.reset({ reason: '' });
    this.showRejectDialog.set(true);
  }

  submitRejection() {
    if (this.rejectForm.invalid) return;
    this.planningApi.rejectSafetyDoc(this.rejectingDocId(), this.rejectForm.value.reason!).subscribe({
      next: () => {
        this.messageService.add({ severity: 'warn', summary: 'Rechazado', detail: 'Documento rechazado' });
        this.showRejectDialog.set(false);
        this.loadDocs();
      },
    });
  }

  deleteDoc(doc: SafetyDocument) {
    this.confirmationService.confirm({
      message: `¿Eliminar "${doc.name}"?`,
      header: 'Confirmar eliminación',
      accept: () => {
        this.planningApi.deleteSafetyDoc(doc._id!).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Documento eliminado' });
            this.loadDocs();
          },
        });
      },
    });
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'APROBADO': return 'success';
      case 'EN_REVISION': return 'info';
      case 'RECHAZADO': return 'danger';
      default: return 'secondary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'Pendiente';
      case 'EN_REVISION': return 'En Revisión';
      case 'APROBADO': return 'Aprobado';
      case 'RECHAZADO': return 'Rechazado';
      default: return status;
    }
  }
}
