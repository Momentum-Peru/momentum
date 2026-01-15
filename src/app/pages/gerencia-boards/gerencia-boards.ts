import { Component, OnInit, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { MessageService } from 'primeng/api';
import { BoardsApiService } from '../../shared/services/boards-api.service';
import { AuthService } from '../login/services/auth.service';
import { BoardCardComponent } from '../tasks/components/board-card/board-card';
import { BoardInviteComponent } from '../tasks/components/board-invite/board-invite';
import { TasksCalendarComponent } from './components/tasks-calendar/tasks-calendar';
import { DayTasksDialogComponent } from './components/day-tasks-dialog/day-tasks-dialog';
import { Board, InviteUserRequest } from '../../shared/interfaces/board.interface';
import { Task } from '../../shared/interfaces/task.interface';

/**
 * Página de gerencia para visualizar todos los tableros del sistema
 * Vista general con tarjetas pequeñas ordenadas
 */
@Component({
  selector: 'app-gerencia-boards',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ProgressSpinnerModule,
    MessageModule,
    TooltipModule,
    InputTextModule,
    DialogModule,
    ToastModule,
    ToggleButtonModule,
    BoardCardComponent,
    BoardInviteComponent,
    TasksCalendarComponent,
    DayTasksDialogComponent,
  ],
  providers: [MessageService],
  templateUrl: './gerencia-boards.html',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      :host ::ng-deep .p-card {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      :host ::ng-deep .p-card-body {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      :host ::ng-deep .p-card-content {
        flex: 1;
      }
    `,
  ],
})
export class GerenciaBoardsPage implements OnInit {
  private readonly boardsService = inject(BoardsApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  // Signals
  public readonly loading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);
  public readonly searchTerm = signal<string>('');
  public readonly showBoardInvite = signal<boolean>(false);
  public readonly invitingBoard = signal<Board | null>(null);
  public readonly boardInviteLoading = signal<boolean>(false);
  public readonly viewMode = signal<'cards' | 'calendar'>('cards');
  public readonly selectedDateForDialog = signal<Date | null>(null);
  public readonly selectedDateTasks = signal<Task[]>([]);
  public readonly showDayTasksDialog = signal<boolean>(false);
  
  @ViewChild('calendarRef') calendarComponent!: TasksCalendarComponent;

  // Computed
  public readonly boards = computed(() => this.boardsService.boards());
  public readonly filteredBoards = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) {
      return this.boards();
    }
    return this.boards().filter(
      (board) =>
        board.title.toLowerCase().includes(term) ||
        board.description?.toLowerCase().includes(term) ||
        board.owner?.name?.toLowerCase().includes(term) ||
        board.owner?.email?.toLowerCase().includes(term)
    );
  });
  public readonly currentUserId = computed(() => this.authService.getCurrentUser()?.id || '');

  ngOnInit(): void {
    // Verificar que el usuario es gerencia
    if (!this.authService.isGerencia()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Cargar todos los tableros
    this.loadAllBoards();
  }

  /**
   * Carga todos los tableros del sistema
   */
  loadAllBoards(): void {
    this.loading.set(true);
    this.error.set(null);

    this.boardsService.getAllForGerencia().subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const errorMessage =
          err?.error?.message || 'Error al cargar los tableros';
        this.error.set(errorMessage);
      },
    });
  }

  /**
   * Refresca la lista de tableros
   */
  refreshBoards(): void {
    this.loadAllBoards();
  }

  /**
   * Navega a la vista de un tablero específico
   */
  onViewBoard(board: Board): void {
    this.router.navigate(['/tasks', board._id]);
  }

  /**
   * Maneja la búsqueda
   */
  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  /**
   * Verifica si un tablero pertenece al usuario actual
   */
  isBoardOwner(board: Board): boolean {
    return board.owner?._id === this.currentUserId();
  }

  /**
   * Abre el formulario de invitación para un tablero
   */
  openBoardInvite(board: Board): void {
    this.invitingBoard.set(board);
    this.showBoardInvite.set(true);
  }

  /**
   * Cierra el formulario de invitación
   */
  closeBoardInvite(): void {
    this.showBoardInvite.set(false);
    this.invitingBoard.set(null);
  }

  /**
   * Maneja la invitación de usuarios
   */
  onInviteUser(data: InviteUserRequest): void {
    const board = this.invitingBoard();
    if (!board) return;

    this.boardInviteLoading.set(true);
    this.boardsService.inviteUser(board._id, data).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Usuario invitado exitosamente',
        });
        this.closeBoardInvite();
        this.refreshBoards();
        this.boardInviteLoading.set(false);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.error?.message || 'Error al invitar usuario',
        });
        this.boardInviteLoading.set(false);
      },
    });
  }

  /**
   * Obtiene los IDs de miembros existentes para un tablero
   */
  getExistingMemberIds(board: Board): string[] {
    if (!board || !board.owner) return [];
    return [board.owner._id, ...(board.members || []).map((m) => m._id)];
  }

  /**
   * Verifica si el usuario actual es gerencia
   */
  isGerencia(): boolean {
    return this.authService.isGerencia();
  }


  /**
   * Maneja la selección de fecha en el calendario
   */
  onDateSelected(event: { date: Date; tasks: Task[] } | null): void {
    if (event) {
      // Normalizar la fecha seleccionada a medianoche UTC para evitar problemas de zona horaria
      const date = event.date;
      const normalizedDate = new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        0, 0, 0, 0
      ));
      
      this.selectedDateForDialog.set(normalizedDate);
      this.selectedDateTasks.set(event.tasks);
      this.showDayTasksDialog.set(true);
    }
  }

  /**
   * Maneja el cierre del diálogo de tareas del día
   */
  onDayTasksDialogClose(): void {
    this.showDayTasksDialog.set(false);
    this.selectedDateForDialog.set(null);
    this.selectedDateTasks.set([]);
  }

  /**
   * Maneja la creación de una nueva tarea desde el diálogo
   */
  onTaskCreated(task: Task): void {
    // Agregar la nueva tarea inmediatamente a la lista local
    const selectedDate = this.selectedDateForDialog();
    
    if (selectedDate) {
      let shouldAdd = false;
      
      if (task.dueDate) {
        // Normalizar las fechas para comparar solo la parte de fecha (sin hora)
        const taskDate = new Date(task.dueDate);
        const selectedDateKey = this.formatDateKey(selectedDate);
        const taskDateKey = this.formatDateKey(taskDate);
        
        // Solo agregar si la fecha coincide
        if (taskDateKey === selectedDateKey) {
          shouldAdd = true;
        }
      } else {
        // Si la tarea no tiene fecha pero hay una fecha seleccionada, agregarla de todas formas
        shouldAdd = true;
      }
      
      if (shouldAdd) {
        const currentTasks = this.selectedDateTasks();
        // Verificar que la tarea no esté ya en la lista
        const taskExists = currentTasks.some(t => t._id === task._id);
        if (!taskExists) {
          this.selectedDateTasks.set([...currentTasks, task]);
        }
      }
    }
    
    // Refrescar el calendario para mostrar la nueva tarea
    // Esperar un poco para que el servidor procese la creación
    setTimeout(() => {
      this.onRefreshCalendar();
    }, 300);
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
   * Maneja la solicitud de refrescar el calendario
   */
  onRefreshCalendar(): void {
    if (this.calendarComponent) {
      // Guardar las tareas actuales antes de refrescar
      const currentTasks = this.selectedDateTasks();
      
      this.calendarComponent.refreshCalendar();
      
      // Esperar a que el calendario se actualice y luego actualizar las tareas del día seleccionado
      // Usar un timeout más largo para asegurar que el servidor haya procesado la creación
      setTimeout(() => {
        const selectedDate = this.selectedDateForDialog();
        if (selectedDate) {
          // Obtener las tareas actualizadas del calendario para la fecha seleccionada
          const dateKey = this.formatDateKey(selectedDate);
          const tasksByDate = this.calendarComponent.tasksByDate();
          const updatedTasks = tasksByDate.get(dateKey) || [];
          
          // Combinar las tareas actualizadas con las tareas locales (para incluir las recién creadas)
          const taskMap = new Map<string, Task>();
          
          // Agregar tareas actualizadas del servidor
          updatedTasks.forEach(task => {
            taskMap.set(task._id, task);
          });
          
          // Agregar tareas locales que no estén en las actualizadas (pueden ser recién creadas)
          currentTasks.forEach(task => {
            if (!taskMap.has(task._id)) {
              // Verificar que la fecha coincida
              if (task.dueDate) {
                const taskDateKey = this.formatDateKey(new Date(task.dueDate));
                if (taskDateKey === dateKey) {
                  taskMap.set(task._id, task);
                }
              } else if (selectedDate) {
                // Si no tiene fecha pero hay fecha seleccionada, mantenerla temporalmente
                taskMap.set(task._id, task);
              }
            }
          });
          
          const finalTasks = Array.from(taskMap.values());
          this.selectedDateTasks.set(finalTasks);
        }
      }, 800);
    }
  }
}
