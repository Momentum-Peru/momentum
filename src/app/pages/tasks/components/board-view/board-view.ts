import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
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
import { Board } from '../../../../shared/interfaces/board.interface';
import { NativeKanbanBoardComponent } from '../native-kanban-board/native-kanban-board';
import { NativeTaskStatsComponent } from '../native-task-stats/native-task-stats';
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
    NativeKanbanBoardComponent,
    NativeTaskStatsComponent,
  ],
  templateUrl: './board-view.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardViewComponent {
  @Input({ required: true }) board!: Board;
  @Input() isOwner = false;
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
  @Output() filtersChanged = new EventEmitter<TasksSearchParams>();

  // Filtros
  public readonly showFilters = signal<boolean>(false);
  public readonly filterAssignedTo = signal<string | undefined>(undefined);
  public readonly filterDateFrom = signal<Date | undefined>(undefined);
  public readonly filterDateTo = signal<Date | undefined>(undefined);
  public readonly filterTags = signal<string[]>([]);

  // Opciones para filtros
  @Input() availableUsers: { label: string; value: string }[] = [];
  @Input() availableTags: string[] = [];

  /**
   * Opciones de etiquetas para el multiSelect
   */
  public get tagOptions(): { label: string; value: string }[] {
    return this.availableTags.map((tag) => ({ label: tag, value: tag }));
  }

  get pendingInvitations(): number {
    return this.board.invitations.filter((inv) => inv.status === 'pending').length;
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

    if (this.filterAssignedTo()) {
      filters.assignedTo = this.filterAssignedTo();
    }

    if (this.filterDateFrom() || this.filterDateTo()) {
      if (this.filterDateFrom()) {
        filters.dueDateFrom = this.filterDateFrom()!.toISOString();
      }
      if (this.filterDateTo()) {
        // Establecer la hora al final del día
        const dateTo = new Date(this.filterDateTo()!);
        dateTo.setHours(23, 59, 59, 999);
        filters.dueDateTo = dateTo.toISOString();
      }
    }

    if (this.filterTags().length > 0) {
      filters.tags = this.filterTags();
    }

    this.filtersChanged.emit(filters);
  }

  /**
   * Limpia los filtros
   */
  public clearFilters(): void {
    this.filterAssignedTo.set(undefined);
    this.filterDateFrom.set(undefined);
    this.filterDateTo.set(undefined);
    this.filterTags.set([]);
    this.applyFilters();
  }

  /**
   * Verifica si hay filtros activos
   */
  public hasActiveFilters(): boolean {
    return !!(
      this.filterAssignedTo() ||
      this.filterDateFrom() ||
      this.filterDateTo() ||
      this.filterTags().length > 0
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
}
