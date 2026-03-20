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
import { ContactsCrmApiService } from '../../shared/services/contacts-crm-api.service';
import { ClientsApiService, ClientOption } from '../../shared/services/clients-api.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import { AgendaApiService } from '../../shared/services/agenda-api.service';
import { UserOption } from '../../shared/interfaces/menu-permission.interface';
import {
  FollowUp,
  FollowUpType,
  FollowUpStatus,
  CreateFollowUpRequest,
  UpdateFollowUpRequest,
  FollowUpQueryParams,
} from '../../shared/interfaces/follow-up.interface';
import { ContactCrm } from '../../shared/interfaces/contact-crm.interface';
import { LeadsApiService } from '../../shared/services/leads-api.service';
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
  private readonly contactsCrmApi = inject(ContactsCrmApiService);
  private readonly leadsApi = inject(LeadsApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly route = inject(ActivatedRoute); // Injected Route
  private readonly agendaApi = inject(AgendaApiService);

  // Signals
  selectedContactId = signal<string | null>(null);
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
  contacts = signal<ContactCrm[]>([]);
  clients = signal<ClientOption[]>([]);
  users = signal<UserOption[]>([]);

  // Opciones de enums
  // Usar una lista para filtros (incluye "Todos") y otra para el formulario (sin "Todos")
  typeFilterOptions: { label: string; value: FollowUpType | '' }[] = [
    { label: 'Todos', value: '' },
    { label: 'Llamada', value: 'CALL' },
    { label: 'Email', value: 'EMAIL' },
    { label: 'Reunión', value: 'MEETING' },
    { label: 'Nota', value: 'NOTE' },
    { label: 'Propuesta', value: 'PROPOSAL' },
    { label: 'Otro', value: 'OTHER' },
  ];

  typeOptions: { label: string; value: FollowUpType }[] = [
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
  private contactsLoaded = signal<boolean>(false);

  ngOnInit() {
    this.loadContacts();
    this.loadUsers();
    this.load();

    this.route.queryParams.subscribe((params) => {
      const leadId = params['leadId'] as string | undefined;
      const contactId = params['contactId'] as string | undefined;

      if (contactId) {
        this.selectedContactId.set(contactId);
      }

      if (leadId || contactId) {
        this.load();
      }

      if (params['action'] === 'new') {
        this.newItem(leadId, contactId);
      }
    });
  }

  constructor() {
    // No usar efectos aquí para evitar loops infinitos
    // La limpieza se manejará manualmente en closeDialog() y closeDetails()
  }

  load() {
    const params: FollowUpQueryParams = {};
    const contactId = this.selectedContactId();
    if (contactId) params.contactId = contactId;
    const status = this.statusFilter();
    if (status !== '') params.status = status;
    const type = this.typeFilter();
    if (type !== '') params.type = type;

    this.followUpsApi.list(params).subscribe({
      next: (followUps) => {
        // Ordenar de más nuevos a más antiguos por createdAt o scheduledDate
        const sorted = followUps.sort((a, b) => {
          const dateA = a.createdAt
            ? new Date(a.createdAt).getTime()
            : a.scheduledDate
              ? new Date(a.scheduledDate).getTime()
              : 0;
          const dateB = b.createdAt
            ? new Date(b.createdAt).getTime()
            : b.scheduledDate
              ? new Date(b.scheduledDate).getTime()
              : 0;
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

  onContactSelected(contactId: string | null) {
    this.selectedContactId.set(contactId);
    this.clearFilters();
    this.load();
  }

  loadUsers() {
    this.usersApi.listAllForSelect().subscribe({
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

  loadContacts() {
    this.contactsCrmApi.list().subscribe({
      next: (contacts) => this.contacts.set(contacts),
      error: () => this.contacts.set([]),
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

  newItem(preselectedLeadId?: string, preselectedContactId?: string) {
    const leadId = preselectedLeadId || undefined;
    const contactId = preselectedContactId || this.selectedContactId() || undefined;

    if (!this.contactsLoaded()) {
      this.loadContacts();
      this.contactsLoaded.set(true);
    }
    if (!this.clientsLoaded()) {
      this.loadClients();
      this.clientsLoaded.set(true);
    }

    const newEditing: Partial<FollowUp> = {
      title: '',
      description: '',
      type: 'NOTE',
      status: 'SCHEDULED',
      scheduledDate: new Date().toISOString(),
      userId: '',
      leadId: leadId ?? undefined,
      contactId: contactId ?? undefined,
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

    const title = item.title?.trim() || `Seguimiento ${new Date().toLocaleDateString()}`;

    if (item._id) {
      const updatePayload: UpdateFollowUpRequest = {
        title: title || undefined,
        description: item.description ?? undefined,
        type: item.type,
        status: item.status,
        scheduledDate: item.scheduledDate,
        leadId: item.leadId || undefined,
        contactId: item.contactId || undefined,
        clientId: item.clientId,
        userId: item.userId || undefined,
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
        title: title || undefined,
        description: item.description ?? undefined,
        type: item.type,
        status: item.status,
        scheduledDate: item.scheduledDate ?? new Date().toISOString(),
        leadId: item.leadId || undefined,
        contactId: item.contactId || this.selectedContactId() || undefined,
        clientId: item.clientId,
        userId: item.userId || undefined,
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

  getContactName(id: string | undefined): string {
    if (!id) return '—';
    return this.contacts().find((c) => c._id === id)?.name ?? '—';
  }

  getTypeColorClass(type?: FollowUpType): string {
    const map: Record<string, string> = {
      CALL: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400',
      EMAIL: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
      MEETING: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
      NOTE: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400',
      PROPOSAL: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
      OTHER: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    };
    return type ? (map[type] ?? 'bg-gray-100 text-gray-500') : 'bg-gray-100 text-gray-500';
  }

  getTypeIcon(type?: FollowUpType): string {
    const map: Record<string, string> = {
      CALL: 'pi pi-phone',
      EMAIL: 'pi pi-envelope',
      MEETING: 'pi pi-users',
      NOTE: 'pi pi-file-edit',
      PROPOSAL: 'pi pi-file',
      OTHER: 'pi pi-ellipsis-h',
    };
    return type ? (map[type] ?? 'pi pi-circle') : 'pi pi-circle';
  }

  getTypeLabel(type: FollowUpType | undefined): string {
    if (!type) return '—';
    const option = this.typeOptions.find((o) => o.value === type);
    return option ? option.label : type;
  }

  getStatusLabel(status: FollowUpStatus | undefined): string {
    if (!status) return '—';
    const option = this.statusOptions.find((o) => o.value === status);
    return option ? option.label : status;
  }

  getStatusSeverity(
    status: FollowUpStatus | undefined,
  ): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    if (!status) return 'secondary';
    return this.statusColors[status] || 'info';
  }

  getUserName(id: string | undefined): string {
    if (!id) {
      return 'Sin asignar';
    }
    const user = this.users().find((u) => u._id === id);
    return user ? user.name : id;
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

  private validateForm(_item: Partial<FollowUp>): string[] {
    // Ningún campo es obligatorio; validación mínima solo para formato si se desea en el futuro
    return [];
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

  async openAudioAnalysisDialog() {
    const currentEditing = this.editing();
    // Validar que haya un seguimiento en edición
    if (!currentEditing) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Requerido',
        detail: 'Debes crear o editar un seguimiento antes de grabar audio',
      });
      return;
    }
    this.showAudioAnalysisDialog.set(true);
    this.audioAnalysisResult.set(null);
    await this.startRecording();
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

    const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm;codecs=opus' });
    const fileName = `followup-recording-${Date.now()}.webm`;
    const audioFile = new File([audioBlob], fileName, { type: 'audio/webm;codecs=opus' });
    this.recordedChunks = [];

    try {
      this.analyzingAudio.set(true);

      // Usar el mismo servicio de transcripción que Agenda (Whisper)
      const result = await firstValueFrom(this.agendaApi.transcribe(audioFile));
      this.analyzingAudio.set(false);

      // Autocompletar descripción con la transcripción literal
      this.applyTranscriptionToForm(result?.text ?? '');

      this.messageService.add({
        severity: 'success',
        summary: 'Transcripción completada',
        detail: 'La descripción se ha rellenado con lo que se grabó.',
      });
    } catch (error) {
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

  applyTranscriptionToForm(text: string) {
    const cur = this.editing();
    if (!cur) return;

    this.editing.set({
      ...cur,
      description: text,
    });

    this.closeAudioAnalysisDialog();
  }
}
