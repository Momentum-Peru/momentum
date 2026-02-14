import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { DialogModule } from 'primeng/dialog';
import { AgendaActivityComponent } from '../agenda-activity/agenda-activity';
import { User } from '../../../../shared/services/users-api.service';
import { Board } from '../../../../shared/interfaces/board.interface';
import { Area } from '../../../../shared/interfaces/area.interface'; // Added
import {
  Task,
  DragDropEvent,
  TasksSearchParams,
} from '../../../../shared/interfaces/task.interface';

/**
 * Componente de vista de tablero con sus tareas
 * Principio de Responsabilidad Única: Solo renderiza la vista del tablero con tareas
 */
@Component({
  selector: 'app-board-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    TagModule,
    TooltipModule,
    SelectModule,
    DatePickerModule,
    MultiSelectModule,
    DialogModule,
    AgendaActivityComponent,
  ],
  templateUrl: './board-view.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardViewComponent implements OnInit {
  @Input({ required: true }) board!: Board;
  @Input() isOwner = false;
  @Input() currentUser: User | null = null;
  @Input() tasksByStatus: { pending: Task[]; inProgress: Task[]; completed: Task[] } = {
    pending: [],
    inProgress: [],
    completed: [],
  };
  @Input() taskStats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  } = {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
    };
  @Input() loading = false;

  @Output() back = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();
  @Output() invite = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();
  @Output() taskStatusChanged = new EventEmitter<DragDropEvent>();
  @Output() editTask = new EventEmitter<Task>();
  @Output() deleteTask = new EventEmitter<Task>();
  @Output() viewTask = new EventEmitter<Task>();
  @Output() createTask = new EventEmitter<void>();
  @Output() quickCreateTask = new EventEmitter<{
    title: string;
    assignedTo: string;
    dueDate?: Date;
    areaId?: string;
  }>();
  @Output() filtersChanged = new EventEmitter<TasksSearchParams>();

  // Modo de vista
  public readonly viewMode = signal<'kanban' | 'list'>('list');
  public readonly showMembersDialog = signal(false);

  // All Tasks Computed for Agenda View
  public get allTasks(): Task[] {
    return [
      ...this.tasksByStatus.pending,
      ...this.tasksByStatus.inProgress,
      ...this.tasksByStatus.completed,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Board Users Computed for Agenda View
  public get boardUsers(): User[] {
    // Si hay usuarios disponibles desde el padre, usarlos (para "Agenda")
    if (this.availableUsersObjects && this.availableUsersObjects.length > 0) {
      return this.availableUsersObjects;
    }

    // Fallback: extraer del board (para boards normales)
    const owner = this.board.owner;
    const members = this.board.members || [];
    const users = owner ? [owner, ...members] : [...members];

    // Filter duplicates and map to User
    const uniqueMap = new Map();

    users.forEach((u: any) => {
      if (!u) return;

      // Determine ID
      let userId: string | undefined;
      let userData: any = u;

      if (typeof u === 'string') {
        userId = u;
        // If it's just a string ID, we can't really get name/email unless we look it up
        // But we'll create a placeholder
        userData = { _id: u, id: u };
      } else if (typeof u === 'object') {
        userId = u._id || u.id;
      }

      if (userId) {
        uniqueMap.set(userId, {
          _id: userId,
          id: userId,
          name: userData.name || userData.email || 'Sin nombre',
          email: userData.email || '',
          role: userData.role || 'user',
          profilePicture: userData.profilePicture,
        } as unknown as User);
      }
    });

    return Array.from(uniqueMap.values());
  }



  // Filtros
  public readonly showFilters = signal<boolean>(true);
  public readonly filterAssignedTo = signal<string | undefined>(undefined);
  public readonly filterDate = signal<Date | undefined>(new Date());
  public readonly filterTags = signal<string[]>([]);
  public readonly filterArea = signal<string | undefined>(undefined); // Added filter

  // Opciones para filtros
  @Input() availableUsers: { label: string; value: string }[] = [];
  @Input() availableTags: string[] = [];
  @Input() availableAreas: Area[] = []; // Added input
  @Input() availableUsersObjects: User[] = []; // Added: User objects for agenda
  @Input() currentUserId = '';
  @Output() removeMember = new EventEmitter<{ board: Board; memberId: string }>();
  @Output() leaveBoard = new EventEmitter<Board>();

  /**
   * Opciones de etiquetas para el multiSelect
   */
  public get tagOptions(): { label: string; value: string }[] {
    return this.availableTags.map((tag) => ({ label: tag, value: tag }));
  }

  /**
   * Opciones de áreas para el select
   */
  public get areaOptions(): { label: string; value: string }[] {
    return this.availableAreas
      .map((area) => ({
        label: area.nombre || 'Sin nombre',
        value: area._id || '',
      }))
      .filter((opt) => opt.value !== '');
  }

  ngOnInit(): void {
    // Aplicar filtros al cargar para que, con fechas por defecto (hoy), se listen las tareas del día
    this.applyFilters();
  }

  /**
   * Cambia el modo de vista
   */
  public toggleViewMode(): void {
    this.viewMode.set(this.viewMode() === 'kanban' ? 'list' : 'kanban');
  }

  get pendingInvitations(): number {
    return (this.board.invitations || []).filter((inv) => inv.status === 'pending').length;
  }

  getPendingInvitations() {
    return (this.board.invitations || []).filter((inv) => inv.status === 'pending');
  }

  /**
   * Toggle la visibilidad de los filtros
   */
  public toggleFilters(): void {
    this.showFilters.update((value) => !value);
  }

  /**
   * Aplica los filtros
   */
  public applyFilters(): void {
    const filters: TasksSearchParams = {
      boardId: this.board._id,
    };

    // Normalizar y agregar filtro de asignado a
    const assignedTo = this.filterAssignedTo();
    if (assignedTo !== undefined && assignedTo !== null && assignedTo !== '') {
      // Asegurar que sea un string válido
      const assignedToValue = typeof assignedTo === 'string' ? assignedTo : String(assignedTo);
      if (assignedToValue.trim() !== '') {
        filters.assignedTo = assignedToValue;
      }
    }

    // Normalizar y agregar filtros de fecha
    const selectedDate = this.filterDate();

    if (selectedDate !== undefined && selectedDate !== null) {
      const dateObj = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
      if (!isNaN(dateObj.getTime())) {
        // Inicio del día (00:00:00)
        const dateFrom = new Date(dateObj);
        dateFrom.setHours(0, 0, 0, 0);
        filters.dueDateFrom = dateFrom.toISOString();

        // Fin del día (23:59:59)
        const dateTo = new Date(dateObj);
        dateTo.setHours(23, 59, 59, 999);
        filters.dueDateTo = dateTo.toISOString();
      }
    }

    // Normalizar y agregar filtro de etiquetas
    const tags = this.filterTags();
    if (tags && Array.isArray(tags) && tags.length > 0) {
      filters.tags = tags;
    }

    // Normalizar y agregar filtro de área
    const areaId = this.filterArea();
    if (areaId) {
      filters.areaId = areaId;
    }

    this.filtersChanged.emit(filters);
  }

  /**
   * Limpia los filtros
   */
  public clearFilters(): void {
    this.filterDate.set(new Date());
    this.filterArea.set(undefined);
    this.filterAssignedTo.set(undefined);
    this.filterTags.set([]);
    this.applyFilters();
  }

  /**
   * Normaliza el valor de asignado a cuando cambia
   */
  public onAssignedToChange(
    value: string | { value: string; label: string } | null | undefined,
  ): void {
    if (value === null || value === undefined || value === '') {
      this.filterAssignedTo.set(undefined);
    } else if (typeof value === 'object' && 'value' in value) {
      // Si PrimeNG devuelve el objeto completo, extraer el value
      const extractedValue = value.value;
      this.filterAssignedTo.set(
        extractedValue === null || extractedValue === undefined || extractedValue === ''
          ? undefined
          : extractedValue,
      );
    } else if (typeof value === 'string' && value.trim() !== '') {
      this.filterAssignedTo.set(value);
    } else {
      this.filterAssignedTo.set(undefined);
    }
    // Los signals son síncronos, así que podemos llamar applyFilters directamente
    this.applyFilters();
  }

  /**
   * Normaliza el valor de fecha cuando cambia
   */
  public onDateChange(value: Date | null | undefined | string): void {
    if (
      value === null ||
      value === undefined ||
      value === '' ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      this.filterDate.set(undefined);
    } else if (value instanceof Date) {
      if (!isNaN(value.getTime())) {
        this.filterDate.set(value);
      } else {
        this.filterDate.set(undefined);
      }
    } else {
      this.filterDate.set(undefined);
    }
    this.applyFilters();
  }

  /**
   * Normaliza el valor de etiquetas cuando cambia
   */
  public onTagsChange(value: string[] | null | undefined): void {
    // Asegurar que siempre sea un array, nunca null
    if (value === null || value === undefined) {
      this.filterTags.set([]);
    } else if (Array.isArray(value)) {
      this.filterTags.set(value);
    } else {
      this.filterTags.set([]);
    }
    // Los signals son síncronos, así que podemos llamar applyFilters directamente
    this.applyFilters();
  }

  /**
   * Normaliza el valor de área cuando cambia
   */
  public onAreaChange(value: string | { value: string; label: string } | null | undefined): void {
    if (value === null || value === undefined || value === '') {
      this.filterArea.set(undefined);
    } else if (typeof value === 'object' && 'value' in value) {
      const extractedValue = value.value;
      this.filterArea.set(
        extractedValue === null || extractedValue === undefined || extractedValue === ''
          ? undefined
          : extractedValue,
      );
    } else if (typeof value === 'string' && value.trim() !== '') {
      this.filterArea.set(value);
    } else {
      this.filterArea.set(undefined);
    }
    this.applyFilters();
  }

  /**
   * Verifica si hay filtros activos
   */
  public hasActiveFilters(): boolean {
    const hasDate = !!this.filterDate();
    const hasArea = !!this.filterArea();
    const hasAssignedTo = !!this.filterAssignedTo();
    const hasTags = this.filterTags().length > 0;

    const isDifferentDate = hasDate && !this.isToday(this.filterDate());

    return hasArea || hasAssignedTo || hasTags || isDifferentDate;
  }

  /**
   * Verifica si una fecha es hoy
   */
  private isToday(date: Date | undefined): boolean {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  onBack(event: Event): void {
    event.stopPropagation();
    this.back.emit();
  }

  onEdit(event: Event): void {
    event.stopPropagation();
    this.edit.emit();
  }

  onInvite(event: Event): void {
    event.stopPropagation();
    this.invite.emit();
  }

  onRefresh(event: Event): void {
    event.stopPropagation();
    this.refresh.emit();
  }

  onCreateTask(event: Event): void {
    event.stopPropagation();
    this.createTask.emit();
  }

  isCurrentUserMember(): boolean {
    if (!this.currentUserId) return false;
    return (this.board.members || []).some((member) => member._id === this.currentUserId);
  }

  /**
   * Verifica si el usuario actual es miembro del tablero (propietario o miembro)
   */
  isBoardMember(): boolean {
    if (!this.currentUserId) return false;
    // Verificar si es propietario
    if (this.isOwner || (this.board.owner && this.board.owner._id === this.currentUserId)) {
      return true;
    }
    // Verificar si es miembro
    return this.isCurrentUserMember();
  }

  isCurrentUser(memberId: string): boolean {
    return this.currentUserId === memberId;
  }

  onRemoveMember(memberId: string): void {
    this.removeMember.emit({ board: this.board, memberId });
  }

  onDeleteTask(task: Task): void {
    this.deleteTask.emit(task);
  }

  onStatusChanged(event: { task: Task; newStatus: string }): void {
    // Emitir evento de cambio de estado usando el formato DragDropEvent
    this.taskStatusChanged.emit({
      taskId: event.task._id,
      newStatus: event.newStatus as any,
      fromStatus: event.task.status,
    });
  }

  onLeaveBoard(): void {
    this.leaveBoard.emit(this.board);
  }
}
