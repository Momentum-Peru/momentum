import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task } from '../../../../shared/interfaces/task.interface';
import { User } from '../../../../shared/services/users-api.service';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

@Component({
  selector: 'app-tasks-calendar-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    ButtonModule,
    AvatarModule,
    TooltipModule,
  ],
  templateUrl: './tasks-calendar-view.html',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class TasksCalendarViewComponent {
  @Input() set tasks(value: Task[]) {
    this.tasksInput.set(value || []);
  }
  @Input() members: User[] = [];
  @Input() currentUser: User | null = null;
  @Output() viewTask = new EventEmitter<Task>();
  @Output() taskCreated = new EventEmitter<{ title: string; assignedTo: string; dueDate?: Date }>();

  readonly tasksInput = signal<Task[]>([]);
  newTaskTitle = '';
  selectedAssignee: User | null = null;
  selectedDueDate: Date | null = null;
  today = new Date();
  readonly currentMonth = signal<Date>(new Date());

  /** Agrupa tareas por fecha (clave YYYY-MM-DD). Usa dueDate o startDate. */
  readonly tasksByDate = computed(() => {
    const list = this.tasksInput();
    const map = new Map<string, Task[]>();
    list.forEach((task) => {
      const date = this.getTaskDate(task);
      if (!date) return;
      const key = this.dateKey(date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    });
    return map;
  });

  /** Días del mes actual para la grilla (incluye huecos al inicio) */
  readonly calendarDays = computed(() => {
    const month = this.currentMonth();
    const year = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(year, m, 1);
    const last = new Date(year, m + 1, 0);
    const startWeekday = first.getDay() === 0 ? 6 : first.getDay() - 1; // Lun = 0
    const totalDays = last.getDate();
    const days: { date: Date; day: number; isCurrentMonth: boolean }[] = [];

    // Huecos antes del día 1
    for (let i = 0; i < startWeekday; i++) {
      const d = new Date(year, m, -startWeekday + i + 1);
      days.push({ date: d, day: d.getDate(), isCurrentMonth: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push({ date: new Date(year, m, d), day: d, isCurrentMonth: true });
    }
    // Rellenar hasta completar 6 filas (42 celdas)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, m + 1, i);
      days.push({ date: d, day: d.getDate(), isCurrentMonth: false });
    }
    return days;
  });

  readonly monthLabel = computed(() => {
    const d = this.currentMonth();
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  });

  readonly weekdays = WEEKDAYS;

  getTaskDate(task: Task): Date | null {
    const raw = task.dueDate ?? task.startDate;
    if (!raw) return null;
    const d = typeof raw === 'string' ? new Date(raw) : raw;
    return isNaN(d.getTime()) ? null : d;
  }

  dateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  getTasksForDay(day: { date: Date; isCurrentMonth: boolean }): Task[] {
    if (!day.isCurrentMonth) return [];
    return this.tasksByDate().get(this.dateKey(day.date)) || [];
  }

  prevMonth(): void {
    const d = this.currentMonth();
    this.currentMonth.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const d = this.currentMonth();
    this.currentMonth.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  goToday(): void {
    this.currentMonth.set(new Date());
  }

  onViewTask(task: Task, event: Event): void {
    event.stopPropagation();
    this.viewTask.emit(task);
  }

  getInitials(name?: string): string {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  createTask(): void {
    if (!this.newTaskTitle.trim() || !this.selectedAssignee) return;
    this.taskCreated.emit({
      title: this.newTaskTitle.trim(),
      assignedTo:
        this.selectedAssignee._id ?? (this.selectedAssignee as unknown as { id?: string }).id ?? '',
      dueDate: this.selectedDueDate ?? undefined,
    });
    this.newTaskTitle = '';
    this.selectedAssignee = null;
    this.selectedDueDate = null;
  }

  /** Tarea retrasada: tiene dueDate ya pasada y no está Terminada */
  isOverdue(task: Task): boolean {
    if (task.status === 'Terminada') return false;
    const due = task.dueDate ? new Date(task.dueDate) : null;
    if (!due || isNaN(due.getTime())) return false;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return due.getTime() < today.getTime();
  }

  getStatusClass(task: Task): string {
    if (this.isOverdue(task)) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-400';
    }
    switch (task.status) {
      case 'Terminada':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'En curso':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    }
  }
}
