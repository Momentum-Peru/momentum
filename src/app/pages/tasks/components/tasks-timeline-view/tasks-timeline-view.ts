import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../../../shared/interfaces/task.interface';

export type TimelineScale = 'day' | 'week' | 'month';

@Component({
  selector: 'app-tasks-timeline-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tasks-timeline-view.html',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class TasksTimelineViewComponent {
  @Input() set tasks(value: Task[]) {
    this.tasksInput.set(value || []);
  }
  @Output() viewTask = new EventEmitter<Task>();

  readonly tasksInput = signal<Task[]>([]);
  readonly scale = signal<TimelineScale>('week');
  readonly viewStart = signal<Date>(this.getWeekStart(new Date()));

  readonly scaleOptions: { label: string; value: TimelineScale }[] = [
    { label: 'Día', value: 'day' },
    { label: 'Semana', value: 'week' },
    { label: 'Mes', value: 'month' },
  ];

  /** Tareas con start/end para la barra (sin fecha se excluyen o se usa created/due) */
  readonly tasksWithRange = computed(() => {
    const list = this.tasksInput();
    const start = this.viewStart();
    const scale = this.scale();
    const range = this.getViewRange(start, scale);
    return list
      .map((task) => {
        const startDate = this.getTaskStart(task);
        const endDate = this.getTaskEnd(task);
        if (!startDate || !endDate) return null;
        return { task, startDate, endDate };
      })
      .filter((x): x is { task: Task; startDate: Date; endDate: Date } => x !== null);
  });

  /** Días (o celdas) visibles en la línea de tiempo */
  readonly timelineDays = computed(() => {
    const start = this.viewStart();
    const scale = this.scale();
    const { count, step } = this.getScaleConfig(scale);
    const days: Date[] = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i * step);
      days.push(d);
    }
    return days;
  });

  readonly timelineLabel = computed(() => {
    const start = this.viewStart();
    const scale = this.scale();
    const { count, step } = this.getScaleConfig(scale);
    const end = new Date(start);
    end.setDate(end.getDate() + count * step - 1);
    return `${this.formatShortDate(start)} – ${this.formatShortDate(end)}`;
  });

  readonly isToday = (d: Date): boolean => {
    const t = new Date();
    return (
      d.getDate() === t.getDate() &&
      d.getMonth() === t.getMonth() &&
      d.getFullYear() === t.getFullYear()
    );
  };

  readonly totalWidthPx = 800;
  readonly rowHeightPx = 44;

  private getWeekStart(d: Date): Date {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
  }

  private getScaleConfig(scale: TimelineScale): { count: number; step: number } {
    switch (scale) {
      case 'day':
        return { count: 7, step: 1 };
      case 'week':
        return { count: 7, step: 1 };
      case 'month':
        return { count: 31, step: 1 };
      default:
        return { count: 7, step: 1 };
    }
  }

  private getViewRange(start: Date, scale: TimelineScale): { start: Date; end: Date } {
    const { count, step } = this.getScaleConfig(scale);
    const end = new Date(start);
    end.setDate(end.getDate() + count * step);
    return { start, end };
  }

  getTaskStart(task: Task): Date | null {
    const raw = task.startDate ?? task.createdAt;
    if (!raw) return null;
    const d = typeof raw === 'string' ? new Date(raw) : raw;
    return isNaN(d.getTime()) ? null : d;
  }

  getTaskEnd(task: Task): Date | null {
    const raw = task.dueDate ?? task.completedDate ?? task.updatedAt;
    if (!raw) return null;
    const d = typeof raw === 'string' ? new Date(raw) : raw;
    return isNaN(d.getTime()) ? null : d;
  }

  /** Porcentaje de la barra (0–100) según posición entre viewStart y viewEnd */
  getBarStyle(item: { task: Task; startDate: Date; endDate: Date }): {
    left: string;
    width: string;
    backgroundColor: string;
  } {
    const start = this.viewStart();
    const scale = this.scale();
    const { count, step } = this.getScaleConfig(scale);
    const viewEnd = new Date(start);
    viewEnd.setDate(viewEnd.getDate() + count * step);
    const viewStartMs = start.getTime();
    const viewEndMs = viewEnd.getTime();
    const rangeMs = viewEndMs - viewStartMs;
    const barStart = Math.max(item.startDate.getTime(), viewStartMs);
    const barEnd = Math.min(item.endDate.getTime(), viewEndMs);
    const left = ((barStart - viewStartMs) / rangeMs) * 100;
    const width = Math.max(2, ((barEnd - barStart) / rangeMs) * 100);
    const color = this.getBarColor(item.task);
    return { left: `${left}%`, width: `${width}%`, backgroundColor: color };
  }

  /** Tarea retrasada: dueDate ya pasada y no está Terminada */
  isOverdue(task: Task): boolean {
    if (task.status === 'Terminada') return false;
    const due = task.dueDate ? new Date(task.dueDate) : null;
    if (!due || isNaN(due.getTime())) return false;
    return due.getTime() < Date.now();
  }

  getBarColor(task: Task): string {
    if (this.isOverdue(task)) return 'rgb(220 38 38)'; // red
    switch (task.status) {
      case 'Terminada':
        return 'rgb(34 197 94)'; // green
      case 'En curso':
        return 'rgb(249 115 22)'; // orange
      default:
        return 'rgb(59 130 246)'; // blue
    }
  }

  /** Texto completo para la barra: estado, progreso y si está retrasada */
  getBarLabel(task: Task): string {
    if (this.isOverdue(task)) {
      return `Vencida · ${task.status} (Progreso: ${task.progress ?? 0}%)`;
    }
    return `${task.status} (Progreso: ${task.progress ?? 0}%)`;
  }

  formatShortDate(d: Date): string {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }

  formatDayNum(d: Date): string {
    return String(d.getDate()).padStart(2, '0');
  }

  setScale(value: TimelineScale): void {
    this.scale.set(value);
    if (value === 'day') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      this.viewStart.set(today);
    } else {
      this.viewStart.set(this.getWeekStart(new Date()));
    }
  }

  prevRange(): void {
    const start = this.viewStart();
    const scale = this.scale();
    const { step } = this.getScaleConfig(scale);
    const count = scale === 'month' ? 31 : 7;
    const next = new Date(start);
    next.setDate(next.getDate() - count * step);
    this.viewStart.set(next);
  }

  nextRange(): void {
    const start = this.viewStart();
    const scale = this.scale();
    const { step } = this.getScaleConfig(scale);
    const count = scale === 'month' ? 31 : 7;
    const next = new Date(start);
    next.setDate(next.getDate() + count * step);
    this.viewStart.set(next);
  }

  onViewTask(task: Task, event: Event): void {
    event.stopPropagation();
    this.viewTask.emit(task);
  }

  getAssigneeName(task: Task): string {
    const a = task.assignedTo;
    if (!a) return '—';
    if (typeof a === 'object' && a !== null && 'name' in a)
      return (a as { name?: string }).name || '—';
    return '—';
  }
}
