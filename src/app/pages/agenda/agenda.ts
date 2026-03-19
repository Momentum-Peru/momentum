import {
  Component,
  OnInit,
  signal,
  inject,
  computed,
  ViewChild,
  ElementRef,
  effect,
  HostListener,
} from '@angular/core';
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
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService, ConfirmationService, MenuItem } from 'primeng/api';
import { UsersApiService } from '../../shared/services/users-api.service';
import { AreasApiService } from '../../shared/services/areas-api.service';
import { ProfileApiService } from '../../shared/services/profile-api.service';
import { AuthService } from '../login/services/auth.service';
import { MenuService } from '../../shared/services/menu.service';
import { TenantService } from '../../core/services/tenant.service';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom, of, timer, from, forkJoin } from 'rxjs';
import { tap, map, catchError, finalize, switchMap } from 'rxjs/operators';
import { ContactsService, Contact } from '../../shared/services/contacts.service';
import { UserOption } from '../../shared/interfaces/menu-permission.interface';
import {
  AgendaNote,
  AgendaNoteStatus,
  AgendaNoteType,
  AgendaNoteUser,
  AgendaNoteExternal,
} from '../../shared/interfaces/agenda-note.interface';
import { AgendaApiService, PresignedUrlResponse } from '../../shared/services/agenda-api.service';

const AGENDA_STATUS_OPTIONS: { label: string; value: AgendaNoteStatus }[] = [
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'En curso', value: 'en_proceso' },
  { label: 'Terminada', value: 'terminado' },
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
    ProgressSpinnerModule,
  ],
  templateUrl: './agenda.html',
  styleUrl: './agenda.scss',
  providers: [MessageService, ConfirmationService],
})
export class AgendaPage implements OnInit {
  private readonly usersApi = inject(UsersApiService);
  private readonly profileApi = inject(ProfileApiService);
  private readonly areasApi = inject(AreasApiService);
  public readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly menuService = inject(MenuService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly tenantService = inject(TenantService);
  private readonly contactsService = inject(ContactsService);
  private readonly agendaApi = inject(AgendaApiService);

  readonly canEdit = computed(() => this.menuService.canEdit('/agenda'));

  globalContacts = signal<Contact[]>([]);

  /** Lista unificada de responsables: Usuarios + Contactos Externos */
  assigneeOptions = computed(() => {
    const users = this.userOptions().map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      isExternal: false,
    }));

    const contacts = this.globalContacts().map((c) => ({
      id: `ext_${c._id}`,
      name: c.name,
      email: c.email,
      isExternal: true,
      phone: c.phone,
    }));

    return [...users, ...contacts];
  });

  constructor() { }

  /** True si el usuario actual está asignado a la nota. */
  isAssignedToMe(item: AgendaNote): boolean {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return false;
    const assigned = item.assignedTo ?? [];
    return assigned.some((a) =>
      typeof a === 'string' ? a === userId : a._id === userId,
    );
  }

  /** True si el usuario actual es el creador. */
  isCreator(item: AgendaNote): boolean {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return false;
    const createdBy = item.createdBy;
    const creatorId = typeof createdBy === 'string' ? createdBy : (createdBy as { _id?: string })?._id;
    return creatorId === userId;
  }

  /** True si el usuario puede editar por completo. */
  canEditFull(item: AgendaNote): boolean {
    return this.canEdit() && (this.authService.isGerencia() || this.isCreator(item));
  }

  /** True si el usuario puede editar el estado. */
  canEditStatus(item: AgendaNote): boolean {
    return this.canEditFull(item) || this.isAssignedToMe(item);
  }

  /** True si el usuario es Gerencia. */
  isGerencia(): boolean {
    return this.authService.isGerencia();
  }

  isOverdue(item: AgendaNote): boolean {
    const dueAt = item.dueAt;
    const status = item.status;
    if (!dueAt || status === 'terminado') return false;
    return new Date(dueAt).getTime() < Date.now();
  }

  getRowClass(item: AgendaNote): string {
    const status = item.status;
    if (status === 'terminado') return 'row-finished';
    if (this.isOverdue(item)) return 'row-overdue';
    if (status === 'pendiente') return 'row-pending';
    return '';
  }

  getStatusClass(status: AgendaNoteStatus | undefined): string {
    switch (status) {
      case 'pendiente':
        return 'text-yellow-600';
      case 'en_proceso':
        return 'text-blue-600';
      case 'terminado':
        return 'text-emerald-600';
      default:
        return '';
    }
  }

  getStatusLabel(status: AgendaNoteStatus | undefined): string {
    switch (status) {
      case 'pendiente':
        return 'Pendiente';
      case 'en_proceso':
        return 'En curso';
      case 'terminado':
        return 'Terminada';
      default:
        return status ?? '';
    }
  }

  getContentSummary(item: AgendaNote): string {
    return item.content ?? '';
  }

  getTypeIcon(_type?: string): string {
    return 'pi pi-list';
  }

  /** Fecha de vencimiento en ISO string. */
  getDueDate(item: AgendaNote): string | undefined {
    const raw = item.dueAt;
    if (raw == null) return undefined;
    return typeof raw === 'string' ? raw : new Date(raw).toISOString();
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

  /** Construye el texto a compartir según el tipo de nota (solo contenido, sin URL de la página). */

  notes = signal<AgendaNote[]>([]);

  loading = signal(false);
  step = signal(1);
  noteContent = signal('');
  createDueAt = signal<Date | null>(null);
  currentNote = signal<AgendaNote | null>(null);
  userOptions = signal<UserOption[]>([]);
  showCreateOptions = signal(false);
  showCreateDialog = signal(false);
  /** Usuario a asignar al crear una nueva nota (texto, voz o dibujo). */
  createAssignUserId = signal<string | null>(null);
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
  /** Modal para visualizar dibujo en tamaño completo */
  showDrawingViewerModal = signal(false);
  drawingViewerUrl = signal<string | null>(null);

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

  // --- Inline Editing State ---
  inlineEditingId = signal<string | null>(null);
  inlineEditingNote = signal<AgendaNote | null>(null);
  inlineEditContent = signal('');
  inlineEditDueAt = signal<Date | null>(null);
  inlineEditStatus = signal<AgendaNoteStatus>('pendiente');

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (!this.inlineEditingId()) return;
    const target = event.target as HTMLElement;
    // Dentro del propio row de edición
    if (target.closest('[data-inline-edit]')) return;
    // Dentro de un portal PrimeNG (overlay, select, datepicker) anclado al body
    let el: Element | null = target;
    while (el && el.parentElement !== document.body) {
      el = el.parentElement;
    }
    if (el && (el.hasAttribute('data-pc-name') || el.classList.contains('p-overlay') || el.classList.contains('p-component'))) return;
    const note = this.inlineEditingNote();
    if (note) this.saveInlineEdit(note);
  }

  // Sharing Modal
  showShareModal = signal(false);
  areasWithUsers = signal<import('../../shared/interfaces/area.interface').AreaWithUsers[]>([]);
  mySharedWith = signal<string[]>([]); // Usuarios con los que YO comparto
  sharedWithMe = signal<UserOption[]>([]); // Usuarios que comparten CONMIGO

  pendingContactAssignment = signal<{ name: string; email?: string; phone?: string } | null>(null);

  readonly statusOptions = AGENDA_STATUS_OPTIONS;

  @ViewChild('canvasEl') canvasRef?: ElementRef<HTMLCanvasElement>;

  /** Usuarios ordenados para los botones de selección (sin transformar el nombre). */
  agendaUserButtons = computed(() => {
    const raw = this.userOptions();
    const currentUserId = this.authService.getCurrentUser()?.id;

    const uniqueMap = new Map<string, UserOption>();
    raw.forEach((u) => { if (!uniqueMap.has(u._id)) uniqueMap.set(u._id, u); });

    return Array.from(uniqueMap.values()).sort((a, b) => {
      if (a._id === currentUserId) return -1;
      if (b._id === currentUserId) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  });

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  private readonly AVATAR_COLORS = [
    { bg: 'bg-violet-500', border: 'border-violet-500', hex: '#8b5cf6' },
    { bg: 'bg-blue-500',   border: 'border-blue-500',   hex: '#3b82f6' },
    { bg: 'bg-emerald-500',border: 'border-emerald-500',hex: '#10b981' },
    { bg: 'bg-amber-500',  border: 'border-amber-500',  hex: '#f59e0b' },
    { bg: 'bg-rose-500',   border: 'border-rose-500',   hex: '#f43f5e' },
    { bg: 'bg-cyan-500',   border: 'border-cyan-500',   hex: '#06b6d4' },
    { bg: 'bg-orange-500', border: 'border-orange-500', hex: '#f97316' },
    { bg: 'bg-teal-500',   border: 'border-teal-500',   hex: '#14b8a6' },
  ];

  private getUserColorIndex(userId: string): number {
    const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return hash % this.AVATAR_COLORS.length;
  }

  getUserAvatarBg(userId: string): string {
    return this.AVATAR_COLORS[this.getUserColorIndex(userId)].bg;
  }

  getUserAvatarBorder(userId: string): string {
    return this.AVATAR_COLORS[this.getUserColorIndex(userId)].border;
  }

  /** Todas las notas del tenant, cargadas al inicio solo para calcular contadores por usuario. */
  allNotesForCounts = signal<AgendaNote[]>([]);

  /** Conteo de notas por creador (createdBy), que es el mismo filtro que usa la API al seleccionar un usuario. */
  userNoteCounts = computed((): Record<string, number> => {
    const counts: Record<string, number> = {};
    this.allNotesForCounts().forEach((note) => {
      const cb = note.createdBy;
      const creatorId = typeof cb === 'string' ? cb : (cb as AgendaNoteUser)?._id;
      if (creatorId) counts[creatorId] = (counts[creatorId] || 0) + 1;
    });
    return counts;
  });

  selectUserToggle(userId: string): void {
    if (this.selectedUserId() === userId) {
      this.selectUser(null);
    } else {
      this.selectUser(userId);
    }
  }

  tabs: { label: string; value: string; icon: string; activeClass: string; inactiveClass: string; badgeActiveClass: string; badgeInactiveClass: string }[] = [
    {
      label: 'Todas', value: 'all', icon: 'pi pi-list',
      activeClass: 'bg-black text-white shadow-md',
      inactiveClass: 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700',
      badgeActiveClass: 'bg-white/25 text-white',
      badgeInactiveClass: 'bg-gray-100 dark:bg-gray-700 text-gray-500',
    },
    {
      label: 'Pendiente', value: 'pendiente', icon: 'pi pi-clock',
      activeClass: 'bg-amber-500 text-white shadow-md shadow-amber-200 dark:shadow-amber-900',
      inactiveClass: 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700',
      badgeActiveClass: 'bg-white/30 text-white',
      badgeInactiveClass: 'bg-gray-100 dark:bg-gray-700 text-gray-500',
    },
    {
      label: 'En curso', value: 'en_proceso', icon: 'pi pi-sync',
      activeClass: 'bg-blue-500 text-white shadow-md shadow-blue-200 dark:shadow-blue-900',
      inactiveClass: 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700',
      badgeActiveClass: 'bg-white/30 text-white',
      badgeInactiveClass: 'bg-gray-100 dark:bg-gray-700 text-gray-500',
    },
    {
      label: 'Terminada', value: 'terminado', icon: 'pi pi-check-circle',
      activeClass: 'bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900',
      inactiveClass: 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700',
      badgeActiveClass: 'bg-white/30 text-white',
      badgeInactiveClass: 'bg-gray-100 dark:bg-gray-700 text-gray-500',
    },
  ];

  activeTab = signal<string>('all');

  tabCounts = computed((): Record<string, number> => {
    const notes = this.notes();
    return {
      all: notes.length,
      pendiente: notes.filter((n) => n.status === 'pendiente').length,
      en_proceso: notes.filter((n) => n.status === 'en_proceso').length,
      terminado: notes.filter((n) => n.status === 'terminado').length,
    };
  });

  searchQuery = signal('');

  /** Usuarios ordenados: el actual primero, luego el resto, filtrados por buscador. */
  sortedUserOptions = computed(() => {
    const raw = this.userOptions();
    const query = this.userSearchQuery().toLowerCase().trim();
    const currentUserId = this.authService.getCurrentUser()?.id;

    // Deduplicar defensivamente por _id
    const uniqueUsersMap = new Map<string, UserOption>();
    raw.forEach((u) => {
      if (!uniqueUsersMap.has(u._id)) {
        uniqueUsersMap.set(u._id, u);
      }
    });
    const uniqueRaw = Array.from(uniqueUsersMap.values());

    let filtered = uniqueRaw;
    if (query) {
      filtered = uniqueRaw.filter(
        (u) => u.name?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query),
      );
    }

    return filtered
      .sort((a, b) => {
        if (a._id === currentUserId) return -1;
        if (b._id === currentUserId) return 1;
        return (a.name || '').localeCompare(b.name || '');
      })
      .map((u) => ({
        ...u,
        name: u._id === currentUserId ? 'Mi Agenda' : `Agenda de ${u.name}`,
      }));
  });

  isViewingOther = computed(() => {
    const selected = this.selectedUserId();
    const current = this.authService.getCurrentUser()?.id;
    return !!selected && selected !== current;
  });

  selectedUserName = computed(() => {
    const selected = this.selectedUserId();
    if (!selected) return null;
    const user = this.userOptions().find((u) => u._id === selected);
    return user?.name || null;
  });

  /** Notas filtradas por pestaña, búsqueda y filtros adicionales. */
  // --- Computed Views for Template ---

  /**
   * Vista Agrupada para Gerencia en "Actividades".
   * Retorna array de grupos: { user: UserOption, notes: AgendaNote[] }
   * Incluye un grupo para "Sin Asignar".
   */
  groupedActivities = computed(() => {
    if (!this.authService.isGerencia()) return [];
    if (this.selectedUserId()) return [];

    const allNotes = this.notes();
    const users = this.userOptions();
    const query = this.searchQuery().toLowerCase().trim();
    const tab = this.activeTab();

    let filtered = tab !== 'all' ? allNotes.filter((n) => n.status === tab) : allNotes.filter((n) => n.status !== 'terminado');
    if (query) {
      filtered = filtered.filter((n) => n.content?.toLowerCase().includes(query));
    }

    const groups = new Map<string, AgendaNote[]>();
    const unassigned: AgendaNote[] = [];

    filtered.forEach((note) => {
      const userId = this.getNoteAssigneeId(note);
      if (!userId) {
        unassigned.push(note);
      } else {
        if (!groups.has(userId)) groups.set(userId, []);
        groups.get(userId)!.push(note);
      }
    });

    const result: { user: UserOption | null; notes: AgendaNote[] }[] = [];
    const currentUserId = this.authService.getCurrentUser()?.id;

    const usersWithNotes = users
      .filter((u) => groups.has(u._id))
      .sort((a, b) => {
        if (a._id === currentUserId) return -1;
        if (b._id === currentUserId) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });

    usersWithNotes.forEach((u) => {
      result.push({ user: u, notes: groups.get(u._id)! });
    });

    if (unassigned.length > 0) {
      result.unshift({
        user: { _id: 'unassigned', name: 'Sin Asignar', email: '', role: 'user' },
        notes: unassigned,
      });
    }

    return result;
  });

  /** Primer usuario asignado (para agrupar/vista). */
  getNoteAssigneeId(note: AgendaNote): string | null {
    const a = note.assignedTo;
    if (!a?.length) return null;
    const first = a[0];
    return typeof first === 'string' ? first : first._id ?? null;
  }

  /**
   * Vista Simple para Empleados (o cuando se filtra por usuario en Gerencia).
   */
  flatActivities = computed(() => {
    const isGerencia = this.authService.isGerencia();
    if (isGerencia && !this.selectedUserId()) return [];

    const allNotes = this.notes();
    const query = this.searchQuery().toLowerCase().trim();
    const tab = this.activeTab();

    let list = tab !== 'all' ? allNotes.filter((n) => n.status === tab) : allNotes.filter((n) => n.status !== 'terminado');
    if (query) {
      list = list.filter((n) => n.content?.toLowerCase().includes(query));
    }

    return list.sort((a, b) => {
      const t1 = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      const t2 = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      return t2 - t1;
    });
  });

  /** Helper para operaciones masivas (seleccionar todo) que devuelve todas las tareas visibles actualmente */
  visibleNotes = computed(() => {
    // Activities only (Reuniones en /meetings)
    const grouped = this.groupedActivities();
    if (grouped.length > 0) {
      return grouped.flatMap((g) => g.notes);
    }
    return this.flatActivities();
  });

  // Alias para la vista, reemplazando los computed anteriores si es necesario o usándolos de base
  // Vamos a usar displayedNotes() en el HTML principal.

  ngOnInit(): void {
    this.loadNotes();
    this.loadAllNotesForCounts();
    this.loadUsers();
    this.loadSharedWithMe();
    this.loadGlobalContacts();

    // Check for createForContact query param
    this.route.queryParams.subscribe((params: any) => {
      if (params['createForContact']) {
        const contact = {
          _id: params['createForContact'],
          name: params['contactName'],
          email: params['contactEmail'],
          phone: params['contactPhone'],
        };

        if (contact.name) {
          // Open Create Dialog first to clear previous state
          this.activeTab.set('activities');
          this.openCreate();
          // Then set the pending contact
          this.pendingContactAssignment.set(contact);
          this.messageService.add({
            severity: 'info',
            summary: 'Crear para Contacto',
            detail: `Creando actividad para ${contact.name}`,
          });
        }
      }
    });
  }

  loadNotes(): void {
    this.loading.set(true);
    const filters = this.buildAgendaFilters();
    this.agendaApi
      .list(filters)
      .subscribe({
        next: (notes) => this.notes.set(notes),
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las notas de agenda',
          });
        },
      })
      .add(() => this.loading.set(false));
  }

  /** Carga todas las notas del tenant (sin filtro de usuario) para calcular contadores. */
  loadAllNotesForCounts(): void {
    this.agendaApi.list({ forUser: true }).subscribe({
      next: (notes) => this.allNotesForCounts.set(notes),
      error: () => {},
    });
  }

  private buildAgendaFilters(): import('../../shared/services/agenda-api.service').AgendaListFilters {
    const isGerencia = this.authService.isGerencia();
    const selectedUser = this.selectedUserId();
    if (isGerencia && selectedUser) {
      return { createdBy: selectedUser };
    }
    return { forUser: true };
  }

  selectUser(userId: string | null): void {
    this.selectedUserId.set(userId);
    this.loadNotes();
  }


  loadGlobalContacts(): void {
    this.contactsService.findAll().subscribe({
      next: (contacts) => this.globalContacts.set(contacts),
      error: (err: unknown) => console.error('Error loading global contacts', err),
    });
  }

  /** Carga todos los usuarios del tenant (todas las páginas) para el selector y "Asignar a". */
  loadUsers(): void {
    const tenantId = this.tenantService.tenantId();
    // Todos los usuarios ven la lista completa del tenant en "Asignar a".
    this.usersApi.listAll(tenantId ?? undefined).subscribe({
      next: (opts) => this.userOptions.set(opts),
      error: () => { },
    });
  }

  /** Tipo de nota a crear: 'text' o 'drawing'. */
  createType = signal<AgendaNoteType>('text');

  openCreate(type: AgendaNoteType = 'text'): void {
    this.createType.set(type);
    this.clearCreateFields();
    this.createAssignUserId.set(null);
    this.pendingDrawingDataUrl.set(null);
    this.showCreateDialog.set(true);
  }

  canCreateNote = computed(() => {
    const type = this.createType();
    if (type === 'drawing') {
      return this.pendingDrawingDataUrl() != null;
    }
    return this.noteContent().trim().length > 0;
  });

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

  /** Limpia campos del flujo de creación. */
  private clearCreateFields(): void {
    this.noteContent.set('');
    this.createDueAt.set(null);
    this.createAssignUserId.set(null);
    this.pendingContactAssignment.set(null);
  }

  saveNote(): void {
    const type = this.createType();
    const content = this.noteContent().trim();
    const drawingDataUrl = this.pendingDrawingDataUrl();

    if (type === 'text' && !content) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail: 'Escribe el contenido de la actividad.',
      });
      return;
    }
    if (type === 'drawing' && !drawingDataUrl) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail: 'Dibuja algo antes de guardar.',
      });
      return;
    }

    this.saving.set(true);
    const dueAtIso = this.createDueAt()?.toISOString();
    const assigneeId = this.createAssignUserId();
    const pendingContact = this.pendingContactAssignment();

    const doAssign = (note: AgendaNote) => {
      const userIds: string[] = [];
      const externalContacts: { name: string; email: string; phone?: string }[] = [];
      if (assigneeId && !assigneeId.startsWith('ext_')) userIds.push(assigneeId);
      if (assigneeId?.startsWith('ext_')) {
        const contactId = assigneeId.split('_')[1];
        const contact = this.globalContacts().find((c) => c._id === contactId);
        if (contact) {
          externalContacts.push({
            name: contact.name,
            email: contact.email ?? '',
            phone: contact.phone,
          });
        }
      }
      if (pendingContact) {
        externalContacts.push({
          name: pendingContact.name,
          email: pendingContact.email ?? '',
          phone: pendingContact.phone,
        });
      }
      if (userIds.length > 0 || externalContacts.length > 0) {
        return this.agendaApi.assign(note._id, {
          userIds,
          dueAt: dueAtIso,
          externalContacts: externalContacts.length > 0 ? externalContacts : undefined,
        });
      }
      return of(note);
    };

    if (type === 'drawing' && drawingDataUrl) {
      this.agendaApi
        .create({
          type: 'drawing',
          content: 'Dibujo',
          status: 'pendiente',
          dueAt: dueAtIso ?? undefined,
        })
        .pipe(
          switchMap((note) =>
            from(
              this.dataUrlToBlob(drawingDataUrl).then((blob) => {
                const file = new File(
                  [blob],
                  `dibujo-${Date.now()}.png`,
                  { type: 'image/png' },
                );
                return firstValueFrom(
                  this.agendaApi.generateDrawingPresignedUrl(
                    note._id,
                    file.name,
                    file.type,
                    3600,
                  ),
                ).then((res) =>
                  this.agendaApi
                    .uploadFileToS3(res.presignedUrl, file, file.type)
                    .then(() =>
                      firstValueFrom(
                        this.agendaApi.confirmDrawingUpload(note._id, res.publicUrl),
                      ),
                    )
                    .then(() => note),
                );
              }),
            ),
          ),
          switchMap((note) => doAssign(note)),
        )
        .subscribe({
          next: (note) => {
            this.notes.update((prev) => [note, ...prev]);
            this.messageService.add({
              severity: 'success',
              summary: 'Dibujo creado',
              detail: 'La actividad se creó correctamente.',
            });
            this.closeCreate();
          },
          error: (err: unknown) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail:
                (err as { error?: { message?: string } })?.error?.message ??
                'No se pudo crear la actividad',
            });
          },
        })
        .add(() => this.saving.set(false));
      return;
    }

    this.agendaApi
      .create({
        type: 'text',
        content,
        status: 'pendiente',
        dueAt: dueAtIso ?? undefined,
      })
      .pipe(switchMap((note) => doAssign(note)))
      .subscribe({
        next: (note) => {
          this.notes.update((prev) => [note, ...prev]);
          this.messageService.add({
            severity: 'success',
            summary: 'Actividad creada',
            detail: 'La nota se creó correctamente.',
          });
          this.closeCreate();
        },
        error: (err: unknown) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              (err as { error?: { message?: string } })?.error?.message ??
              'No se pudo crear la actividad',
          });
        },
      })
      .add(() => this.saving.set(false));
  }

  canGoNext = computed(() => this.canCreateNote());

  nextStep(): void {
    if (this.canCreateNote()) this.saveNote();
  }

  prevStep(): void {
    this.closeCreate();
  }

  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl);
    return res.blob();
  }

  /** Id del primer usuario asignado (para selector). */
  getAssignedSingleId(note: AgendaNote): string | null {
    return this.getNoteAssigneeId(note);
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
    const notes = this.visibleNotes();
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
    const notes = this.visibleNotes();
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
      this.agendaApi.assign(note._id, { userIds: [] }).subscribe({
        next: () => {
          this.loadNotes();
          this.loadAllNotesForCounts();
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
    const due = this.getDueDate(note);
    this.assignModalDueAt.set(due ? new Date(due) : null);
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
    this.createAssignUserId.set(null);
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

  formatEventTimeRange(start: string, end: string): string {
    try {
      const s = new Date(start);
      const e = new Date(end);
      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      };
      return `${s.toLocaleTimeString('es-PE', options)} - ${e.toLocaleTimeString('es-PE', options)}`;
    } catch {
      return '';
    }
  }

  /** Nombre del usuario seleccionado en el modal de asignación. */
  getAssignModalUserName(): string {
    const id = this.assignModalUserId();
    if (!id) return '—';
    if (id.startsWith('ext_')) {
      const contactId = id.split('_')[1];
      const contact = this.globalContacts().find((c) => c._id === contactId);
      return contact ? `(EXT) ${contact.name}` : 'Contacto Ext.';
    }
    const user = this.userOptions().find((u) => u._id === id);
    return user?.name ?? user?.email ?? id;
  }

  /** Confirmar asignación desde el modal (aplica usuario y fecha/hora vencimiento). */
  confirmAssignModal(): void {
    const ids = this.assignModalNoteIds();
    const targetId = this.assignModalUserId();
    const dueAt = this.assignModalDueAt();
    if (!ids.length) {
      this.closeAssignModal();
      return;
    }

    const dueAtIso = dueAt ? dueAt.toISOString() : undefined;
    this.bulkAssigning.set(true);

    const userIds: string[] = [];
    const externalContacts: { name: string; email: string; phone?: string }[] = [];
    if (targetId && !targetId.startsWith('ext_')) {
      userIds.push(targetId);
    } else if (targetId?.startsWith('ext_')) {
      const contactId = targetId.split('_')[1];
      const contact = this.globalContacts().find((c) => c._id === contactId);
      if (contact) {
        externalContacts.push({
          name: contact.name,
          email: contact.email ?? '',
          phone: contact.phone,
        });
      }
    }

    const assignWithRetry = (id: string) =>
      firstValueFrom(
        this.agendaApi
          .assign(id, { userIds, dueAt: dueAtIso, externalContacts })
          .pipe(
            map(() => true),
            catchError(() => of(false)),
          ),
      );
    Promise.all(ids.map((id) => assignWithRetry(id)))
      .then((results) => {
        const ok = results.filter(Boolean).length;
        const fail = results.length - ok;
        this.loadNotes();
        this.loadAllNotesForCounts();
        this.closeAssignModal();
        if (ids.length > 1) {
          this.clearSelection();
          this.bulkAssignUserId.set(null);
        }
        if (fail === 0 && ids.length === 1 && this.currentNote()?._id === ids[0]) {
          this.agendaApi.getById(ids[0]).subscribe((updated) => this.currentNote.set(updated));
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
                ? `Asignadas ${ok} nota(s). ${fail} no se pudieron asignar (sin permiso para asignar).`
                : 'No se pudo asignar (sin permiso para asignar esa nota).',
          });
        }
      })
      .finally(() => this.bulkAssigning.set(false));
  }

  /** Asignar o cambiar la persona asignada (abre modal con vencimiento). */
  onAssignChange(note: AgendaNote, targetId: string | null): void {
    if (!targetId || targetId.startsWith('ext_')) {
      this.agendaApi.assign(note._id, { userIds: [] }).subscribe({
        next: (updated) => {
          this.notes.update((list) => list.map((n) => (n._id === updated._id ? updated : n)));
          if (this.currentNote()?._id === updated._id) this.currentNote.set(updated);
          this.messageService.add({
            severity: 'success',
            summary: 'Actualizado',
            detail: 'Asignación quitada',
          });
        },
      });
      return;
    }
    this.openAssignModalForNote(note, targetId);
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
      error: (err: unknown) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail:
            (err as { error?: { message?: string } })?.error?.message ??
            'No se pudo actualizar el estado',
        });
      },
    });
  }

  shareNoteFromNote(note: AgendaNote, channel: 'email' | 'whatsapp'): void {
    this.agendaApi.getById(note._id).subscribe({
      next: (full) => {
        this.currentNote.set(full);
        this.shareNote(channel);
      },
      error: () => {
        this.currentNote.set(note);
        this.shareNote(channel);
      },
    });
  }

  shareNoteNative(note: AgendaNote): void {
    const shareText = this.generateTaskShareMessage(note, true); // Ensure we use the message generator

    if (navigator.share) {
      navigator
        .share({
          title: 'Tarea Tecmeing',
          text: shareText,
        })
        .catch((err: unknown) => {
          if ((err as { name?: string }).name !== 'AbortError') {
            console.error('Error sharing:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Compartir',
              detail: 'No se pudo abrir el menú de compartir',
            });
          }
        });
    } else {
      this.shareNoteFromNote(note, 'whatsapp');
    }
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

  /**
   * Genera el mensaje de texto para compartir (solo texto y detalles, sin URL de la página).
   */
  private generateTaskShareMessage(note: AgendaNote, _includeLink = true): string {
    let msg = `Tienes una nueva tarea en la plataforma Momentum\n\n`;
    msg += `📝 Descripción: ${this.getContentSummary(note) || 'Sin contenido'}\n`;
    msg += `📊 Estado: ${this.getStatusLabel(note.status)}\n`;

    const due = this.getDueDate(note);
    if (due) {
      msg += `⏰ Vencimiento: ${this.formatDueAt(due)}\n`;
    } else {
      msg += `⏰ Vencimiento: Sin definir\n`;
    }

    return msg;
  }

  shareNote(channel: 'email' | 'whatsapp', note?: AgendaNote): void {
    const noteToShare = note || this.currentNote();
    console.log('[Agenda] shareNote called', { channel, note: noteToShare });

    if (!noteToShare) {
      console.warn('[Agenda] No current note to share');
      return;
    }

    const isExternal = (noteToShare.assignedExternal?.length ?? 0) > 0;
    const shareMessage = this.generateTaskShareMessage(noteToShare, !isExternal);

    // Abrimos el destino inmediatamente
    if (channel === 'whatsapp') {
      const encodedMsg = encodeURIComponent(shareMessage);
      const phone = noteToShare.assignedExternal?.[0]?.phone || '';
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const url = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
        : `https://wa.me/?text=${encodedMsg}`;

      console.log('[Agenda] Opening WhatsApp URL:', url);
      // WhatsApp needs a new tab
      window.open(url, '_blank');
    } else if (channel === 'email') {
      const subject = encodeURIComponent('Detalles de actividad agenda');
      const body = encodeURIComponent(shareMessage);
      const email = noteToShare.assignedExternal?.[0]?.email || '';
      const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

      console.log('[Agenda] Opening Email URL:', mailtoUrl);
      // Mailto is best handled by location.href to avoid empty tabs
      window.location.href = mailtoUrl;
    }

    // Registramos la acción en el servidor en segundo plano
    this.agendaApi.share(noteToShare._id, { channel, to: undefined }).subscribe({
      next: () => {
        console.log('[Agenda] Share registered successfully');
        this.messageService.add({
          severity: 'success',
          summary: 'Compartir',
          detail: channel === 'email' ? 'Cliente de correo abierto' : 'WhatsApp abierto',
        });
      },
      error: (err: unknown) => {
        console.warn('[Agenda] Failed to register share action', err);
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
        next: (res: { text?: string }) => {
          this.noteContent.set(res.text ?? '');
          const prev = this.voicePreviewUrl();
          if (prev) URL.revokeObjectURL(prev);
          this.voicePreviewUrl.set(URL.createObjectURL(file));
          this.showVoiceConfirmModal.set(true);
          this.showCreateDialog.set(false);
        },
        error: (err: unknown) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Transcripción',
            detail:
              (err as { error?: { message?: string } })?.error?.message ??
              'No se pudo transcribir el audio',
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

  /** Abre el modal para visualizar un dibujo en tamaño completo */
  openDrawingViewer(url: string): void {
    this.drawingViewerUrl.set(url);
    this.showDrawingViewerModal.set(true);
  }

  /** Cierra el modal de visualización de dibujo */
  closeDrawingViewerModal(): void {
    this.showDrawingViewerModal.set(false);
    this.drawingViewerUrl.set(null);
  }

  /** Guarda la nota de voz: crea nueva o actualiza existente. */
  saveFromVoiceModal(): void {
    const content = this.noteContent().trim();
    const voiceFile = this.pendingVoiceFile();
    const noteId = this.editingNoteId();

    if (!content && !voiceFile) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail: 'Transcripción o audio requerido.',
      });
      return;
    }

    this.saving.set(true);
    const dueAtIso = this.createDueAt()?.toISOString();
    const assigneeId = this.createAssignUserId();
    const pendingContact = this.pendingContactAssignment();

    if (noteId) {
      this.agendaApi
        .update(noteId, { content: content || undefined })
        .pipe(
          switchMap((updated) => {
            this.notes.update((list) =>
              list.map((n) => (n._id === updated._id ? updated : n)),
            );
            if (voiceFile) {
              return from(this.uploadVoiceFileToNote(noteId, voiceFile)).pipe(
                switchMap(() =>
                  this.agendaApi.getById(noteId),
                ),
              );
            }
            return of(updated);
          }),
          switchMap((note) => {
            const oldUrls = this.editingNoteVoiceUrls();
            if (oldUrls.length === 0) return of(note);
            return forkJoin(
              oldUrls.map((url) => this.agendaApi.removeVoice(noteId, url)),
            ).pipe(
              map((results) => (results.length > 0 ? results[results.length - 1] : note)),
              catchError(() => of(note)),
            );
          }),
          switchMap((note) => {
            const userIds: string[] = [];
            const externalContacts: { name: string; email: string; phone?: string }[] = [];
            if (assigneeId && !assigneeId.startsWith('ext_')) userIds.push(assigneeId);
            if (assigneeId?.startsWith('ext_')) {
              const contactId = assigneeId.split('_')[1];
              const contact = this.globalContacts().find((c) => c._id === contactId);
              if (contact) {
                externalContacts.push({
                  name: contact.name,
                  email: contact.email ?? '',
                  phone: contact.phone,
                });
              }
            }
            if (pendingContact) {
              externalContacts.push({
                name: pendingContact.name,
                email: pendingContact.email ?? '',
                phone: pendingContact.phone,
              });
            }
            if (userIds.length > 0 || externalContacts.length > 0) {
              return this.agendaApi.assign(note._id, {
                userIds,
                dueAt: dueAtIso,
                externalContacts: externalContacts.length > 0 ? externalContacts : undefined,
              });
            }
            return of(note);
          }),
        )
        .subscribe({
          next: (note) => {
            this.notes.update((list) =>
              list.map((n) => (n._id === note._id ? note : n)),
            );
            this.currentNote.set(note);
            this.messageService.add({
              severity: 'success',
              summary: 'Nota de voz actualizada',
              detail: 'Cambios guardados correctamente.',
            });
            this.closeVoiceConfirmModal();
          },
          error: (err: unknown) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail:
                (err as { error?: { message?: string } })?.error?.message ??
                'No se pudo guardar',
            });
          },
        })
        .add(() => this.saving.set(false));
    } else {
      this.agendaApi
        .create({
          type: 'voice',
          content: content || 'Nota de voz',
          status: 'pendiente',
          dueAt: dueAtIso ?? undefined,
        })
        .pipe(
          switchMap((note) => {
            if (voiceFile) {
              return from(this.uploadVoiceFileToNote(note._id, voiceFile)).pipe(
                switchMap(() => this.agendaApi.getById(note._id)),
              );
            }
            return of(note);
          }),
          switchMap((note) => {
            const userIds: string[] = [];
            const externalContacts: { name: string; email: string; phone?: string }[] = [];
            if (assigneeId && !assigneeId.startsWith('ext_')) userIds.push(assigneeId);
            if (assigneeId?.startsWith('ext_')) {
              const contactId = assigneeId.split('_')[1];
              const contact = this.globalContacts().find((c) => c._id === contactId);
              if (contact) {
                externalContacts.push({
                  name: contact.name,
                  email: contact.email ?? '',
                  phone: contact.phone,
                });
              }
            }
            if (pendingContact) {
              externalContacts.push({
                name: pendingContact.name,
                email: pendingContact.email ?? '',
                phone: pendingContact.phone,
              });
            }
            if (userIds.length > 0 || externalContacts.length > 0) {
              return this.agendaApi.assign(note._id, {
                userIds,
                dueAt: dueAtIso,
                externalContacts: externalContacts.length > 0 ? externalContacts : undefined,
              });
            }
            return of(note);
          }),
        )
        .subscribe({
          next: (note) => {
            this.notes.update((prev) => [note, ...prev]);
            this.messageService.add({
              severity: 'success',
              summary: 'Nota de voz creada',
              detail: 'La actividad se creó correctamente.',
            });
            this.closeVoiceConfirmModal();
          },
          error: (err: unknown) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail:
                (err as { error?: { message?: string } })?.error?.message ??
                'No se pudo crear la actividad',
            });
          },
        })
        .add(() => this.saving.set(false));
    }
  }

  private async uploadVoiceFileToNote(noteId: string, voiceFile: File): Promise<void> {
    try {
      const res: PresignedUrlResponse = await firstValueFrom(
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

  /** Breakpoint 768px (Tailwind md): debajo = mobile, arriba = desktop. */
  isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  }

  /** Abre el modal de detalle con la nota indicada. */
  openDetailModal(note: AgendaNote): void {
    this.currentNote.set(note);
    this.detailEditContent.set(this.getContentSummary(note));
    const due = this.getDueDate(note);
    this.detailEditDueAt.set(due ? new Date(due) : null);
    this.detailEditStatus.set(note.status ?? 'pendiente');
    this.detailEditMode.set(false);
    this.showDetailDialog.set(true);
  }

  viewNote(note: AgendaNote): void {
    const noteAny = note as { isMicrosoftEvent?: boolean; onlineMeetingUrl?: string; webLink?: string };
    if (noteAny.isMicrosoftEvent && (noteAny.onlineMeetingUrl || noteAny.webLink)) {
      window.open(noteAny.onlineMeetingUrl || noteAny.webLink!, '_blank');
      return;
    }

    if (!this.isMobile() && this.canEditFull(note)) {
      this.startInlineEdit(note);
      return;
    }
    this.openDetailModal(note);
  }

  startInlineEdit(note: AgendaNote): void {
    this.inlineEditingId.set(note._id);
    this.inlineEditingNote.set(note);
    this.inlineEditContent.set(this.getContentSummary(note));
    const due = this.getDueDate(note);
    this.inlineEditDueAt.set(due ? new Date(due) : null);
    this.inlineEditStatus.set(note.status ?? 'pendiente');
  }

  cancelInlineEdit(): void {
    this.inlineEditingId.set(null);
    this.inlineEditingNote.set(null);
    this.inlineEditContent.set('');
    this.inlineEditDueAt.set(null);
    this.inlineEditStatus.set('pendiente');
  }

  onInlineStatusChange(note: AgendaNote, value: AgendaNoteStatus): void {
    this.inlineEditStatus.set(value);
    this.saveInlineEdit(note);
  }

  onInlineDateChange(note: AgendaNote, value: Date | null): void {
    this.inlineEditDueAt.set(value);
    this.saveInlineEdit(note);
  }

  saveInlineEdit(note: AgendaNote): void {
    if (this.inlineEditingId() !== note._id) return; // evitar doble guardado
    const content = this.inlineEditContent().trim();
    const dueAt = this.inlineEditDueAt()?.toISOString();
    const status = this.inlineEditStatus();

    this.saving.set(true);
    this.agendaApi
      .update(note._id, { content, dueAt: dueAt ?? undefined, status })
      .subscribe({
        next: (updated) => {
          this.notes.update((list) => list.map((n) => (n._id === updated._id ? updated : n)));
          this.messageService.add({
            severity: 'success',
            summary: 'Guardado',
            detail: 'Cambio guardado correctamente',
          });
          this.cancelInlineEdit();
        },
        error: (err: unknown) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              (err as { error?: { message?: string } })?.error?.message ?? 'No se pudo guardar',
          });
        },
      })
      .add(() => this.saving.set(false));
  }

  /** Pasar a modo edición en el detalle. */
  enterDetailEditMode(): void {
    const note = this.currentNote();
    if (!note) return;
    this.detailEditMode.set(true);
    if (note.type === 'drawing' && note.drawingUrl?.length) {
      setTimeout(() => this.loadDetailDrawingImage(), 200);
    }
  }

  exitDetailEditMode(): void {
    this.detailEditMode.set(false);
  }

  /** Carga la imagen actual del dibujo en el canvas del detalle para poder editarla. */
  loadDetailDrawingImage(): void {
    const note = this.currentNote();
    if (!note) return;
    const canvas = this.detailCanvasRef?.nativeElement;
    if (!note.drawingUrl?.length || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = (note as AgendaNote).drawingUrl![0];
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
    if (!note) return;
    const canvas = this.detailCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (note.drawingUrl?.length) {
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
      error: (err: unknown) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: (err as { error?: { message?: string } })?.error?.message ?? 'No se pudo guardar',
        });
      },
    });
  }

  saveDetailDueAt(note: AgendaNote): void {
    const dueAt = this.detailEditDueAt();
    const dueAtIso = dueAt ? dueAt.toISOString() : undefined;
    this.agendaApi.update(note._id, { dueAt: dueAtIso ?? undefined }).subscribe({
      next: (updated) => {
        this.currentNote.set(updated);
        this.notes.update((list) => list.map((n) => (n._id === updated._id ? updated : n)));
        this.messageService.add({
          severity: 'success',
          summary: 'Guardado',
          detail: 'Vencimiento actualizado',
        });
      },
      error: (err: unknown) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: (err as { error?: { message?: string } })?.error?.message ?? 'No se pudo guardar',
        });
      },
    });
  }

  getStatusSeverity(status: AgendaNoteStatus | undefined): 'secondary' | 'info' | 'success' {
    if (status === 'terminado') return 'success';
    if (status === 'en_proceso') return 'info';
    return 'secondary';
  }

  getNoteVoiceUrls(note: AgendaNote): string[] | undefined {
    return note.voiceUrl;
  }

  getNoteDrawingUrls(note: AgendaNote): string[] | undefined {
    return note.drawingUrl;
  }

  startRerecordVoice(note: AgendaNote): void {
    this.editingNoteId.set(note._id);
    this.editingNoteVoiceUrls.set(note.voiceUrl ?? []);
    this.noteContent.set(note.content ?? '');
    this.showDetailDialog.set(false);
    this.showVoiceRerecordDialog.set(true);
    setTimeout(() => this.startRecording(), 300);
  }

  /** Abre el flujo para grabar una nueva nota de voz (crear desde cero). */
  openRecordForNewVoice(): void {
    this.editingNoteId.set(null);
    this.editingNoteVoiceUrls.set([]);
    this.noteContent.set('');
    this.pendingVoiceFile.set(null);
    this.createAssignUserId.set(null);
    this.createDueAt.set(null);
    this.pendingContactAssignment.set(null);
    this.showCreateDialog.set(false);
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

  /** Sube el dibujo del canvas (solo AgendaNote tipo drawing). */
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
        ).then((res: PresignedUrlResponse) =>
          this.agendaApi
            .uploadFileToS3(res.presignedUrl, file, file.type)
            .then(() => firstValueFrom(this.agendaApi.confirmDrawingUpload(noteId, res.publicUrl)))
            .then(() =>
              Promise.all(
                oldUrls.map((url: string) =>
                  firstValueFrom(this.agendaApi.removeDrawing(noteId, url)),
                ),
              ).catch(() => undefined),
            )
            .then(() => firstValueFrom(this.agendaApi.getById(noteId))),
        );
      })
      .then(() => undefined);
  }

  /** Guardar todo en modo edición del detalle. */
  saveDetailAll(note: AgendaNote): void {
    this.saving.set(true);
    const content = this.detailEditContent().trim();
    const dueAt = this.detailEditDueAt();
    const dueAtIso = dueAt ? dueAt.toISOString() : undefined;
    const status = this.detailEditStatus();

    this.agendaApi
      .update(note._id, {
        content,
        dueAt: dueAtIso ?? undefined,
        status,
      })
      .subscribe({
        next: (updated) => {
          this.currentNote.set(updated);
          this.notes.update((list) => list.map((n) => (n._id === updated._id ? updated : n)));
          this.detailEditMode.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Guardado',
            detail: 'Cambios guardados correctamente',
          });
        },
        error: (err: unknown) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: (err as { error?: { message?: string } })?.error?.message ?? 'No se pudo guardar',
          });
        },
      })
      .add(() => this.saving.set(false));
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
            this.loadAllNotesForCounts();
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
          error: (err: unknown) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail:
                (err as { error?: { message?: string } })?.error?.message ??
                'No se pudo eliminar',
            });
          },
        });
      },
    });
  }

  getTypeLabel(_type?: string): string {
    return 'Actividad';
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

  /** Genera las acciones disponibles para una tarea/nota en el menú contextual. */
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
        items: this.statusOptions.map((opt) => ({
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

  /** Abre el modal de acciones (asignar, compartir, editar, eliminar). En desktop el clic en la fila no abre modal. */
  openActions(note: AgendaNote): void {
    this.openDetailModal(note);
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
      this.usersApi.getById(user.id).subscribe((u) => {
        // agendaSharedWith puede ser string[] o objeto[], normalizar siempre a IDs
        const shared = (u as any).agendaSharedWith || [];
        const ids = shared
          .map((s: any) => {
            if (typeof s === 'string') return s;
            return s._id || s.id;
          })
          .filter((id: string) => !!id);
        this.mySharedWith.set(ids);
      });
    }
  }

  closeShareModal(): void {
    this.showShareModal.set(false);
  }

  loadSharingData(): void {
    this.areasApi.listWithUsers().subscribe((areas) => {
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
      this.mySharedWith.set(current.filter((id) => id !== userId));
    } else {
      this.mySharedWith.set([...current, userId]);
    }
    console.log('Usuarios compartidos actualizados:', this.mySharedWith());
  }

  saveSharing(): void {
    const user = this.authService.getCurrentUser();
    if (!user || !user.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se detectó el usuario actual',
      });
      return;
    }

    const payload = { agendaSharedWith: this.mySharedWith() };
    console.log('Guardando preferencias de compartir:', payload);

    this.saving.set(true);
    this.profileApi.updateProfile(payload).subscribe({
      next: (res) => {
        console.log('Respuesta de guardado (perfil):', res);
        this.messageService.add({
          severity: 'success',
          summary: 'Guardado',
          detail: 'Preferencias de compartir guardadas',
        });
        this.closeShareModal();
        this.saving.set(false);
      },
      error: (err: unknown) => {
        console.error('Error al guardar preferencias:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar',
        });
        this.saving.set(false);
      },
    });
  }

  /** Carga la lista de usuarios que compartieron conmigo para el filtro. */
  loadSharedWithMe(): void {
    this.usersApi.getSharedWithMe().subscribe((users) => {
      const options = users.map((u) => ({
        _id: u.id || u._id,
        name: u.name,
        email: u.email,
        role: u.role,
      }));
      this.sharedWithMe.set(options);
    });
  }

  // --- External Contacts Logic ---
  showCreateContactDialog = signal(false);
  newContactName = signal('');
  newContactEmail = signal('');
  newContactPhone = signal('');
  creatingContact = signal(false);

  openCreateContactDialog(): void {
    this.newContactName.set('');
    this.newContactEmail.set('');
    this.newContactPhone.set('');
    this.showCreateContactDialog.set(true);
  }

  /** Abre el diálogo de crear contacto desde el modal de detalle (usa currentNote). */
  openCreateContactDialogFromDetail(): void {
    this.selectedActionNote.set(this.currentNote());
    this.openCreateContactDialog();
  }

  closeCreateContactDialog(): void {
    this.showCreateContactDialog.set(false);
  }

  saveNewContact(): void {
    if (!this.newContactName() || !this.newContactEmail()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Nombre y Email requeridos',
      });
      return;
    }

    this.creatingContact.set(true);
    const payload = {
      name: this.newContactName(),
      email: this.newContactEmail(),
      phone: this.newContactPhone(),
    };

    // 1. Save to global contacts first
    this.contactsService
      .create(payload)
      .pipe(
        switchMap((contact: Contact) => {
          this.loadGlobalContacts(); // Reload options
          const note = this.selectedActionNote() ?? this.currentNote();
          if (note) {
            const ext = { name: contact.name, email: contact.email || '', phone: contact.phone };
            return this.agendaApi.assign(note._id, {
              userIds: [],
              externalContacts: [ext],
            });
          }
          return of(null);
        }),
        finalize(() => this.creatingContact.set(false)),
      )
      .subscribe({
        next: (updated: AgendaNote | null) => {
          if (updated) {
            this.currentNote.set(updated);
            this.notes.update((list) => list.map((n) => (n._id === updated._id ? updated : n)));
            if (this.selectedActionNote()?._id === updated._id) {
              this.selectedActionNote.set(updated);
            }
          }
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Contacto guardado y asignado',
          });
          this.closeCreateContactDialog();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo procesar el contacto',
          });
        },
      });
  }

  getAssignedExternal(note: AgendaNote): AgendaNoteExternal[] {
    return note.assignedExternal ?? [];
  }

  // Helper to remove an external contact
  removeExternalContact(note: AgendaNote, email: string): void {
    const currentExternal = note.assignedExternal ?? [];
    const newExternal = currentExternal.filter((c: AgendaNoteExternal) => c.email !== email);
    const currentUserIds = (note.assignedTo ?? []).map((u: AgendaNoteUser | string) =>
      typeof u === 'string' ? u : u._id,
    );

    this.agendaApi
      .assign(note._id, {
        userIds: currentUserIds,
        externalContacts: newExternal,
      })
      .subscribe({
        next: (updated: AgendaNote) => {
          this.currentNote.set(updated);
            this.notes.update((list) => list.map((n) => (n._id === updated._id ? updated : n)));
            if (this.selectedActionNote()?._id === updated._id) {
              this.selectedActionNote.set(updated);
            }
          this.messageService.add({
            severity: 'success',
            summary: 'Actualizado',
            detail: 'Contacto desasignado',
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo eliminar',
          });
        },
      });
  }

  // Helper for native sharing with external contact
  shareNativeExternal(
    contact: { name: string; email: string; phone?: string },
    note: AgendaNote,
  ): void {
    const text = `Hola ${contact.name}, te comparto esta actividad: ${note.content}`;
    if (navigator.share) {
      navigator
        .share({
          title: 'Actividad Compartida',
          text: text,
        })
        .catch((err: unknown) => console.error('Error sharing:', err));
    } else {
      // Fallback: Copy to clipboard? Or maybe mailto?
      window.open(
        `mailto:${contact.email}?subject=Actividad Compartida&body=${encodeURIComponent(text)}`,
        '_blank',
      );
    }
  }

  shareWhatsappExternal(
    contact: { name: string; email: string; phone?: string },
    note: AgendaNote,
  ): void {
    if (!contact.phone) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin teléfono',
        detail: 'El contacto no tiene teléfono registrado',
      });
      return;
    }
    const text = `Hola ${contact.name}, te comparto esta actividad: ${note.content}`;
    // Basic cleanup for phone number
    const phone = contact.phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  }

  shareEmailExternal(
    contact: { name: string; email: string; phone?: string },
    note: AgendaNote,
  ): void {
    if (!contact.email) return;
    const text = `Hola ${contact.name}, te comparto esta actividad:\n\n${note.content || '(Sin contenido)'}\n\nVencimiento: ${note.dueAt ? new Date(note.dueAt).toLocaleString() : 'Sin fecha'}`;
    window.open(
      `mailto:${contact.email}?subject=Actividad Compartida - Tecmeing&body=${encodeURIComponent(text)}`,
      '_blank',
    );
  }

}
