import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Board } from '../../../../shared/interfaces/board.interface';
import { NativeKanbanBoardComponent } from '../native-kanban-board/native-kanban-board';
import { NativeTaskStatsComponent } from '../native-task-stats/native-task-stats';
import { Task, DragDropEvent } from '../../../../shared/interfaces/task.interface';

/**
 * Componente de vista de tablero con sus tareas
 * Principio de Responsabilidad Única: Solo renderiza la vista del tablero con tareas
 */
@Component({
  selector: 'app-board-view',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    TagModule,
    TooltipModule,
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

  get pendingInvitations(): number {
    return this.board.invitations.filter((inv) => inv.status === 'pending').length;
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
