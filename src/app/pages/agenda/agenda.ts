import { Component, OnInit, signal, inject, computed, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';
import { MenuModule } from 'primeng/menu';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService, ConfirmationService, MenuItem } from 'primeng/api';
import { AgendaApiService } from '../../shared/services/agenda-api.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import { AreasApiService } from '../../shared/services/areas-api.service';
import { ProfileApiService } from '../../shared/services/profile-api.service';
import { MicrosoftGraphService } from '../../shared/services/microsoft-graph.service';
import { AuthService } from '../login/services/auth.service';
import { MenuService } from '../../shared/services/menu.service';
import { TenantService } from '../../core/services/tenant.service';
import type {
  AgendaNote,
  AgendaNoteType,
  AgendaNoteStatus,
  AgendaNoteUser,
} from '../../shared/interfaces/agenda-note.interface';
import type { UserOption } from '../../shared/interfaces/menu-permission.interface';
import { Router } from '@angular/router';
import { firstValueFrom, of, timer } from 'rxjs';
import { tap, map, catchError, finalize, switchMap } from 'rxjs/operators';

const NOTE_TYPE_OPTIONS: { label: string; value: AgendaNoteType; icon: string }[] = [
  { label: 'Texto', value: 'text', icon: 'pi pi-pencil' },
  { label: 'Voz', value: 'voice', icon: 'pi pi-microphone' },
  { label: 'Dibujo', value: 'drawing', icon: 'pi pi-palette' },
];

const STATUS_OPTIONS: { label: string; value: AgendaNoteStatus }[] = [
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'En proceso', value: 'en_proceso' },
  { label: 'Terminado', value: 'terminado' },
];

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TextareaModule,
    CardModule,
    DialogModule,
    SelectButtonModule,
    SelectModule,
    MenuModule,
    TableModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    DatePickerModule,
    CheckboxModule,
    TagModule,
    IconFieldModule,
    InputIconModule,
  ],
  templateUrl: './agenda.html',
  styleUrl: './agenda.scss',
  providers: [MessageService, ConfirmationService],
})
export class AgendaPage implements OnInit {
  private readonly agendaApi = inject(AgendaApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly profileApi = inject(ProfileApiService);
  private readonly areasApi = inject(AreasApiService);
  public readonly authService = inject(AuthService);
  public readonly msGraphService = inject(MicrosoftGraphService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly menuService = inject(MenuService);
  private readonly router = inject(Router);
  private readonly tenantService = inject(TenantService);

  readonly canEdit = computed(() => this.menuService.canEdit('/agenda'));

  constructor() {
    // Auto-cargar eventos al loguearse o al entrar a la pestaña si ya está logueado
    effect(() => {
      if (this.msGraphService.isLoggedIn() && this.activeTab() === 'meetings') {
        this.loadMsEvents();
      }
    });
  }

  /** True si el usuario actual está en la lista de asignados de la nota. */
  isAssignedToMe(note: AgendaNote): boolean {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId || !note.assignedTo?.length) return false;
    return note.assignedTo.some((a) => {
      const id = typeof a === 'string' ? a : (a as AgendaNoteUser)?._id;
      return id === userId;
    });
  }

  /** True si el usuario actual es el creador de la nota. */
  isCreator(note: AgendaNote): boolean {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return false;
    const creatorId =
      typeof note.createdBy === 'string' ? note.createdBy : (note.createdBy as AgendaNoteUser)?._id;
    return creatorId === userId;
  }

  /** True si el usuario puede editar la nota por completo (asignar, compartir, eliminar, editar contenido). Gerencia o creador. */
  canEditFull(note: AgendaNote): boolean {
    return this.canEdit() && (this.authService.isGerencia() || this.isCreator(note));
  }

  /** True si el usuario puede editar el estado de la nota (permiso completo o estar asignado). */
  canEditStatus(note: AgendaNote): boolean {
    return this.canEditFull(note) || this.isAssignedToMe(note);
  }

  /** True si el usuario es Gerencia. */
  isGerencia(): boolean {
    return this.authService.isGerencia();
  }

  isOverdue(note: AgendaNote): boolean {
    if (!note.dueAt || note.status === 'terminado') return false;
    return new Date(note.dueAt).getTime() < Date.now();
  }

  getRowClass(note: AgendaNote): string {
    if (note.status === 'terminado') return 'row-finished';
    if (this.isOverdue(note)) return 'row-overdue';
    if (note.status === 'pendiente') return 'row-pending';
    return '';
  }

  /** Indica si el navegador soporta la API nativa de compartir. */
  hasNativeShare(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.share;
  }

  /** URL absoluta de la página de agenda (para compartir). */
  getAgendaLink(): string {
    const path = this.router.serializeUrl(this.router.createUrlTree(['/agenda']));
    return `${window.location.origin}${path}`;
  }

  /** Construye el texto a compartir según el tipo de nota (link + contenido real). */
  getShareText(note: AgendaNote): string {
    const link = this.getAgendaLink();
    const base = 'Tienes una nueva tarea asignada.';
    if (note.type === 'text') {
      const contenido = (note.content ?? '').trim();
      return contenido ? `${base}\n\n${contenido}\n\n${link}` : `${base}\n\n${link}`;
    }
    if (note.type === 'voice') {
      const transcripcion = (note.content ?? '').trim();
      return transcripcion
        ? `${base}\n\nTranscripción:\n${transcripcion}\n\n${link}`
        : `${base}\n\n${link}`;
    }
    if (note.type === 'drawing') {
      const imgUrl = note.drawingUrl?.[0];
      const verDibujo = imgUrl ? `Ver dibujo: ${imgUrl}\n\n` : 'Ver enlace para el dibujo.\n\n';
      return `${base} ${verDibujo}${link}`;
    }
    return `${base}\n\n${link}`;
  }

  /** Comparte la nota con la API nativa del sistema (móvil o escritorio). Carga la nota completa si es posible; si falla (404, red), usa la nota de la lista. */
  async shareNoteNative(note: AgendaNote): Promise<void> {
    if (!this.hasNativeShare()) return;
    let fullNote: AgendaNote;
    try {
      fullNote = await firstValueFrom(this.agendaApi.getById(note._id));
    } catch {
      fullNote = note;
    }
    const shareData: ShareData = {
      title: 'Tienes una nueva tarea asignada',
      text: this.getShareText(fullNote),
      url: this.getAgendaLink(),
    };
    // Para dibujo: adjuntar la imagen si está disponible (data URL o URL con CORS)
    if (fullNote.type === 'drawing' && fullNote.drawingUrl?.length) {
      const imgUrl = fullNote.drawingUrl[0];
      try {
        const res = await fetch(imgUrl);
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], 'tarea-dibujo.png', {
            type: blob.type || 'image/png',
          });
          shareData.files = [file];
        }
      } catch {
        // Sin archivo se comparte el texto con el enlace al dibujo (getShareText ya lo incluye)
      }
    }
    try {
      await navigator.share(shareData);
      this.messageService.add({
        severity: 'success',
        summary: 'Compartido',
        detail: 'Contenido compartido correctamente',
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      this.messageService.add({
        severity: 'warn',
        summary: 'Compartir',
        detail: 'No se pudo usar el compartir del sistema. Usa Correo o WhatsApp.',
      });
    }
  }

  notes = signal<AgendaNote[]>([]);
  loading = signal(false);
  step = signal(1);
  selectedType = signal<AgendaNoteType | null>(null);
  noteContent = signal('');
  currentNote = signal<AgendaNote | null>(null);
  /** Referencia a la nota recién creada para no perderla si la lista del servidor no la devuelve. */
  private lastCreatedNote = signal<AgendaNote | null>(null);
  userOptions = signal<UserOption[]>([]);
  showCreateOptions = signal(false);
  showCreateDialog = signal(false);
  showDetailDialog = signal(false);
  saving = signal(false);
  recording = signal(false);
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  pendingVoiceFile = signal<File | null>(null);
  pendingDrawingDataUrl = signal<string | null>(null);
  /** Modal de confirmación tras grabar voz: transcripción + audio + Guardar */
  showVoiceConfirmModal = signal(false);
  transcribing = signal(false);
  /** URL del blob del audio grabado para el reproductor en el modal de voz */
  voicePreviewUrl = signal<string | null>(null);

  /** Filtro por fecha (por defecto hoy). Notas creadas en ese día. */
  filterDate = signal<Date>(new Date());

  /** ID del usuario seleccionado para filtrar agenda (sólo gerencia). */
  selectedUserId = signal<string | null>(null);

  /** Query de búsqueda para el panel lateral de usuarios. */
  userSearchQuery = signal('');

  /** IDs de notas seleccionadas para asignación masiva. */
  selectedNoteIds = signal<Set<string>>(new Set());
  /** Usuario a asignar en la barra de asignación masiva. */
  bulkAssignUserId = signal<string | null>(null);
  /** Cargando asignación masiva. */
  bulkAssigning = signal(false);

  /** Modal asignar con fecha/hora de vencimiento (uno o masivo). */
  showAssignModal = signal(false);
  assignModalNoteIds = signal<string[]>([]);
  assignModalUserId = signal<string | null>(null);
  assignModalDueAt = signal<Date | null>(null);

  /** Si en el detalle estamos en modo edición (tras pulsar Editar). */
  detailEditMode = signal(false);
  /** Contenido en edición en el diálogo de detalle (texto). */
  detailEditContent = signal('');
  /** Fecha/hora de vencimiento en edición en el detalle. */
  detailEditDueAt = signal<Date | null>(null);
  detailEditStatus = signal<AgendaNoteStatus>('pendiente');
  /** ID de la nota que se está editando (regrabar voz o reemplazar dibujo). */
  editingNoteId = signal<string | null>(null);
  /** URLs de audio actuales al regrabar (para eliminarlas al guardar). */
  editingNoteVoiceUrls = signal<string[]>([]);
  /** Diálogo solo para regrabar voz (desde detalle). */
  showVoiceRerecordDialog = signal(false);
  /** True cuando cerramos el diálogo de regrabar para abrir el de transcripción (no borrar editingNoteId). */
  private closingRerecordForConfirm = false;
  /** Canvas del detalle para editar dibujo (ViewChild se asigna cuando hay nota tipo drawing). */
  @ViewChild('detailCanvasEl') detailCanvasRef?: ElementRef<HTMLCanvasElement>;
  private isDetailDrawing = false;
  private detailLastX = 0;
  private detailLastY = 0;

  /** Modal de acciones centralizado. */
  showActionsModal = signal(false);
  selectedActionNote = signal<AgendaNote | null>(null);

  // Sharing Modal
  showShareModal = signal(false);
  areasWithUsers = signal<import('../../shared/interfaces/area.interface').AreaWithUsers[]>([]);
  mySharedWith = signal<string[]>([]); // Usuarios con los que YO comparto
  sharedWithMe = signal<UserOption[]>([]); // Usuarios que comparten CONMIGO

  readonly typeOptions = NOTE_TYPE_OPTIONS;
  readonly statusOptions = STATUS_OPTIONS;

  @ViewChild('canvasEl') canvasRef?: ElementRef<HTMLCanvasElement>;

  activeTab = signal<'meetings' | 'my-activities' | 'assigned' | 'unassigned'>('my-activities');
  searchQuery = signal('');

  /** Usuarios ordenados: el actual primero, luego el resto, filtrados por buscador. */
  sortedUserOptions = computed(() => {
    const raw = this.userOptions();
    const query = this.userSearchQuery().toLowerCase().trim();
    const currentUserId = this.authService.getCurrentUser()?.id;

    let filtered = raw;
    if (query) {
      filtered = raw.filter(
        (u) => u.name?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query),
      );
    }

    return filtered.sort((a, b) => {
      if (a._id === currentUserId) return -1;
      if (b._id === currentUserId) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  });

  /** Notas filtradas por pestaña, búsqueda y filtros adicionales. */
  displayedNotes = computed(() => {
    const tab = this.activeTab();
    const query = this.searchQuery().toLowerCase().trim();
    const allNotes = this.notes();
    const currentUserId = this.authService.getCurrentUser()?.id;
    const filterUser = this.selectedUserId(); // Reusing selectedUserId as the "Assignee" filter if needed, or we might need a separate one.

    // 1. Filtrar por pestaña
    let notes: AgendaNote[] = [];
    const filterDateValue = this.filterDate();
    const isSameDay = (d1: Date | string | null | undefined, d2: Date) => {
      if (!d1) return false;
      const date1 = new Date(d1);
      return (
        date1.getFullYear() === d2.getFullYear() &&
        date1.getMonth() === d2.getMonth() &&
        date1.getDate() === d2.getDate()
      );
    };

    if (tab === 'meetings') {
      return []; // Por ahora vacío
    } else if (tab === 'my-activities') {
      // SOLO las actividades asignadas a mí para la fecha seleccionada
      notes = allNotes.filter(n => this.isAssignedToMe(n) && isSameDay(n.dueAt, filterDateValue));
    } else if (tab === 'assigned') {
      // Actividades que HE ASIGNADO a otros (creadas por mí y con asignados) para la fecha
      if (!currentUserId) return [];
      notes = allNotes.filter(n => {
        const isCreator = this.isCreator(n);
        const hasAssignees = n.assignedTo && n.assignedTo.length > 0;
        return isCreator && hasAssignees && isSameDay(n.dueAt, filterDateValue);
      });
    } else if (tab === 'unassigned') {
      // Mi Backlog: Creadas por mí y sin asignar (sin filtro de fecha)
      notes = allNotes.filter(n => this.isCreator(n) && (!n.assignedTo || n.assignedTo.length === 0));
    }

    // 2. Filtrar por Búsqueda (Texto, busca en contenido)
    if (query) {
      notes = notes.filter(n => n.content?.toLowerCase().includes(query));
    }

    // 3. Filtrar por Usuario (Context Switching - Solo en pestañas de actividades/asignados)
    if (filterUser && (tab === 'assigned' || tab === 'my-activities')) {
      const contextUserId = filterUser;

      if (tab === 'my-activities') {
        notes = allNotes.filter(n => {
          // Asignado al usuario seleccionado Y coincide fecha
          if (!n.assignedTo?.length) return false;
          const isAssigned = n.assignedTo.some((a) => {
            const id = typeof a === 'string' ? a : (a as AgendaNoteUser)?._id;
            return id === contextUserId;
          });
          return isAssigned && isSameDay(n.dueAt, filterDateValue);
        });
      } else if (tab === 'assigned') {
        // Creadas por el usuario seleccionado y asignadas Y coincide fecha
        notes = allNotes.filter(n => {
          const creatorId = typeof n.createdBy === 'string' ? n.createdBy : (n.createdBy as AgendaNoteUser)?._id;
          const isCreator = creatorId === contextUserId;
          const hasAssignees = n.assignedTo && n.assignedTo.length > 0;
          return isCreator && hasAssignees && isSameDay(n.dueAt, filterDateValue);
        });
      }

      // Aplicar búsqueda de nuevo si se reinició notes
      if (query) {
        notes = notes.filter(n => n.content?.toLowerCase().includes(query));
      }
    }

    // Ordenar (Más recientes primero)
    return notes.sort((a, b) => {
      const t1 = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      const t2 = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      return t2 - t1;
    });
  });

  // Alias para la vista, reemplazando los computed anteriores si es necesario o usándolos de base
  // Vamos a usar displayedNotes() en el HTML principal.

  ngOnInit(): void {
    this.loadNotes();
    this.loadUsers();
    this.loadSharedWithMe();
  }

  loadNotes(): void {
    this.loading.set(true);
    const filters = this.buildListFilters();
    this.agendaApi
      .list(filters)
      .subscribe({
        next: (list) => this.notes.set(list),
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las notas',
          });
        },
      })
      .add(() => this.loading.set(false));
  }

  /** startDate/endDate para el día seleccionado en el filtro (inicio y fin del día en local, en ISO). */
  private buildDateFilters(): { startDate: string; endDate: string } {
    const d = this.filterDate();
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }

  /** Filtros para listar notas: ahora traemos todo lo del usuario/tenant para permitir backlog global. */
  private buildListFilters(): Parameters<AgendaApiService['list']>[0] {
    const filters: Parameters<AgendaApiService['list']>[0] = {};

    if (!this.authService.isGerencia()) {
      filters.forUser = true;
    }

    return filters;
  }

  selectUser(userId: string | null): void {
    this.selectedUserId.set(userId);
    this.loadNotes();
  }

  onFilterDateChange(date: Date | null): void {
    if (date) {
      this.filterDate.set(date);
      this.loadNotes();
    }
  }

  /** Carga las notas y devuelve una promesa que se resuelve cuando terminó.
   * Si hay una nota recién creada (lastCreatedNote) y el servidor no la devuelve, se añade al inicio. */
  loadNotesAndWait(): Promise<void> {
    this.loading.set(true);
    const noteToMerge = this.lastCreatedNote();
    const filters = this.buildListFilters();
    return firstValueFrom(
      this.agendaApi.list(filters).pipe(
        tap((list) => {
          const listWithMerged = this.mergeCreatedNoteIfMissing(list, noteToMerge);
          this.notes.set(listWithMerged);
        }),
        map(() => undefined),
        catchError(() => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las notas',
          });
          return of(undefined);
        }),
        finalize(() => this.loading.set(false)),
      ),
    ).then(() => undefined);
  }

  /** Si la nota creada no está en la lista del servidor, la pone al inicio. */
  private mergeCreatedNoteIfMissing(
    serverList: AgendaNote[],
    created: AgendaNote | null,
  ): AgendaNote[] {
    if (!created?._id) return serverList;
    const id = String(created._id);
    if (serverList.some((n) => String(n._id) === id)) return serverList;
    return [created, ...serverList];
  }

  /** Carga todos los usuarios del tenant (todas las páginas) para el selector. */
  loadUsers(): void {
    const tenantId = this.tenantService.tenantId();
    if (this.isGerencia()) {
      this.usersApi.listAll(tenantId ?? undefined).subscribe({
        next: (opts) => this.userOptions.set(opts),
        error: () => { },
      });
    } else {
      // Para usuarios normales, iniciamos con el usuario actual.
      // loadSharedWithMe agregará los compartidos.
      const currentUser = this.authService.getCurrentUser();
      if (currentUser) {
        this.userOptions.set([{
          _id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role
        }]);
      }
    }
  }

  openCreate(): void {
    this.clearCreateFields();
    this.showCreateOptions.set(true);
  }

  /** Elegir tipo en la vista inline y abrir el diálogo en paso 2 */
  selectTypeAndOpenDialog(type: AgendaNoteType): void {
    this.selectedType.set(type);
    this.showCreateOptions.set(false);
    this.step.set(2);
    this.showCreateDialog.set(true);
    if (type === 'voice') {
      setTimeout(() => this.startRecording(), 300);
    }
  }

  cancelCreateOptions(): void {
    this.showCreateOptions.set(false);
    this.selectedType.set(null);
    this.clearCreateFields();
  }

  closeCreate(): void {
    this.showCreateDialog.set(false);
    this.recording.set(false);
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }
    // No limpiar si se está abriendo el modal de voz (transcripción + guardar); si no, se cerraría al instante
    if (!this.showVoiceConfirmModal()) {
      this.clearCreateFields();
    }
  }

  /** Limpia texto, voz y dibujo del flujo de creación (al cerrar, cancelar o guardar). */
  private clearCreateFields(): void {
    this.noteContent.set('');
    this.pendingVoiceFile.set(null);
    this.pendingDrawingDataUrl.set(null);
    this.selectedType.set(null);
    this.step.set(1);
    this.showVoiceConfirmModal.set(false);
    this.editingNoteId.set(null);
    this.editingNoteVoiceUrls.set([]);
    this.currentNote.set(null);
    const url = this.voicePreviewUrl();
    if (url) URL.revokeObjectURL(url);
    this.voicePreviewUrl.set(null);
    this.clearDrawing();
  }

  canGoNext = computed(() => {
    const s = this.step();
    const type = this.selectedType();
    if (s === 1) return type != null;
    if (s === 2) {
      if (type === 'text') return this.noteContent().trim().length > 0;
      if (type === 'voice')
        return this.pendingVoiceFile() != null || (this.currentNote()?.voiceUrl?.length ?? 0) > 0;
      if (type === 'drawing')
        return (
          this.pendingDrawingDataUrl() != null || (this.currentNote()?.drawingUrl?.length ?? 0) > 0
        );
      return false;
    }
    return true;
  });

  nextStep(): void {
    if (this.step() === 2 && this.canGoNext()) {
      this.saveNoteAndContinue();
    }
  }

  prevStep(): void {
    const s = this.step();
    if (s === 2) {
      this.noteContent.set('');
      this.pendingVoiceFile.set(null);
      this.pendingDrawingDataUrl.set(null);
      this.clearDrawing();
      this.showCreateDialog.set(false);
      this.showCreateOptions.set(true);
      this.step.set(1);
      return;
    }
    if (s > 1) this.step.set(s - 1);
  }

  private saveNoteAndContinue(): void {
    const type = this.selectedType()!;
    const content = this.noteContent().trim();

    this.saving.set(true);
    this.agendaApi
      .create({ type, content: content || undefined })
      .subscribe({
        next: (created) => {
          this.currentNote.set(created);
          this.lastCreatedNote.set(created);
          this.notes.update((prev) => [created, ...prev]);
          this.messageService.add({
            severity: 'success',
            summary: 'Nota creada',
            detail: 'Puedes asignar, compartir o conectar Teams desde la tabla.',
          });
          const createdId = created?._id != null ? String(created._id) : '';
          if (!createdId) {
            this.closeCreate();
            this.saving.set(false);
            return;
          }
          this.uploadPendingVoiceOrDrawing(createdId)
            .then(() => {
              this.ensureCreatedNoteInList(createdId);
              this.closeCreate();
            })
            .finally(() => {
              this.lastCreatedNote.set(null);
              this.saving.set(false);
            });
        },
        error: (err) => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message ?? 'No se pudo crear la nota',
          });
        },
      })
      .add(() => {
        // success: saving se apaga en uploadPendingVoiceOrDrawing.finally(); error: en error callback
      });
  }

  private async uploadPendingVoiceOrDrawing(noteId: string): Promise<void> {
    const type = this.selectedType()!;
    const voiceFile = this.pendingVoiceFile();
    const drawingDataUrl = this.pendingDrawingDataUrl();
    const id = String(noteId);

    if (type === 'voice' && voiceFile) {
      try {
        const res = await firstValueFrom(
          this.agendaApi.generateVoicePresignedUrl(
            id,
            voiceFile.name,
            voiceFile.type || 'audio/webm',
            3600,
          ),
        );
        await this.agendaApi.uploadFileToS3(
          res.presignedUrl,
          voiceFile,
          voiceFile.type || 'audio/webm',
        );
        await firstValueFrom(this.agendaApi.confirmVoiceUpload(id, res.publicUrl));
        this.pendingVoiceFile.set(null);
      } catch {
        this.messageService.add({
          severity: 'warn',
          summary: 'Audio',
          detail: 'No se pudo subir el audio. Puedes agregarlo después.',
        });
      }
    }

    if (type === 'drawing' && drawingDataUrl) {
      try {
        const blob = await this.dataUrlToBlob(drawingDataUrl);
        const file = new File([blob], `dibujo-${Date.now()}.png`, { type: 'image/png' });
        const res = await firstValueFrom(
          this.agendaApi.generateDrawingPresignedUrl(id, file.name, file.type, 3600),
        );
        await this.agendaApi.uploadFileToS3(res.presignedUrl, file, file.type);
        await firstValueFrom(this.agendaApi.confirmDrawingUpload(id, res.publicUrl));
        this.pendingDrawingDataUrl.set(null);
      } catch {
        this.messageService.add({
          severity: 'warn',
          summary: 'Dibujo',
          detail: 'No se pudo subir el dibujo. Puedes agregarlo después.',
        });
      }
    }

    await this.loadNotesAndWait();
    this.ensureCreatedNoteInList(id);
    // Usar la nota de la lista para evitar 404 en getById (replicación, multi-tenant, etc.)
    const fromList = this.notes().find((n) => String(n._id) === id) ?? null;
    this.currentNote.set(fromList);
  }

  /** Si la nota recién creada no está en la lista (el servidor no la devolvió), la volvemos a añadir. */
  private ensureCreatedNoteInList(noteId: string): void {
    const id = String(noteId);
    const note = this.lastCreatedNote() ?? this.currentNote();
    if (!note?._id || String(note._id) !== id) return;
    const list = this.notes();
    if (list.some((n) => String(n._id) === id)) return;
    this.notes.update((prev) => [note, ...prev]);
  }

  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl);
    return res.blob();
  }

  /** Id del único usuario asignado (primero de la lista) o null. */
  getAssignedSingleId(note: AgendaNote): string | null {
    const ids = (note.assignedTo ?? []).map((a) => (typeof a === 'string' ? a : a._id));
    return ids.length > 0 ? ids[0] : null;
  }

  toggleSelectNote(note: AgendaNote): void {
    const id = String(note._id);
    this.selectedNoteIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  toggleSelectAll(): void {
    const notes = this.displayedNotes();
    if (this.selectedNoteIds().size === notes.length) {
      this.selectedNoteIds.set(new Set());
    } else {
      this.selectedNoteIds.set(new Set(notes.map((n) => String(n._id))));
    }
  }

  isNoteSelected(note: AgendaNote): boolean {
    return this.selectedNoteIds().has(String(note._id));
  }

  isAllSelected(): boolean {
    const notes = this.displayedNotes();
    return notes.length > 0 && this.selectedNoteIds().size === notes.length;
  }

  isSomeSelected(): boolean {
    return this.selectedNoteIds().size > 0;
  }

  clearSelection(): void {
    this.selectedNoteIds.set(new Set());
  }

  /** Abre el modal de asignación para una sola nota (desde el select de la fila). */
  openAssignModalForNote(note: AgendaNote, userId: string | null): void {
    if (!note._id) return;
    if (userId == null) {
      this.agendaApi.assign(note._id, { userIds: [], dueAt: null }).subscribe({
        next: () => {
          this.loadNotes();
          this.messageService.add({
            severity: 'success',
            summary: 'Asignado',
            detail: 'Asignación quitada',
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar',
          });
        },
      });
      return;
    }
    this.assignModalNoteIds.set([String(note._id)]);
    this.assignModalUserId.set(userId);
    this.assignModalDueAt.set(note.dueAt ? new Date(note.dueAt) : null);
    this.showAssignModal.set(true);
  }

  /** Abre el modal de asignación masiva (desde la barra). */
  openAssignModalForBulk(): void {
    const userId = this.bulkAssignUserId();
    const ids = Array.from(this.selectedNoteIds());
    if (!ids.length || !userId) {
      if (!userId) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Asignar',
          detail: 'Elige un usuario para asignar',
        });
      }
      return;
    }
    this.assignModalNoteIds.set(ids);
    this.assignModalUserId.set(userId);
    this.assignModalDueAt.set(null);
    this.showAssignModal.set(true);
  }

  closeAssignModal(): void {
    this.showAssignModal.set(false);
    this.assignModalNoteIds.set([]);
    this.assignModalUserId.set(null);
    this.assignModalDueAt.set(null);
  }

  /** Formatea fecha/hora de vencimiento para mostrar en detalle. */
  formatDueAt(dueAt: string): string {
    try {
      const d = new Date(dueAt);
      return d.toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dueAt;
    }
  }

  /** Nombre del usuario seleccionado en el modal de asignación. */
  getAssignModalUserName(): string {
    const id = this.assignModalUserId();
    if (!id) return '—';
    const user = this.userOptions().find((u) => u._id === id);
    return user?.name ?? user?.email ?? id;
  }

  /** Confirmar asignación desde el modal (aplica usuario y fecha/hora vencimiento). */
  confirmAssignModal(): void {
    const ids = this.assignModalNoteIds();
    const userId = this.assignModalUserId();
    const dueAt = this.assignModalDueAt();
    if (!ids.length) {
      this.closeAssignModal();
      return;
    }
    const userIds = userId ? [userId] : [];
    const dueAtIso = dueAt ? dueAt.toISOString() : null;
    this.bulkAssigning.set(true);
    const payload = { userIds, dueAt: dueAtIso };
    const assignWithRetry = (id: string) =>
      firstValueFrom(
        this.agendaApi.assign(id, payload).pipe(
          map(() => true),
          catchError((err: { status?: number }) => {
            if (err?.status === 404) {
              return timer(1000).pipe(
                switchMap(() =>
                  this.agendaApi.assign(id, payload).pipe(
                    map(() => true),
                    catchError(() => of(false)),
                  ),
                ),
              );
            }
            return of(false);
          }),
        ),
      );
    Promise.all(ids.map((id) => assignWithRetry(id)))
      .then((results) => {
        const ok = results.filter(Boolean).length;
        const fail = results.length - ok;
        this.loadNotes();
        this.closeAssignModal();
        if (ids.length > 1) {
          this.clearSelection();
          this.bulkAssignUserId.set(null);
        }
        if (fail === 0) {
          this.messageService.add({
            severity: 'success',
            summary: 'Asignado',
            detail:
              ids.length === 1
                ? 'Nota asignada con vencimiento'
                : `${ok} nota(s) asignada(s) correctamente`,
          });
        } else {
          this.messageService.add({
            severity: ok ? 'warn' : 'error',
            summary: 'Asignar',
            detail:
              ok > 0
                ? `Asignadas ${ok} nota(s). ${fail} no se pudieron asignar (solo el creador puede asignar).`
                : 'No se pudo asignar (solo el creador de cada nota puede asignar).',
          });
        }
      })
      .finally(() => this.bulkAssigning.set(false));
  }

  /** Asignar o cambiar la única persona asignada desde el select de la tabla (abre modal con vencimiento). */
  onAssignChange(note: AgendaNote, userId: string | null): void {
    this.openAssignModalForNote(note, userId);
  }

  onStatusChange(note: AgendaNote, status: AgendaNoteStatus): void {
    this.agendaApi.update(note._id, { status }).subscribe({
      next: (updated) => {
        this.notes.update((list) => list.map((n) => (n._id === updated._id ? updated : n)));
        if (this.currentNote()?._id === updated._id) {
          this.currentNote.set(updated);
        }
        this.messageService.add({
          severity: 'success',
          summary: 'Estado',
          detail: 'Estado actualizado',
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: (err?.error?.message as string) ?? 'No se pudo actualizar el estado',
        });
      },
    });
  }

  shareNoteFromNote(note: AgendaNote, channel: 'email' | 'whatsapp'): void {
    this.agendaApi.getById(note._id).subscribe({
      next: (fullNote) => {
        this.currentNote.set(fullNote);
        this.shareNote(channel);
      },
      error: () => {
        this.currentNote.set(note);
        this.shareNote(channel);
      },
    });
  }

  /** Items del menú Compartir (Correo, WhatsApp) para una nota. */
  getShareMenuItems(note: AgendaNote): MenuItem[] {
    return [
      {
        label: 'Correo',
        icon: 'pi pi-envelope',
        command: () => this.shareNoteFromNote(note, 'email'),
      },
      {
        label: 'WhatsApp',
        icon: 'pi pi-whatsapp',
        command: () => this.shareNoteFromNote(note, 'whatsapp'),
      },
    ];
  }

  openTeamsForNote(note: AgendaNote): void {
    this.currentNote.set(note);
    this.openTeamsLink();
  }

  shareNote(channel: 'email' | 'whatsapp'): void {
    const note = this.currentNote();
    if (!note?._id) return;
    const shareText = this.getShareText(note);
    const link = this.getAgendaLink();
    const openShareTarget = () => {
      if (channel === 'whatsapp') {
        const maxLen = 1200;
        const textForWa =
          shareText.length <= maxLen
            ? shareText
            : shareText.slice(0, maxLen) + '\n\n... Ver más: ' + link;
        window.open(`https://wa.me/?text=${encodeURIComponent(textForWa)}`, '_blank');
      }
      if (channel === 'email') {
        const subject = encodeURIComponent('Tienes una nueva tarea asignada');
        const body = encodeURIComponent(shareText);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
      }
    };
    this.agendaApi.share(note._id, { channel, to: undefined }).subscribe({
      next: (updated) => {
        this.currentNote.set(updated);
        openShareTarget();
        this.messageService.add({
          severity: 'success',
          summary: 'Compartir',
          detail: channel === 'email' ? 'Cliente de correo abierto' : 'Enlace listo para WhatsApp',
        });
      },
      error: () => {
        openShareTarget();
        this.messageService.add({
          severity: 'warn',
          summary: 'Compartir',
          detail:
            'Enlace listo. No se pudo registrar en el servidor (la nota pudo haber sido eliminada).',
        });
      },
    });
  }

  openTeamsLink(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Teams',
      detail: 'La integración con Microsoft Teams estará disponible próximamente.',
    });
  }

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.mediaRecorder.ondataavailable = (e) => e.data.size > 0 && this.audioChunks.push(e.data);
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const file = new File([blob], `voz-${Date.now()}.webm`, { type: 'audio/webm' });
        this.pendingVoiceFile.set(file);
        stream.getTracks().forEach((t) => t.stop());
        this.recording.set(false);
        this.transcribeAndShowVoiceModal(file);
      };
      this.mediaRecorder.start();
      this.recording.set(true);
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Micrófono',
        detail: 'No se pudo acceder al micrófono',
      });
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }
  }

  /** Tras grabar: transcribir y abrir modal de confirmación (transcripción + audio + Guardar). */
  private transcribeAndShowVoiceModal(file: File): void {
    this.closingRerecordForConfirm = true;
    this.showVoiceRerecordDialog.set(false);
    this.transcribing.set(true);
    this.agendaApi
      .transcribe(file)
      .subscribe({
        next: (res) => {
          this.noteContent.set(res.text ?? '');
          const prev = this.voicePreviewUrl();
          if (prev) URL.revokeObjectURL(prev);
          this.voicePreviewUrl.set(URL.createObjectURL(file));
          this.showVoiceConfirmModal.set(true);
          this.showCreateDialog.set(false);
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Transcripción',
            detail: err?.error?.message ?? 'No se pudo transcribir el audio',
          });
          this.noteContent.set('');
          const prev = this.voicePreviewUrl();
          if (prev) URL.revokeObjectURL(prev);
          this.voicePreviewUrl.set(URL.createObjectURL(file));
          this.showVoiceConfirmModal.set(true);
          this.showCreateDialog.set(false);
        },
      })
      .add(() => this.transcribing.set(false));
  }

  closeVoiceConfirmModal(): void {
    const url = this.voicePreviewUrl();
    if (url) URL.revokeObjectURL(url);
    this.voicePreviewUrl.set(null);
    this.showVoiceConfirmModal.set(false);
    this.pendingVoiceFile.set(null);
    this.noteContent.set('');
    this.editingNoteId.set(null);
    this.editingNoteVoiceUrls.set([]);
  }

  /** Guardar nota de voz desde el modal (crear nueva o actualizar existente si editingNoteId). */
  saveFromVoiceModal(): void {
    const content = this.noteContent().trim();
    const file = this.pendingVoiceFile();
    if (!file) return;
    const noteId = this.editingNoteId();
    this.saving.set(true);
    if (noteId) {
      const oldUrls = this.editingNoteVoiceUrls();
      this.agendaApi.update(noteId, { content: content || undefined }).subscribe({
        next: () => {
          Promise.all(oldUrls.map((url) => firstValueFrom(this.agendaApi.removeVoice(noteId, url))))
            .then(() => this.uploadVoiceFileToNote(noteId, file))
            .then(() => firstValueFrom(this.agendaApi.getById(noteId)))
            .then((updated) => {
              this.currentNote.set(updated);
              this.notes.update((list) => list.map((n) => (n._id === updated._id ? updated : n)));
              this.messageService.add({
                severity: 'success',
                summary: 'Actualizado',
                detail: 'Nota de voz actualizada.',
              });
              this.closeVoiceConfirmModal();
              this.detailEditMode.set(false);
              this.showDetailDialog.set(true);
            })
            .catch(() => {
              this.messageService.add({
                severity: 'warn',
                summary: 'Audio',
                detail: 'No se pudo reemplazar el audio.',
              });
            })
            .finally(() => {
              this.saving.set(false);
            });
        },
        error: (err) => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message ?? 'No se pudo actualizar',
          });
        },
      });
      return;
    }
    this.agendaApi.create({ type: 'voice', content: content || undefined }).subscribe({
      next: (created) => {
        this.currentNote.set(created);
        this.lastCreatedNote.set(created);
        this.notes.update((prev) => [created, ...prev]);
        this.messageService.add({
          severity: 'success',
          summary: 'Nota creada',
          detail: 'Nota de voz guardada correctamente.',
        });
        const createdId = created?._id != null ? String(created._id) : '';
        if (!createdId) {
          this.closeVoiceConfirmModal();
          this.saving.set(false);
          return;
        }
        this.uploadVoiceFileToNote(createdId, file)
          .then(() => {
            this.loadNotesAndWait();
            this.ensureCreatedNoteInList(createdId);
          })
          .finally(() => {
            this.lastCreatedNote.set(null);
            this.saving.set(false);
            this.closeVoiceConfirmModal();
          });
      },
      error: (err) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'No se pudo crear la nota',
        });
      },
    });
  }

  private async uploadVoiceFileToNote(noteId: string, voiceFile: File): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.agendaApi.generateVoicePresignedUrl(
          noteId,
          voiceFile.name,
          voiceFile.type || 'audio/webm',
          3600,
        ),
      );
      await this.agendaApi.uploadFileToS3(
        res.presignedUrl,
        voiceFile,
        voiceFile.type || 'audio/webm',
      );
      await firstValueFrom(this.agendaApi.confirmVoiceUpload(noteId, res.publicUrl));
    } catch {
      this.messageService.add({
        severity: 'warn',
        summary: 'Audio',
        detail: 'No se pudo subir el audio. La nota se creó con la transcripción.',
      });
    }
  }

  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;

  onCanvasMouseDown(e: MouseEvent): void {
    this.isDrawing = true;
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    this.lastX = e.clientX - rect.left;
    this.lastY = e.clientY - rect.top;
  }

  onCanvasMouseMove(e: MouseEvent): void {
    if (!this.isDrawing) return;
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.lastX, this.lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    this.lastX = x;
    this.lastY = y;
  }

  onCanvasMouseUp(): void {
    this.isDrawing = false;
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) this.pendingDrawingDataUrl.set(canvas.toDataURL('image/png'));
  }

  onCanvasMouseLeave(): void {
    this.isDrawing = false;
  }

  clearDrawing(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    this.pendingDrawingDataUrl.set(null);
  }

  viewNote(note: AgendaNote): void {
    this.currentNote.set(note);
    this.detailEditContent.set(note.content ?? '');
    this.detailEditDueAt.set(note.dueAt ? new Date(note.dueAt) : null);
    this.detailEditStatus.set(note.status ?? 'pendiente');
    this.detailEditMode.set(false);
    this.showDetailDialog.set(true);
  }

  /** Pasar a modo edición en el detalle (carga el canvas para dibujo si aplica). */
  enterDetailEditMode(): void {
    this.detailEditMode.set(true);
    const note = this.currentNote();
    if (note?.type === 'drawing' && note.drawingUrl?.length) {
      setTimeout(() => this.loadDetailDrawingImage(), 200);
    }
  }

  exitDetailEditMode(): void {
    this.detailEditMode.set(false);
  }

  /** Carga la imagen actual del dibujo en el canvas del detalle para poder editarla. */
  loadDetailDrawingImage(): void {
    const note = this.currentNote();
    const canvas = this.detailCanvasRef?.nativeElement;
    if (!note?.drawingUrl?.length || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = note.drawingUrl[0];
  }

  onDetailCanvasMouseDown(e: MouseEvent): void {
    this.isDetailDrawing = true;
    const canvas = this.detailCanvasRef?.nativeElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    this.detailLastX = e.clientX - rect.left;
    this.detailLastY = e.clientY - rect.top;
  }

  onDetailCanvasMouseMove(e: MouseEvent): void {
    if (!this.isDetailDrawing) return;
    const canvas = this.detailCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.detailLastX, this.detailLastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    this.detailLastX = x;
    this.detailLastY = y;
  }

  onDetailCanvasMouseUp(): void {
    this.isDetailDrawing = false;
  }

  onDetailCanvasMouseLeave(): void {
    this.isDetailDrawing = false;
  }

  clearDetailDrawing(): void {
    const note = this.currentNote();
    const canvas = this.detailCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (note?.drawingUrl?.length) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = note.drawingUrl![0];
    }
  }

  saveDetailText(note: AgendaNote): void {
    const content = this.detailEditContent().trim();
    this.agendaApi.update(note._id, { content }).subscribe({
      next: (updated) => {
        this.currentNote.set(updated);
        this.notes.update((list) => list.map((n) => (n._id === updated._id ? updated : n)));
        this.detailEditMode.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Guardado',
          detail: 'Contenido actualizado',
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'No se pudo guardar',
        });
      },
    });
  }

  saveDetailDueAt(note: AgendaNote): void {
    const dueAt = this.detailEditDueAt();
    const dueAtIso = dueAt ? dueAt.toISOString() : null;
    this.agendaApi.update(note._id, { dueAt: dueAtIso }).subscribe({
      next: (updated) => {
        this.currentNote.set(updated);
        this.notes.update((list) => list.map((n) => (n._id === updated._id ? updated : n)));
        this.messageService.add({
          severity: 'success',
          summary: 'Guardado',
          detail: 'Vencimiento actualizado',
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'No se pudo guardar',
        });
      },
    });
  }

  saveDetailStatus(note: AgendaNote): void {
    const status = this.detailEditStatus();
    this.agendaApi.update(note._id, { status }).subscribe({
      next: (updated) => {
        this.currentNote.set(updated);
        this.notes.update((list) => list.map((n) => (n._id === updated._id ? updated : n)));
        this.messageService.add({
          severity: 'success',
          summary: 'Guardado',
          detail: 'Estado actualizado',
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message ?? 'No se pudo guardar',
        });
      },
    });
  }

  getStatusLabel(status: AgendaNoteStatus | undefined): string {
    if (!status) return 'Pendiente';
    const opt = STATUS_OPTIONS.find((o) => o.value === status);
    return opt?.label ?? status;
  }

  getStatusSeverity(status: AgendaNoteStatus | undefined): 'secondary' | 'info' | 'success' {
    if (status === 'terminado') return 'success';
    if (status === 'en_proceso') return 'info';
    return 'secondary';
  }

  startRerecordVoice(note: AgendaNote): void {
    this.editingNoteId.set(note._id);
    this.editingNoteVoiceUrls.set(note.voiceUrl ?? []);
    this.noteContent.set(note.content ?? '');
    this.showDetailDialog.set(false);
    this.showVoiceRerecordDialog.set(true);
    setTimeout(() => this.startRecording(), 300);
  }

  closeVoiceRerecordDialog(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }
    this.recording.set(false);
    this.showVoiceRerecordDialog.set(false);
    if (!this.closingRerecordForConfirm) {
      this.editingNoteId.set(null);
      this.editingNoteVoiceUrls.set([]);
    }
    this.closingRerecordForConfirm = false;
  }

  /** Sube el dibujo del canvas y reemplaza en la nota. Lanza si falla. */
  private uploadDetailDrawing(note: AgendaNote): Promise<void> {
    const canvas = this.detailCanvasRef?.nativeElement;
    if (!canvas) return Promise.resolve();
    const dataUrl = canvas.toDataURL('image/png');
    return this.dataUrlToBlob(dataUrl)
      .then((blob) => {
        const file = new File([blob], `dibujo-${Date.now()}.png`, { type: 'image/png' });
        const noteId = note._id;
        const oldUrls = note.drawingUrl ?? [];
        return firstValueFrom(
          this.agendaApi.generateDrawingPresignedUrl(noteId, file.name, file.type, 3600),
        ).then((res) =>
          this.agendaApi
            .uploadFileToS3(res.presignedUrl, file, file.type)
            .then(() => firstValueFrom(this.agendaApi.confirmDrawingUpload(noteId, res.publicUrl)))
            .then(() =>
              Promise.all(
                oldUrls.map((url) => firstValueFrom(this.agendaApi.removeDrawing(noteId, url))),
              ).catch(() => undefined),
            )
            .then(() => firstValueFrom(this.agendaApi.getById(noteId))),
        );
      })
      .then((updated) => {
        this.currentNote.set(updated);
        this.notes.update((list) => list.map((n) => (n._id === updated._id ? updated : n)));
      })
      .then(() => undefined);
  }

  /** Guardar todo en modo edición del detalle: contenido, estado, vencimiento y dibujo (si aplica). */
  saveDetailAll(note: AgendaNote): void {
    this.saving.set(true);
    const run = async () => {
      try {
        if (note.type === 'drawing') {
          await this.uploadDetailDrawing(note);
        }
        const content = this.detailEditContent().trim();
        const dueAt = this.detailEditDueAt();
        const dueAtIso = dueAt ? dueAt.toISOString() : null;
        const status = this.detailEditStatus();
        const updated = await firstValueFrom(
          this.agendaApi.update(note._id, {
            content: content || undefined,
            dueAt: dueAtIso,
            status,
          }),
        );
        this.currentNote.set(updated);
        this.notes.update((list) => list.map((n) => (n._id === updated._id ? updated : n)));
        this.detailEditMode.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Guardado',
          detail: 'Cambios guardados correctamente',
        });
      } catch (err: unknown) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: (err as { error?: { message?: string } })?.error?.message ?? 'No se pudo guardar',
        });
      } finally {
        this.saving.set(false);
      }
    };
    run();
  }

  deleteNote(note: AgendaNote): void {
    this.confirmationService.confirm({
      message: '¿Eliminar esta nota?',
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        this.agendaApi.delete(note._id).subscribe({
          next: () => {
            this.loadNotes();
            if (this.currentNote()?._id === note._id) {
              this.showDetailDialog.set(false);
              this.currentNote.set(null);
            }
            this.messageService.add({
              severity: 'success',
              summary: 'Eliminada',
              detail: 'Nota eliminada',
            });
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: err?.error?.message ?? 'No se pudo eliminar',
            });
          },
        });
      },
    });
  }

  getTypeIcon(type: string): string {
    return this.typeOptions.find((o) => o.value === type)?.icon ?? 'pi pi-file';
  }

  getTypeLabel(type: string): string {
    return this.typeOptions.find((o) => o.value === type)?.label ?? type;
  }

  getCreatorName(note: AgendaNote): string {
    const u = note.createdBy;
    const currentUser = this.authService.getCurrentUser();
    if (typeof u === 'object' && u) {
      if (u.name) return u.name;
      if ((u as { email?: string }).email) return (u as { email: string }).email;
    }
    if (typeof u === 'string') {
      // Si el creador es el usuario actual, mostrar su nombre (no "Tú")
      if (u === currentUser?.id) {
        return currentUser?.name ?? currentUser?.email ?? 'Tú';
      }
      const found = this.userOptions().find((x) => x._id === u);
      return found?.name ?? found?.email ?? '—';
    }
    return '—';
  }

  /** Nombre o email del usuario asignado para mostrar en detalle. */
  getAssignedUserDisplay(assignee: AgendaNoteUser | string): string {
    if (typeof assignee === 'object' && assignee) {
      if (assignee.name) return assignee.name;
      if (assignee.email) return assignee.email;
    }
    return '—';
  }

  /** Resumen para la columna Contenido: texto, "Audio" / "N audio(s)", "Dibujo" / "N imagen(es)". */
  /** Texto completo para la tabla: contenido de texto, transcripción para voz, o etiqueta para dibujo. */
  getContentSummary(note: AgendaNote): string {
    if (note.type === 'text' && note.content?.trim()) return note.content.trim();
    if (note.type === 'voice' && note.content?.trim()) return note.content.trim();
    if (note.type === 'voice') {
      const n = note.voiceUrl?.length ?? 0;
      return n ? (n === 1 ? 'Audio (sin transcripción)' : `${n} audio(s)`) : '—';
    }
    if (note.type === 'drawing') {
      const n = note.drawingUrl?.length ?? 0;
      return n ? (n === 1 ? 'Dibujo' : `${n} imagen(es)`) : '—';
    }
    return '—';
  }
  /** Genera las acciones disponibles para una nota en el menú contextual. */
  getNoteMenu(note: AgendaNote): MenuItem[] {
    const actions: MenuItem[] = [
      {
        label: 'Ver detalle',
        icon: 'pi pi-eye',
        command: () => this.viewNote(note),
      },
      {
        separator: true,
      },
      {
        label: 'Cambiar Estado',
        icon: 'pi pi-check-circle',
        items: STATUS_OPTIONS.map((opt) => ({
          label: opt.label,
          icon: note.status === opt.value ? 'pi pi-check text-primary' : '',
          command: () => this.onStatusChange(note, opt.value),
        })),
      },
      {
        label: 'Asignar a...',
        icon: 'pi pi-user-plus',
        command: () => this.openAssignModalForNote(note, this.getAssignedSingleId(note)),
        visible: this.canEditFull(note),
      },
      {
        label: 'Compartir',
        icon: 'pi pi-share-alt',
        items: [
          {
            label: 'WhatsApp',
            icon: 'pi pi-whatsapp',
            command: () => this.shareNoteFromNote(note, 'whatsapp'),
          },
          {
            label: 'Correo',
            icon: 'pi pi-envelope',
            command: () => this.shareNoteFromNote(note, 'email'),
          },
        ],
      },
    ];

    if (this.canEditFull(note)) {
      actions.push({
        label: 'Eliminar',
        icon: 'pi pi-trash',
        severity: 'danger' as any,
        command: () => this.deleteNote(note),
      });
    }

    return actions;
  }

  /** Abre el modal de acciones para una nota. */
  openActions(note: AgendaNote): void {
    this.selectedActionNote.set(note);
    this.showActionsModal.set(true);
  }

  /** Cierra el modal de acciones. */
  closeActions(): void {
    this.showActionsModal.set(false);
    this.selectedActionNote.set(null);
  }

  // --- Sharing Logic ---

  /** Abre el modal de compartir agenda. */
  openShareModal(): void {
    this.showShareModal.set(true);
    // Cargar datos si no están cargados
    if (this.areasWithUsers().length === 0) {
      this.loadSharingData();
    }
    // Cargar mi configuración actual
    const user = this.authService.getCurrentUser();
    if (user && user.id) {
      this.usersApi.getById(user.id).subscribe(u => {
        // agendaSharedWith puede ser string[] o objeto[], normalizar siempre a IDs
        const shared = (u as any).agendaSharedWith || [];
        const ids = shared.map((s: any) => {
          if (typeof s === 'string') return s;
          return s._id || s.id;
        }).filter((id: string) => !!id);
        this.mySharedWith.set(ids);
      });
    }
  }

  closeShareModal(): void {
    this.showShareModal.set(false);
  }

  loadSharingData(): void {
    this.areasApi.listWithUsers().subscribe(areas => {
      this.areasWithUsers.set(areas);
    });
  }

  toggleUserShare(userId: string): void {
    if (!userId) {
      console.warn('ID de usuario inválido en toggleUserShare');
      return;
    }
    const current = this.mySharedWith();
    if (current.includes(userId)) {
      this.mySharedWith.set(current.filter(id => id !== userId));
    } else {
      this.mySharedWith.set([...current, userId]);
    }
    console.log('Usuarios compartidos actualizados:', this.mySharedWith());
  }

  saveSharing(): void {
    const user = this.authService.getCurrentUser();
    if (!user || !user.id) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se detectó el usuario actual' });
      return;
    }

    const payload = { agendaSharedWith: this.mySharedWith() };
    console.log('Guardando preferencias de compartir:', payload);

    this.saving.set(true);
    this.profileApi.updateProfile(payload).subscribe({
      next: (res) => {
        console.log('Respuesta de guardado (perfil):', res);
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Preferencias de compartir guardadas' });
        this.closeShareModal();
        this.saving.set(false);
      },
      error: (err) => {
        console.error('Error al guardar preferencias:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar' });
        this.saving.set(false);
      }
    });
  }

  /** Carga la lista de usuarios que compartieron conmigo para el filtro. */
  loadSharedWithMe(): void {
    this.usersApi.getSharedWithMe().subscribe(users => {
      const options = users.map(u => ({
        _id: u.id || u._id,
        name: u.name,
        email: u.email,
        role: u.role
      }));
      this.sharedWithMe.set(options);

      // Si no es gerencia, agregar estos usuarios a userOptions
      if (!this.isGerencia()) {
        const current = this.userOptions();
        const newOptions = [...current];
        options.forEach(opt => {
          if (!newOptions.some(o => o._id === opt._id)) {
            newOptions.push(opt);
          }
        });
        this.userOptions.set(newOptions);
      }
    });
  }

  // --- Microsoft Calendar Logic ---
  msEvents = signal<import('../../shared/services/microsoft-graph.service').MicrosoftEvent[]>([]);
  loadingMsEvents = signal(false);

  connectMicrosoft(): void {
    this.msGraphService.login();
  }

  logoutMicrosoft(): void {
    this.msGraphService.logout();
    this.msEvents.set([]);
  }

  loadMsEvents(): void {
    if (!this.msGraphService.isLoggedIn()) return;
    this.loadingMsEvents.set(true);
    this.msGraphService.getCalendarEvents()
      .pipe(finalize(() => this.loadingMsEvents.set(false)))
      .subscribe({
        next: (res: { value: import('../../shared/services/microsoft-graph.service').MicrosoftEvent[] }) => this.msEvents.set(res.value),
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el calendario' })
      });
  }
}
