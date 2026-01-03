import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { MultiSelectModule } from 'primeng/multiselect';
import { MessageService, ConfirmationService } from 'primeng/api';
import { MeetingsApiService } from '../../shared/services/meetings-api.service';
import { MenuService } from '../../shared/services/menu.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import {
  Meeting,
  CreateMeetingRequest,
  UpdateMeetingRequest,
  MeetingStatsResponse,
  MeetingQueryParams,
  AttendeeUser,
} from '../../shared/interfaces/meeting.interface';

/**
 * Componente de Gestión de Reuniones
 * Implementa principios SOLID:
 * - Single Responsibility: Solo gestiona la interfaz de usuario para reuniones
 * - Open/Closed: Extensible sin modificar código existente
 * - Dependency Inversion: Depende de abstracciones (servicios inyectados)
 */
@Component({
  selector: 'app-meetings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    DatePickerModule,
    TextareaModule,
    CardModule,
    TagModule,
    MultiSelectModule,
  ],
  templateUrl: './meetings.html',
  styleUrl: './meetings.scss',
  providers: [MessageService, ConfirmationService],
})
export class MeetingsPage implements OnInit {
  // Inyección de dependencias siguiendo Dependency Inversion Principle
  private readonly meetingsApi = inject(MeetingsApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly menuService = inject(MenuService);
  private readonly usersApi = inject(UsersApiService);

  // Verificar permisos de edición
  readonly canEdit = computed(() => this.menuService.canEdit('/meetings'));

  // Signals para gestión reactiva de estado
  items = signal<Meeting[]>([]);
  stats = signal<MeetingStatsResponse | null>(null);
  query = signal('');
  startDate = signal<Date | null>(null);
  endDate = signal<Date | null>(null);
  showDialog = signal(false);
  showViewDialog = signal(false);
  showStatsDialog = signal(false);
  editing = signal<Meeting | null>(null);
  viewing = signal<Meeting | null>(null);
  loading = signal(false);
  loadingStats = signal(false);

  // Usuarios disponibles para selección
  availableUsers = signal<{ label: string; value: string }[]>([]);
  loadingUsers = signal(false);

  // Estado de expansión para vista móvil
  private expandedRowKeys = signal<Set<string>>(new Set());

  // Filtrado y ordenamiento
  filteredItems = computed(() => {
    const searchQuery = this.query().toLowerCase().trim();
    const list = this.items().slice();

    // Ordenar por fecha de reunión descendente
    list.sort((a, b) => {
      const aDate = new Date(a.meetingDate).getTime();
      const bDate = new Date(b.meetingDate).getTime();
      return bDate - aDate; // DESC
    });

    if (!searchQuery) return list;

    return list.filter((item) => {
      const titleMatch = item.title?.toLowerCase().includes(searchQuery) ?? false;
      const agreementsMatch = item.agreements?.toLowerCase().includes(searchQuery) ?? false;
      const attendeesMatch =
        item.attendees?.some((a) => {
          if (typeof a === 'string') {
            return a.toLowerCase().includes(searchQuery);
          }
          // Si es un objeto usuario populado
          return (
            (a.name?.toLowerCase().includes(searchQuery) ||
              a.email?.toLowerCase().includes(searchQuery)) ??
            false
          );
        }) ?? false;
      return titleMatch || agreementsMatch || attendeesMatch;
    });
  });

  ngOnInit() {
    this.load();
    this.loadUsers();
  }

  /**
   * Carga la lista de usuarios disponibles
   */
  loadUsers() {
    this.loadingUsers.set(true);
    this.usersApi.list().subscribe({
      next: (users) => {
        this.availableUsers.set(
          users.map((user) => ({
            label: user.name,
            value: user._id,
          }))
        );
        this.loadingUsers.set(false);
      },
      error: (err) => {
        console.error('Error al cargar usuarios:', err);
        this.loadingUsers.set(false);
      },
    });
  }

  /**
   * Carga la lista de reuniones desde el servidor
   */
  load() {
    this.loading.set(true);

    const params: MeetingQueryParams = {
      sortBy: 'meetingDate',
      sortOrder: 'desc',
    };
    if (this.query()) params.q = this.query();
    if (this.startDate()) params.startDate = this.formatDateForAPI(this.startDate()!);
    if (this.endDate()) params.endDate = this.formatDateForAPI(this.endDate()!);

    this.meetingsApi.list(params).subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.toastError('Error al cargar reuniones');
        console.error(err);
        this.loading.set(false);
      },
    });
  }

  /**
   * Carga las estadísticas de reuniones
   */
  loadStats() {
    this.loadingStats.set(true);
    this.showStatsDialog.set(true);

    const startDate = this.startDate() ? this.formatDateForAPI(this.startDate()!) : undefined;
    const endDate = this.endDate() ? this.formatDateForAPI(this.endDate()!) : undefined;

    this.meetingsApi.getStats(startDate, endDate).subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loadingStats.set(false);
      },
      error: (err) => {
        this.toastError('Error al cargar estadísticas');
        console.error(err);
        this.loadingStats.set(false);
      },
    });
  }

  /**
   * Helpers para gestión de expansión en vista móvil
   */
  buildRowKey(item: Meeting, index: number): string {
    return item._id ? String(item._id) : `${item.title}#${index}`;
  }

  isRowExpandedByKey(key: string): boolean {
    return this.expandedRowKeys().has(key);
  }

  toggleRowByKey(key: string): void {
    const set = new Set(this.expandedRowKeys());
    if (set.has(key)) set.delete(key);
    else set.add(key);
    this.expandedRowKeys.set(set);
  }

  /**
   * Establece el término de búsqueda y recarga la lista
   */
  setQuery(value: string) {
    this.query.set(value);
    this.load();
  }

  /**
   * Aplica filtros de fecha y recarga
   */
  applyDateFilter() {
    this.load();
  }

  /**
   * Limpia los filtros de fecha
   */
  clearDateFilter() {
    this.startDate.set(null);
    this.endDate.set(null);
    this.load();
  }

  /**
   * Abre el diálogo para crear una nueva reunión
   */
  newItem() {
    this.editing.set({
      title: '',
      meetingDate: new Date(),
      videoLinks: [],
      agreements: '',
      attendees: [],
      description: '',
    });
    this.showDialog.set(true);
  }

  /**
   * Abre el diálogo para editar una reunión existente
   */
  editItem(item: Meeting) {
    const editedItem = { ...item };
    // Convertir la fecha a objeto Date si es string
    if (typeof editedItem.meetingDate === 'string') {
      editedItem.meetingDate = new Date(editedItem.meetingDate);
    }
    // Convertir asistentes a array de IDs si vienen populados
    if (editedItem.attendees && editedItem.attendees.length > 0) {
      editedItem.attendees = this.getAttendeeIds(editedItem.attendees);
    }
    this.editing.set(editedItem);
    this.showDialog.set(true);
  }

  /**
   * Cierra el diálogo de creación/edición
   */
  closeDialog() {
    this.showDialog.set(false);
    this.editing.set(null);
  }

  /**
   * Abre el diálogo de visualización de detalles
   */
  viewItem(item: Meeting) {
    this.viewing.set(item);
    this.showViewDialog.set(true);
  }

  /**
   * Cierra el diálogo de visualización
   */
  closeViewDialog() {
    this.showViewDialog.set(false);
    this.viewing.set(null);
  }

  /**
   * Cierra el diálogo de estadísticas
   */
  closeStatsDialog() {
    this.showStatsDialog.set(false);
    this.stats.set(null);
  }

  /**
   * Obtiene los IDs de los asistentes (maneja tanto string[] como AttendeeUser[])
   */
  getAttendeeIds(attendees?: string[] | AttendeeUser[]): string[] {
    if (!attendees || attendees.length === 0) return [];
    // Si es un array de strings (IDs), retornarlo directamente
    if (typeof attendees[0] === 'string') {
      return attendees as string[];
    }
    // Si es un array de objetos (usuarios populados), extraer los IDs
    return (attendees as AttendeeUser[]).map((attendee) => attendee._id || String(attendee));
  }

  /**
   * Actualiza un campo del item en edición
   */
  onEditChange(field: keyof Meeting, value: Meeting[keyof Meeting]) {
    const current = this.editing();
    if (current) {
      this.editing.set({ ...current, [field]: value });
    }
  }

  /**
   * Agrega un item a videoLinks cuando se presiona Enter
   */
  addToArray(field: 'videoLinks', value: string, event?: Event) {
    if (event && event instanceof KeyboardEvent) {
      event.preventDefault();
    }
    const trimmed = value.trim();
    if (!trimmed) return;

    const current = this.editing();
    if (!current) return;

    const array = (current[field] || []) as string[];
    if (!array.includes(trimmed)) {
      this.editing.set({ ...current, [field]: [...array, trimmed] });
    }
  }

  /**
   * Elimina un item de videoLinks
   */
  removeFromArray(field: 'videoLinks', index: number) {
    const current = this.editing();
    if (!current) return;

    const array = (current[field] || []) as string[];
    const newArray = array.filter((_, i) => i !== index);
    this.editing.set({ ...current, [field]: newArray });
  }

  /**
   * Guarda la reunión (crear o actualizar)
   */
  save() {
    const item = this.editing();
    if (!item) return;

    const errors = this.validateForm(item);
    if (errors.length) {
      errors.forEach((e) => this.toastError(e));
      return;
    }

    this.loading.set(true);

    if (item._id) {
      // Actualizar
      const updateData: UpdateMeetingRequest = {
        meetingDate: this.formatDateForAPI(item.meetingDate),
        title: item.title.trim(),
        videoLinks: item.videoLinks?.filter((l) => l && l.trim() !== ''),
        agreements: item.agreements?.trim() || undefined,
        attendees: this.getAttendeeIds(item.attendees),
        description: item.description?.trim() || undefined,
      };

      this.meetingsApi.update(item._id, updateData).subscribe({
        next: () => {
          this.toastSuccess('Reunión actualizada exitosamente');
          this.loading.set(false);
          this.closeDialog();
          this.load();
        },
        error: (err) => {
          const message = err.error?.message || 'Error al actualizar la reunión';
          this.toastError(message);
          this.loading.set(false);
        },
      });
    } else {
      // Crear
      const createData: CreateMeetingRequest = {
        meetingDate: this.formatDateForAPI(item.meetingDate),
        title: item.title.trim(),
        videoLinks: item.videoLinks?.filter((l) => l && l.trim() !== ''),
        agreements: item.agreements?.trim() || undefined,
        attendees: this.getAttendeeIds(item.attendees),
        description: item.description?.trim() || undefined,
      };

      this.meetingsApi.create(createData).subscribe({
        next: () => {
          this.toastSuccess('Reunión creada exitosamente');
          this.loading.set(false);
          this.closeDialog();
          this.load();
        },
        error: (err) => {
          const message = err.error?.message || 'Error al crear la reunión';
          this.toastError(message);
          this.loading.set(false);
        },
      });
    }
  }

  /**
   * Elimina una reunión
   */
  remove(item: Meeting) {
    if (!item._id) return;

    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar la reunión "${item.title}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.loading.set(true);
        this.meetingsApi.delete(item._id!).subscribe({
          next: () => {
            this.toastSuccess('Reunión eliminada exitosamente');
            this.load();
          },
          error: (err) => {
            const message = err.error?.message || 'Error al eliminar la reunión';
            this.toastError(message);
            this.loading.set(false);
          },
        });
      },
    });
  }

  /**
   * Valida el formulario de reunión
   */
  validateForm(item: Meeting): string[] {
    const errors: string[] = [];

    if (!item.title || item.title.trim().length < 3) {
      errors.push('El título debe tener al menos 3 caracteres');
    }

    if (!item.meetingDate) {
      errors.push('La fecha de reunión es obligatoria');
    }

    // Validar que la fecha no sea en el pasado (opcional)
    // const meetingDate = new Date(item.meetingDate)
    // const today = new Date()
    // today.setHours(0, 0, 0, 0)
    // if (meetingDate < today) {
    //   errors.push('La fecha de reunión no puede ser en el pasado')
    // }

    return errors;
  }

  /**
   * Formatea una fecha para enviarla al API
   */
  formatDateForAPI(date: Date | string): string {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date.toISOString();
  }

  /**
   * Formatea una fecha para mostrarla en la interfaz
   */
  formatDate(date: string | Date): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Formatea solo la fecha (sin hora)
   */
  formatDateOnly(date: string | Date): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  /**
   * Abre un link en una nueva ventana
   */
  openLink(url: string) {
    window.open(url, '_blank');
  }

  /**
   * Obtiene el número de asistentes
   */
  getAttendeesCount(meeting: Meeting): number {
    return meeting.attendees?.length || 0;
  }

  /**
   * Obtiene el nombre de un asistente (maneja tanto string como objeto usuario)
   */
  getAttendeeName(attendee: string | AttendeeUser): string {
    if (typeof attendee === 'string') {
      // Si es un ID, buscar el nombre en la lista de usuarios disponibles
      const user = this.availableUsers().find((u) => u.value === attendee);
      return user?.label || attendee;
    }
    // Si es un objeto usuario populado
    return attendee.name || attendee.email || 'Usuario desconocido';
  }

  /**
   * Obtiene el número de videos
   */
  getVideosCount(meeting: Meeting): number {
    return meeting.videoLinks?.length || 0;
  }

  /**
   * Verifica si tiene acuerdos
   */
  hasAgreements(meeting: Meeting): boolean {
    return Boolean(meeting.agreements && meeting.agreements.trim() !== '');
  }

  /**
   * Muestra un mensaje de éxito
   */
  toastSuccess(message: string) {
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: message,
    });
  }

  /**
   * Muestra un mensaje de error
   */
  toastError(message: string) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
    });
  }
}
