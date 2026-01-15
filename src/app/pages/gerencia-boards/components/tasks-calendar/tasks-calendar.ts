import { Component, OnInit, inject, signal, computed, effect, Output, EventEmitter, AfterViewInit, ElementRef, Injector, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePickerModule, DatePickerMonthChangeEvent } from 'primeng/datepicker';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TasksApiService } from '../../../../shared/services/tasks-api.service';
import { Task, TasksSearchParams } from '../../../../shared/interfaces/task.interface';

/**
 * Componente de calendario para mostrar tareas por fecha
 */
@Component({
  selector: 'app-tasks-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerModule, CardModule, ButtonModule],
  templateUrl: './tasks-calendar.html',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      :host ::ng-deep .p-calendar {
        width: 100%;
      }
      :host ::ng-deep .p-datepicker {
        width: 100%;
      }
      :host ::ng-deep .p-datepicker-calendar {
        width: 100%;
      }
      :host ::ng-deep .p-datepicker-calendar td {
        position: relative;
      }
      :host ::ng-deep .p-datepicker-calendar td.has-tasks {
        background-color: rgba(59, 130, 246, 0.1);
      }
      :host ::ng-deep .p-datepicker-calendar td.has-tasks a {
        font-weight: bold;
      }
      :host ::ng-deep .task-count-badge {
        position: absolute;
        top: 2px;
        right: 2px;
        background-color: #3b82f6;
        color: white;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        font-size: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }
    `,
  ],
})
export class TasksCalendarComponent implements OnInit, AfterViewInit {
  private readonly tasksService = inject(TasksApiService);
  private readonly elementRef = inject(ElementRef);
  private readonly injector = inject(Injector);

  // Signals
  public readonly loading = signal<boolean>(false);
  public readonly selectedDate = signal<Date | null>(null);
  public readonly currentMonth = signal<Date>(new Date());
  public readonly allTasks = signal<Task[]>([]);

  // Computed: Tareas agrupadas por fecha
  public readonly tasksByDate = computed(() => {
    const tasks = this.allTasks();
    const grouped = new Map<string, Task[]>();

    tasks.forEach((task) => {
      if (task.dueDate) {
        const date = new Date(task.dueDate);
        const dateKey = this.formatDateKey(date);
        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, []);
        }
        grouped.get(dateKey)!.push(task);
      }
    });

    return grouped;
  });

  // Computed: Tareas del día seleccionado
  public readonly selectedDayTasks = computed(() => {
    const date = this.selectedDate();
    if (!date) return [];

    const dateKey = this.formatDateKey(date);
    return this.tasksByDate().get(dateKey) || [];
  });

  // Computed: Función para obtener el número de tareas de una fecha
  public readonly getTaskCountForDate = computed(() => {
    const tasksByDate = this.tasksByDate();
    return (date: Date): number => {
      const dateKey = this.formatDateKey(date);
      return tasksByDate.get(dateKey)?.length || 0;
    };
  });

  // Outputs
  @Output() dateSelected = new EventEmitter<{ date: Date; tasks: Task[] }>();
  
  // Input para refrescar desde el padre
  private refreshTrigger = signal<number>(0);

  constructor() {
    // Effect para cargar tareas cuando cambia el mes
    effect(() => {
      const month = this.currentMonth();
      this.loadTasksForMonth(month);
    });
    
    // Effect para refrescar cuando se solicita
    effect(() => {
      const trigger = this.refreshTrigger();
      if (trigger > 0) {
        this.loadTasksForMonth(this.currentMonth());
      }
    });
  }
  
  /**
   * Método público para refrescar el calendario
   */
  public refreshCalendar(): void {
    this.refreshTrigger.update(v => v + 1);
  }

  ngOnInit(): void {
    this.loadTasksForMonth(new Date());
  }

  ngAfterViewInit(): void {
    // Marcar fechas con tareas después de que el calendario se renderice
    // Usar runInInjectionContext porque effect() requiere un contexto de inyección
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const tasks = this.allTasks();
        if (tasks.length > 0) {
          setTimeout(() => this.markDatesWithTasks(), 300);
        }
      });
    });
  }

  /**
   * Marca las fechas que tienen tareas en el calendario
   */
  private markDatesWithTasks(): void {
    const calendarElement = this.elementRef.nativeElement.querySelector('.p-datepicker-calendar');
    if (!calendarElement) return;

    const tasksByDate = this.tasksByDate();
    const currentMonth = this.currentMonth();
    
    // Limpiar marcas anteriores
    Array.from(calendarElement.querySelectorAll('.has-tasks') as NodeListOf<HTMLElement>).forEach((el) => {
      el.classList.remove('has-tasks');
    });
    Array.from(calendarElement.querySelectorAll('.task-count-badge') as NodeListOf<HTMLElement>).forEach((el) => {
      el.remove();
    });

    // Marcar nuevas fechas
    const cells = calendarElement.querySelectorAll('td:not(.p-datepicker-other-month)');
    
    cells.forEach((td: HTMLElement) => {
      const dayLink = td.querySelector('a');
      if (!dayLink) return;
      
      const dayText = dayLink.textContent?.trim();
      if (!dayText || isNaN(Number(dayText))) return;

      const day = Number(dayText);
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const dateKey = this.formatDateKey(date);

      if (tasksByDate.has(dateKey)) {
        const taskCount = tasksByDate.get(dateKey)!.length;
        td.classList.add('has-tasks');
        
        // Agregar badge con el número de tareas
        const badge = document.createElement('span');
        badge.className = 'task-count-badge';
        badge.textContent = String(taskCount);
        badge.title = `${taskCount} tarea${taskCount !== 1 ? 's' : ''}`;
        td.appendChild(badge);
      }
    });
  }

  /**
   * Carga todas las tareas del mes actual
   */
  private loadTasksForMonth(month: Date): void {
    this.loading.set(true);

    // Crear fechas en UTC para evitar problemas de zona horaria
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    
    // Inicio del mes: primer día a las 00:00:00 UTC
    const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    // Fin del mes: último día a las 23:59:59.999 UTC
    const endDate = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

    // Formatear fechas como YYYY-MM-DDTHH:mm:ss.sssZ (formato ISO completo)
    // Usar toISOString() que genera el formato correcto para IsDateString()
    const params: TasksSearchParams = {
      dueDateFrom: this.formatDateISO(startDate),
      dueDateTo: this.formatDateISO(endDate),
      limit: 10000, // Obtener todas las tareas del mes
    };

    this.tasksService.getTasks(params).subscribe({
      next: (response) => {
        this.allTasks.set(response.data || []);
        this.loading.set(false);
        // Marcar fechas después de cargar las tareas
        setTimeout(() => this.markDatesWithTasks(), 300);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  /**
   * Formatea una fecha como clave (YYYY-MM-DD)
   * Usa UTC para evitar problemas de zona horaria
   */
  private formatDateKey(date: Date): string {
    // Usar UTC para evitar problemas de zona horaria
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Formatea una fecha como string ISO (YYYY-MM-DDTHH:mm:ss.sssZ)
   */
  private formatDateISO(date: Date): string {
    return date.toISOString();
  }

  /**
   * Maneja la selección de una fecha en el calendario
   */
  onDateSelect(event: Date): void {
    this.selectedDate.set(event);

    const dateKey = this.formatDateKey(event);
    const tasks = this.tasksByDate().get(dateKey) || [];

    this.dateSelected.emit({ date: event, tasks });
  }

  /**
   * Maneja el cambio de mes en el calendario
   */
  onMonthChange(event: DatePickerMonthChangeEvent): void {
    // Crear una fecha a partir del mes y año del evento
    // Usar valores por defecto si no están disponibles
    const year = event.year ?? this.currentMonth().getFullYear();
    const month = event.month ?? this.currentMonth().getMonth();
    const newDate = new Date(year, month, 1);
    this.currentMonth.set(newDate);
    // Marcar fechas después de que cambie el mes
    setTimeout(() => this.markDatesWithTasks(), 100);
  }

  /**
   * Verifica si una fecha tiene tareas
   */
  hasTasks(date: Date): boolean {
    const dateKey = this.formatDateKey(date);
    return this.tasksByDate().has(dateKey);
  }

  /**
   * Obtiene el número de tareas de una fecha
   */
  getTaskCount(date: Date): number {
    return this.getTaskCountForDate()(date);
  }

}
