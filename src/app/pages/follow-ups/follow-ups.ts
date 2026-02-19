import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router'; // Added import
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { FollowUpsApiService } from '../../shared/services/follow-ups-api.service';
import { LeadsApiService } from '../../shared/services/leads-api.service';
import { ClientsApiService, ClientOption } from '../../shared/services/clients-api.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import { UserOption } from '../../shared/interfaces/menu-permission.interface';
import {
  FollowUp,
  FollowUpType,
  FollowUpStatus,
  CreateFollowUpRequest,
  UpdateFollowUpRequest,
  FollowUpQueryParams,
} from '../../shared/interfaces/follow-up.interface';
import { Lead } from '../../shared/interfaces/lead.interface';
import {
  PresignedUrlRequest,
  AudioAnalysisRequest,
  AudioAnalysisResponse,
} from '../../shared/interfaces/audio-analysis.interface';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-follow-ups',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    DialogModule,
    SelectModule,
    TooltipModule,
    ToastModule,
    CardModule,
    ConfirmDialogModule,
    TagModule,
    TextareaModule,
    DatePickerModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './follow-ups.html',
  styleUrls: ['./follow-ups.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FollowUpsPage implements OnInit {
  private readonly followUpsApi = inject(FollowUpsApiService);
  private readonly leadsApi = inject(LeadsApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly route = inject(ActivatedRoute); // Injected Route

  // Signals
  selectedLeadId = signal<string | null>(null);
  items = signal<FollowUp[]>([]);
  query = signal<string>('');
  statusFilter = signal<FollowUpStatus | ''>('');
  typeFilter = signal<FollowUpType | ''>('');
  showDialog = signal<boolean>(false);
  showDetailsDialog = signal<boolean>(false);
  editing = signal<Partial<FollowUp> | null>(null);
  viewingFollowUp = signal<FollowUp | null>(null);
  expandedRows = signal<Set<string>>(new Set());

  // Audio Analysis Signals
  showAudioAnalysisDialog = signal<boolean>(false);
  audioAnalysisResult = signal<AudioAnalysisResponse | null>(null);
  uploadingAudio = signal<boolean>(false);
  analyzingAudio = signal<boolean>(false);
  isRecording = signal<boolean>(false);
  mediaRecorder: MediaRecorder | null = null;
  recordedChunks: Blob[] = [];

  // Selectores
  leads = signal<Lead[]>([]);
  clients = signal<ClientOption[]>([]);
  users = signal<UserOption[]>([]);

  // Opciones de enums
  typeOptions: { label: string; value: FollowUpType | '' }[] = [
    { label: 'Todos', value: '' },
    { label: 'Llamada', value: 'CALL' },
    { label: 'Email', value: 'EMAIL' },
    { label: 'Reunión', value: 'MEETING' },
    { label: 'Nota', value: 'NOTE' },
    { label: 'Propuesta', value: 'PROPOSAL' },
    { label: 'Otro', value: 'OTHER' },
  ];

  statusOptions: { label: string; value: FollowUpStatus | '' }[] = [
    { label: 'Todos', value: '' },
    { label: 'Programado', value: 'SCHEDULED' },
    { label: 'Completado', value: 'COMPLETED' },
    { label: 'Cancelado', value: 'CANCELLED' },
  ];

  statusColors: Record<
    FollowUpStatus,
    'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'
  > = {
    SCHEDULED: 'warn',
    COMPLETED: 'success',
    CANCELLED: 'danger',
  };

  // Cache para las fechas para evitar crear nuevos objetos Date en cada render
  private cachedScheduledDate: Date | null = null;
  private cachedScheduledDateString: string | null = null;
  private cachedNextFollowUpDate: Date | null = null;
  private cachedNextFollowUpDateString: string | null = null;

  getScheduledDate(): Date | null {
    const dateString = this.editing()?.scheduledDate;
    if (!dateString) {
      this.cachedScheduledDate = null;
      this.cachedScheduledDateString = null;
      return null;
    }

    // Solo crear un nuevo Date si la string cambió
    if (this.cachedScheduledDateString !== dateString) {
      this.cachedScheduledDate = new Date(dateString);
      this.cachedScheduledDateString = dateString;
    }

    return this.cachedScheduledDate;
  }

  getNextFollowUpDate(): Date | null {
    const dateString = this.editing()?.nextFollowUpDate;
    if (!dateString) {
      this.cachedNextFollowUpDate = null;
      this.cachedNextFollowUpDateString = null;
      return null;
    }

    // Solo crear un nuevo Date si la string cambió
    if (this.cachedNextFollowUpDateString !== dateString) {
      this.cachedNextFollowUpDate = new Date(dateString);
      this.cachedNextFollowUpDateString = dateString;
    }

    return this.cachedNextFollowUpDate;
  }

  onScheduledDateChange(date: Date | null) {
    if (date) {
      const dateString = date.toISOString();
      // Evitar actualización innecesaria si el valor es el mismo
      if (this.editing()?.scheduledDate !== dateString) {
        this.onEditChange('scheduledDate', dateString);
      }
    } else {
      if (this.editing()?.scheduledDate !== undefined) {
        this.onEditChange('scheduledDate', undefined);
      }
    }
  }

  onNextFollowUpDateChange(date: Date | null) {
    if (date) {
      const dateString = date.toISOString();
      // Evitar actualización innecesaria si el valor es el mismo
      if (this.editing()?.nextFollowUpDate !== dateString) {
        this.onEditChange('nextFollowUpDate', dateString);
      }
    } else {
      if (this.editing()?.nextFollowUpDate !== undefined) {
        this.onEditChange('nextFollowUpDate', undefined);
      }
    }
  }

  // Flags para controlar carga lazy
  private usersLoaded = signal<boolean>(false);
  private clientsLoaded = signal<boolean>(false);
  private leadsLoaded = signal<boolean>(false);

  ngOnInit() {
    // Cargar leads y usuarios inmediatamente
    this.loadLeads();
    this.loadUsers();

    // Verificar si hay parámetros de navegación para seleccionar lead automáticamente
    this.route.queryParams.subscribe((params) => {
      if (params['leadId']) {
        this.selectedLeadId.set(params['leadId']);
        this.load();
        if (params['action'] === 'new') {
          this.newItem(params['leadId']);
        }
      }
    });
  }

  constructor() {
    // No usar efectos aquí para evitar loops infinitos
    // La limpieza se manejará manualmente en closeDialog() y closeDetails()
  }

  load() {
    const leadId = this.selectedLeadId();
    if (!leadId) {
      this.items.set([]);
      return;
    }

    const params: FollowUpQueryParams = {
      leadId: leadId,
    };
    const status = this.statusFilter();
    if (status !== '') params.status = status;
    const type = this.typeFilter();
    if (type !== '') params.type = type;

    this.followUpsApi.list(params).subscribe({
      next: (followUps) => {
        // Ordenar de más nuevos a más antiguos por createdAt o scheduledDate
        const sorted = followUps.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.scheduledDate).getTime();
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.scheduledDate).getTime();
          return dateB - dateA; // Más reciente primero
        });
        this.items.set(sorted);
      },
      error: (error) => {
        console.error('Error loading follow-ups:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los seguimientos',
        });
      },
    });
  }

  onLeadSelected(leadId: string | null) {
    this.selectedLeadId.set(leadId);
    this.clearFilters();
    this.load();
  }

  loadUsers() {
    this.usersApi.list().subscribe({
      next: (users) => this.users.set(users),
      error: () => this.users.set([]),
    });
  }

  loadClients() {
    this.clientsApi.list().subscribe({
      next: (clients) => this.clients.set(clients),
      error: () => this.clients.set([]),
    });
  }

  loadLeads() {
    this.leadsApi.list().subscribe({
      next: (leads) => this.leads.set(leads),
      error: () => this.leads.set([]),
    });
  }

  setStatusFilter(value: FollowUpStatus | '') {
    this.statusFilter.set(value);
    this.load();
  }

  setTypeFilter(value: FollowUpType | '') {
    this.typeFilter.set(value);
    this.load();
  }

  clearFilters() {
    this.statusFilter.set('');
    this.typeFilter.set('');
    this.load();
  }

  newItem(preselectedLeadId?: string) {
    const leadId = preselectedLeadId || this.selectedLeadId();
    if (!leadId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Debes seleccionar un lead primero',
      });
      return;
    }

    // Cargar datos si no se han cargado antes
    if (!this.clientsLoaded()) {
      this.loadClients();
      this.clientsLoaded.set(true);
    }
    if (!this.leadsLoaded()) {
      this.loadLeads();
      this.leadsLoaded.set(true);
    }

    // Preparar el objeto de edición antes de abrir el diálogo
    const newEditing: Partial<FollowUp> = {
      title: '',
      description: '',
      type: 'CALL',
      status: 'SCHEDULED',
      scheduledDate: new Date().toISOString(),
      userId: '',
      leadId: leadId,
    };
    this.editing.set(newEditing);
    this.showDialog.set(true);
  }

  editItem(item: FollowUp) {
    this.editing.set({ ...item });
    this.showDialog.set(true);
  }

  viewDetails(item: FollowUp) {
    this.viewingFollowUp.set(item);
    this.showDetailsDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
    // Limpiar editing y cache cuando se cierra el diálogo
    this.editing.set(null);
    this.cachedScheduledDate = null;
    this.cachedScheduledDateString = null;
    this.cachedNextFollowUpDate = null;
    this.cachedNextFollowUpDateString = null;

    // Detener grabación si está activa al cerrar el diálogo principal (por seguridad)
    if (this.isRecording()) {
      this.stopRecording();
    }
  }

  closeDetails() {
    this.showDetailsDialog.set(false);
    // Limpiar viewingFollowUp cuando se cierra el diálogo de detalles
    this.viewingFollowUp.set(null);
  }

  onEditChange<K extends keyof FollowUp>(key: K, value: FollowUp[K] | undefined) {
    const cur = this.editing();
    if (!cur) return;

    // Evitar actualización si el valor no cambió
    if (cur[key] === value) {
      return;
    }

    this.editing.set({ ...cur, [key]: value as FollowUp[K] });
  }

  save() {
    const item = this.editing();
    if (!item) return;

    const validationErrors = this.validateForm(item);
    if (validationErrors.length > 0) {
      validationErrors.forEach((error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error de validación',
          detail: error,
        });
      });
      return;
    }

    // Generar título automático si no existe
    const title =
      item.title ||
      `Seguimiento - ${this.getTypeLabel(
        item.type || 'CALL'
      )} - ${new Date().toLocaleDateString()}`;

    if (item._id) {
      const updatePayload: UpdateFollowUpRequest = {
        title: title,
        description: item.description,
        type: item.type,
        status: item.status,
        scheduledDate: item.scheduledDate,
        leadId: item.leadId,
        clientId: item.clientId,
        userId: item.userId,
        attachments: item.attachments,
        outcome: item.outcome,
        nextFollowUpDate: item.nextFollowUpDate,
      };
      this.followUpsApi.update(item._id, updatePayload).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Seguimiento actualizado correctamente',
          });
          this.closeDialog();
          this.load();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getErrorMessage(error),
          });
        },
      });
    } else {
      const createPayload: CreateFollowUpRequest = {
        title: title,
        description: item.description!,
        type: item.type!,
        status: item.status,
        scheduledDate: item.scheduledDate!,
        leadId: item.leadId,
        clientId: item.clientId,
        userId: item.userId!,
        attachments: item.attachments,
        outcome: item.outcome,
        nextFollowUpDate: item.nextFollowUpDate,
      };
      this.followUpsApi.create(createPayload).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Seguimiento creado correctamente',
          });
          this.closeDialog();
          this.load();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getErrorMessage(error),
          });
        },
      });
    }
  }

  remove(item: FollowUp) {
    if (!item._id) return;

    this.confirmationService.confirm({
      message: `¿Estás seguro de que quieres eliminar el seguimiento "${item.title}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.followUpsApi.delete(item._id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Seguimiento eliminado correctamente',
            });
            this.load();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: this.getErrorMessage(error),
            });
          },
        });
      },
    });
  }

  getTypeLabel(type: FollowUpType): string {
    const option = this.typeOptions.find((o) => o.value === type);
    return option ? option.label : type;
  }

  getStatusLabel(status: FollowUpStatus): string {
    const option = this.statusOptions.find((o) => o.value === status);
    return option ? option.label : status;
  }

  getStatusSeverity(
    status: FollowUpStatus
  ): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    return this.statusColors[status] || 'info';
  }

  getUserName(id: string | undefined): string {
    if (!id) {
      return 'Sin asignar';
    }
    const user = this.users().find((u) => u._id === id);
    return user ? user.name : id;
  }

  getLeadName(id: string | undefined): string {
    if (!id) {
      return '-';
    }
    const lead = this.leads().find((l) => l._id === id);
    return lead ? lead.name : id;
  }

  getClientName(id: string | undefined): string {
    if (!id) {
      return '-';
    }
    const client = this.clients().find((c) => c._id === id);
    return client ? client.name : id;
  }

  toggleRow(rowId: string | undefined) {
    if (!rowId) return;
    const expanded = new Set(this.expandedRows());
    if (expanded.has(rowId)) {
      expanded.delete(rowId);
    } else {
      expanded.add(rowId);
    }
    this.expandedRows.set(expanded);
  }

  isRowExpanded(rowId: string | undefined): boolean {
    if (!rowId) return false;
    return this.expandedRows().has(rowId);
  }

  /**
   * Obtiene el número de seguimiento basado en su posición en la lista ordenada
   * (1 = más reciente, 2 = segundo más reciente, etc.)
   */
  getFollowUpNumber(followUp: FollowUp): number {
    const items = this.items();
    const index = items.findIndex((item) => item._id === followUp._id);
    return index !== -1 ? index + 1 : 0;
  }

  private validateForm(item: Partial<FollowUp>): string[] {
    const errors: string[] = [];

    if (!item.description || item.description.trim() === '') {
      errors.push('La descripción del seguimiento es requerida');
    }

    if (!item.type) {
      errors.push('El tipo de seguimiento es requerido');
    }

    if (!item.scheduledDate) {
      errors.push('La fecha programada es requerida');
    }

    if (!item.userId || item.userId.trim() === '') {
      errors.push('Debe asignar el seguimiento a un usuario');
    }

    if (!item.leadId) {
      errors.push('Debe asociar el seguimiento a un lead');
    }

    return errors;
  }

  private getErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    if (!error || typeof error !== 'object') {
      return 'Ha ocurrido un error inesperado';
    }

    const errorObject = error as { message?: unknown; error?: unknown };

    if (errorObject.error && typeof errorObject.error === 'object') {
      const nested = errorObject.error as { message?: unknown; error?: unknown };
      if (typeof nested.message === 'string') {
        return nested.message;
      }
      if (typeof nested.error === 'string') {
        return nested.error;
      }
      try {
        return JSON.stringify(nested.error ?? nested);
      } catch {
        // Ignorar error de serialización y continuar
      }
    } else if (typeof errorObject.error === 'string') {
      return errorObject.error;
    }

    if (typeof errorObject.message === 'string') {
      return errorObject.message;
    }

    return 'Ha ocurrido un error inesperado';
  }

  // ========== MÉTODOS DE GRABACIÓN Y ANÁLISIS DE AUDIO ==========

  openAudioAnalysisDialog() {
    const currentEditing = this.editing();
    // Validar que haya un lead seleccionado para asociar el análisis
    if (!currentEditing?.leadId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Requerido',
        detail: 'Debes seleccionar un Lead antes de grabar audio',
      });
      return;
    }
    this.showAudioAnalysisDialog.set(true);
    this.audioAnalysisResult.set(null);
  }

  closeAudioAnalysisDialog() {
    this.showAudioAnalysisDialog.set(false);
    this.audioAnalysisResult.set(null);
    if (this.isRecording()) {
      this.stopRecording();
    }
  }

  async toggleRecording() {
    if (this.isRecording()) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        this.processRecordedAudio();
      };

      this.mediaRecorder.start();
      this.isRecording.set(true);

      this.messageService.add({
        severity: 'info',
        summary: 'Grabando',
        detail: 'Haz clic en "Detener" para analizar.',
        life: 3000,
      });
    } catch (error) {
      console.error('Error al iniciar la grabación:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo acceder al micrófono.',
      });
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
    }
  }

  async processRecordedAudio() {
    if (this.recordedChunks.length === 0) return;

    const currentEditing = this.editing();
    if (!currentEditing?.leadId) return;

    const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm;codecs=opus' });
    const fileName = `followup-recording-${Date.now()}.webm`;
    const audioFile = new File([audioBlob], fileName, { type: 'audio/webm;codecs=opus' });
    this.recordedChunks = [];

    try {
      this.uploadingAudio.set(true);

      // 1. Presigned URL (Usamos LeadsApiService porque el endpoint está ahí por ahora)
      const presignedRequest: PresignedUrlRequest = {
        fileName: fileName,
        contentType: 'audio/webm',
        expirationTime: 3600,
      };

      const presignedResponse = await firstValueFrom(
        this.leadsApi.getPresignedUrlForAudio(currentEditing.leadId, presignedRequest)
      );

      // 2. Upload S3
      const uploadResponse = await fetch(presignedResponse.presignedUrl, {
        method: 'PUT',
        body: audioFile,
        headers: { 'Content-Type': 'audio/webm' },
      });

      if (!uploadResponse.ok) throw new Error('Error al subir audio');

      // 3. Analyze
      this.uploadingAudio.set(false);
      this.analyzingAudio.set(true);

      const analysisRequest: AudioAnalysisRequest = {
        audioUrl: presignedResponse.publicUrl,
        leadId: currentEditing.leadId,
      };

      const analysisResult = await firstValueFrom(
        this.leadsApi.analyzeAudio(currentEditing.leadId, analysisRequest)
      );

      this.audioAnalysisResult.set(analysisResult);
      this.analyzingAudio.set(false);

      // 4. Autocompletar campos del seguimiento
      this.applyAnalysisToForm(analysisResult);

      this.messageService.add({
        severity: 'success',
        summary: 'Análisis completado',
        detail: 'Se han completado la descripción y resultado automáticamente.',
      });
    } catch (error) {
      this.uploadingAudio.set(false);
      this.analyzingAudio.set(false);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: this.getErrorMessage(error),
      });
    }
  }

  applyAnalysisToForm(result: AudioAnalysisResponse) {
    const cur = this.editing();
    if (!cur) return;

    // Construir descripción desde el resumen
    const newDescription = result.summary;

    // Construir outcome (resultado) desde acuerdos y acciones
    let newOutcome = '';
    if (result.agreements?.length) {
      newOutcome += 'ACUERDOS:\n' + result.agreements.map((a) => `- ${a}`).join('\n') + '\n\n';
    }
    if (result.followUpActions?.length) {
      newOutcome += 'ACCIONES:\n' + result.followUpActions.map((a) => `- ${a}`).join('\n');
    }

    this.editing.set({
      ...cur,
      description: newDescription,
      outcome: newOutcome,
      // Si se detecta "negative", podríamos sugerir un estado o flag, pero por ahora texto
    });

    // Cerrar el modal de análisis ya que los datos se pasaron al form
    this.closeAudioAnalysisDialog();
  }
}
