import { Component, OnInit, AfterViewInit, OnDestroy, inject, signal, computed, effect, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { BoardsApiService } from '../../shared/services/boards-api.service';
import { TasksApiService } from '../../shared/services/tasks-api.service';
import { AuthService } from '../login/services/auth.service';
import { BoardCardComponent } from '../tasks/components/board-card/board-card';
import { BoardInviteComponent } from '../tasks/components/board-invite/board-invite';
import { BoardFormComponent } from '../tasks/components/board-form/board-form';
import { TasksCalendarComponent } from './components/tasks-calendar/tasks-calendar';
import { DayTasksDialogComponent } from './components/day-tasks-dialog/day-tasks-dialog';
import { Board, InviteUserRequest, CreateBoardRequest, UpdateBoardRequest } from '../../shared/interfaces/board.interface';
import { Task, TasksSearchParams } from '../../shared/interfaces/task.interface';

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
    ConfirmDialogModule,
    BoardCardComponent,
    BoardInviteComponent,
    BoardFormComponent,
    TasksCalendarComponent,
    DayTasksDialogComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './gerencia-boards.html',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      /* Asegurar que todas las tarjetas en el grid tengan la misma altura */
      :host ::ng-deep .grid {
        align-items: stretch;
      }
      :host ::ng-deep .grid > div {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      :host ::ng-deep .grid > div > app-board-card {
        flex: 1;
        display: flex;
        flex-direction: column;
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
        min-height: 0;
      }
      :host ::ng-deep .p-card-content {
        flex: 1;
        min-height: 0;
      }
      /* Asegurar que todos los headers tengan la misma altura */
      :host ::ng-deep .p-card-header {
        display: flex;
        align-items: stretch;
        flex-shrink: 0;
      }
      :host ::ng-deep .p-card-header > div {
        display: flex;
        align-items: center;
        width: 100%;
      }
      /* Asegurar que los footers estén siempre en la parte inferior */
      :host ::ng-deep .p-card-footer {
        flex-shrink: 0;
        margin-top: auto;
      }
    `,
  ],
})
export class GerenciaBoardsPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly boardsService = inject(BoardsApiService);
  private readonly tasksService = inject(TasksApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly elementRef = inject(ElementRef);

  // Signals
  public readonly loading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);
  public readonly searchTerm = signal<string>('');
  public readonly showBoardInvite = signal<boolean>(false);
  public readonly invitingBoard = signal<Board | null>(null);
  public readonly boardInviteLoading = signal<boolean>(false);
  public readonly viewMode = signal<'cards' | 'calendar'>('calendar');
  public readonly selectedDateForDialog = signal<Date | null>(null);
  public readonly selectedDateTasks = signal<Task[]>([]);
  public readonly showDayTasksDialog = signal<boolean>(false);
  public readonly todayTasks = signal<Task[]>([]);
  public readonly loadingTodayTasks = signal<boolean>(false);
  public readonly showBoardForm = signal<boolean>(false);
  public readonly isEditingBoard = signal<boolean>(false);
  public readonly editingBoard = signal<Board | null>(null);
  public readonly boardFormLoading = signal<boolean>(false);

  @ViewChild('calendarRef') calendarComponent!: TasksCalendarComponent;
  @ViewChildren(BoardCardComponent) boardCards!: QueryList<BoardCardComponent>;

  // Listener para detectar cuando la página se vuelve visible
  private visibilityChangeHandler?: () => void;

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

    // Cargar tareas de hoy si estamos en modo calendario al inicializar
    if (this.viewMode() === 'calendar') {
      this.loadTodayTasks();
    }

    // Effect para recalcular alturas cuando cambien los boards o el modo de vista
    effect(() => {
      // Acceder a los signals para que el effect se ejecute cuando cambien
      this.filteredBoards();
      const mode = this.viewMode();

      // Recalcular alturas después de que cambien
      if (mode === 'cards') {
        requestAnimationFrame(() => {
          this.equalizeHeaderHeights();
          this.equalizeFooterHeights();
        });
      }

      // Cargar tareas de hoy cuando se cambie a modo calendario
      if (mode === 'calendar') {
        this.loadTodayTasks();
      }
    });

    // Listener para recargar tareas cuando la página se vuelve visible
    // Esto es útil cuando el usuario edita una tarea en otra página y vuelve
    this.visibilityChangeHandler = () => {
      if (!document.hidden && this.viewMode() === 'calendar') {
        // Recargar tareas de hoy cuando la página se vuelve visible
        this.loadTodayTasks();
        // También refrescar el calendario si está disponible
        if (this.calendarComponent) {
          this.calendarComponent.refreshCalendar();
        }
      }
    };
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  ngAfterViewInit(): void {
    // Calcular altura máxima de headers y footers después de que la vista se inicialice
    this.equalizeHeaderHeights();
    this.equalizeFooterHeights();

    // Escuchar cambios en los ViewChildren
    if (this.boardCards) {
      this.boardCards.changes.subscribe(() => {
        this.equalizeHeaderHeights();
        this.equalizeFooterHeights();
      });
    }
  }

  ngOnDestroy(): void {
    // Limpiar el listener de visibilidad cuando el componente se destruya
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }
  }

  /**
   * Iguala la altura de todos los encabezados de las tarjetas
   * basándose en el encabezado más alto
   */
  equalizeHeaderHeights(): void {
    if (this.viewMode() !== 'cards') {
      return;
    }

    // Intentar directamente primero
    const tryEqualize = () => {
      // Usar ViewChildren si está disponible, sino usar querySelector
      const validHeaders: HTMLElement[] = [];

      if (this.boardCards && this.boardCards.length > 0) {
        // Usar ViewChildren para obtener referencias directas
        this.boardCards.forEach((cardComponent) => {
          // Intentar acceder al elemento del componente de diferentes maneras
          // Usar una interfaz auxiliar para evitar 'any'
          interface ComponentWithElementRef {
            elementRef?: { nativeElement: HTMLElement };
            _elementRef?: { nativeElement: HTMLElement };
            hostElement?: HTMLElement;
          }
          const component = cardComponent as unknown as ComponentWithElementRef;
          const cardElement = component.elementRef?.nativeElement ||
                            component._elementRef?.nativeElement ||
                            component.hostElement;

          if (cardElement) {
            // Buscar el header dentro del componente
            const header = cardElement.querySelector('.p-card-header') as HTMLElement;
            if (header) {
              validHeaders.push(header);
            } else {
              // Si no encuentra directamente, buscar en el shadow root o en los hijos
              const pCard = cardElement.querySelector('p-card') ||
                           cardElement.querySelector('[class*="p-card"]') ||
                           cardElement.querySelector('[class*="card"]');
              if (pCard) {
                const header = pCard.querySelector('.p-card-header') as HTMLElement;
                if (header) {
                  validHeaders.push(header);
                }
              }
            }
          }
        });
      }

      // Si ViewChildren no funcionó, usar querySelector como fallback
      if (validHeaders.length === 0) {
        const boardCards = this.elementRef.nativeElement.querySelectorAll('app-board-card');
        boardCards.forEach((card: Element) => {
          const pCard = card.querySelector('p-card') || card.querySelector('[class*="p-card"]');
          if (pCard) {
            const header = pCard.querySelector('.p-card-header') as HTMLElement;
            if (header) {
              validHeaders.push(header);
            }
          }
        });
      }

      if (validHeaders.length === 0) {
        // Si no encuentra elementos, intentar en el siguiente frame
        requestAnimationFrame(tryEqualize);
        return;
      }

      let maxHeight = 0;

      // Calcular la altura máxima
      validHeaders.forEach((header: HTMLElement) => {
        // Resetear altura para obtener la altura natural
        header.style.height = '';
        header.style.minHeight = '';
        // Forzar reflow
        void header.offsetHeight;
        const height = header.offsetHeight;
        if (height > maxHeight) {
          maxHeight = height;
        }
      });

      // Aplicar la altura máxima a todos los headers
      if (maxHeight > 0) {
        validHeaders.forEach((header: HTMLElement) => {
          header.style.height = `${maxHeight}px`;
        });
      }
    };

    // Intentar directamente
    tryEqualize();
  }

  /**
   * Iguala la altura de todos los footers de las tarjetas
   * basándose en el footer más alto para mantenerlos en la misma posición
   */
  equalizeFooterHeights(): void {
    if (this.viewMode() !== 'cards') {
      return;
    }

    // Intentar directamente primero
    const tryEqualize = () => {
      // Usar ViewChildren si está disponible, sino usar querySelector
      const validFooters: HTMLElement[] = [];

      if (this.boardCards && this.boardCards.length > 0) {
        // Usar ViewChildren para obtener referencias directas
        this.boardCards.forEach((cardComponent) => {
          // Intentar acceder al elemento del componente de diferentes maneras
          // Usar una interfaz auxiliar para evitar 'any'
          interface ComponentWithElementRef {
            elementRef?: { nativeElement: HTMLElement };
            _elementRef?: { nativeElement: HTMLElement };
            hostElement?: HTMLElement;
          }
          const component = cardComponent as unknown as ComponentWithElementRef;
          const cardElement = component.elementRef?.nativeElement ||
                            component._elementRef?.nativeElement ||
                            component.hostElement;

          if (cardElement) {
            // Buscar el footer dentro del componente
            const footer = cardElement.querySelector('.p-card-footer') as HTMLElement;
            if (footer) {
              validFooters.push(footer);
            } else {
              // Si no encuentra directamente, buscar en el shadow root o en los hijos
              const pCard = cardElement.querySelector('p-card') ||
                           cardElement.querySelector('[class*="p-card"]') ||
                           cardElement.querySelector('[class*="card"]');
              if (pCard) {
                const footer = pCard.querySelector('.p-card-footer') as HTMLElement;
                if (footer) {
                  validFooters.push(footer);
                }
              }
            }
          }
        });
      }

      // Si ViewChildren no funcionó, usar querySelector como fallback
      if (validFooters.length === 0) {
        const boardCards = this.elementRef.nativeElement.querySelectorAll('app-board-card');
        boardCards.forEach((card: Element) => {
          const pCard = card.querySelector('p-card') || card.querySelector('[class*="p-card"]');
          if (pCard) {
            const footer = pCard.querySelector('.p-card-footer') as HTMLElement;
            if (footer) {
              validFooters.push(footer);
            }
          }
        });
      }

      if (validFooters.length === 0) {
        // Si no encuentra elementos, intentar en el siguiente frame
        requestAnimationFrame(tryEqualize);
        return;
      }

      let maxHeight = 0;

      // Calcular la altura máxima
      validFooters.forEach((footer: HTMLElement) => {
        // Resetear altura para obtener la altura natural
        footer.style.height = '';
        footer.style.minHeight = '';
        // Forzar reflow
        void footer.offsetHeight;
        const height = footer.offsetHeight;
        if (height > maxHeight) {
          maxHeight = height;
        }
      });

      // Aplicar la altura máxima a todos los footers
      if (maxHeight > 0) {
        validFooters.forEach((footer: HTMLElement) => {
          footer.style.height = `${maxHeight}px`;
        });
      }
    };

    // Intentar directamente
    tryEqualize();
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
   * Abre el formulario para editar un tablero
   */
  onEditBoard(board: Board): void {
    this.editingBoard.set(board);
    this.isEditingBoard.set(true);
    this.showBoardForm.set(true);
  }

  /**
   * Cierra el formulario de tablero
   */
  closeBoardForm(): void {
    this.showBoardForm.set(false);
    this.editingBoard.set(null);
    this.isEditingBoard.set(false);
  }

  /**
   * Maneja el guardado de tableros (crear o editar)
   */
  onBoardSave(data: CreateBoardRequest | UpdateBoardRequest): void {
    this.boardFormLoading.set(true);

    const isEditing = this.isEditingBoard();
    const board = this.editingBoard();

    const operation = isEditing && board
      ? this.boardsService.update(board._id, data as UpdateBoardRequest)
      : this.boardsService.create(data as CreateBoardRequest);

    operation.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: isEditing ? 'Tablero actualizado correctamente' : 'Tablero creado correctamente',
        });
        this.closeBoardForm();
        this.refreshBoards();
        this.boardFormLoading.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: isEditing ? 'No se pudo actualizar el tablero' : 'No se pudo crear el tablero',
        });
        this.boardFormLoading.set(false);
      },
    });
  }

  /**
   * Maneja la eliminación de un tablero
   */
  onDeleteBoard(board: Board): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que quieres eliminar el tablero "${board.title}"? Se desasociarán todas sus tareas. Esta acción no se puede deshacer.`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.deleteBoard(board._id);
      },
    });
  }

  /**
   * Elimina un tablero
   */
  private deleteBoard(boardId: string): void {
    this.boardsService.delete(boardId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Tablero eliminado correctamente',
        });
        this.refreshBoards();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar el tablero',
        });
      },
    });
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
      // El datepicker devuelve fechas en hora local, así que usamos getFullYear, getMonth, getDate
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
        // Asegurar que la fecha se interprete como UTC
        let taskDate: Date;
        if (typeof task.dueDate === 'string') {
          const dateStr = task.dueDate.endsWith('Z') ? task.dueDate : task.dueDate + 'Z';
          taskDate = new Date(dateStr);
        } else {
          taskDate = task.dueDate;
        }
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
  formatDateKey(date: Date): string {
    // Usar métodos locales para obtener el día calendario que el usuario ve
    // Esto asegura consistencia con cómo se agrupan las tareas en el calendario
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
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

      // Refrescar también las tareas de hoy
      this.loadTodayTasks();

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
                // Asegurar que la fecha se interprete como UTC
                let taskDate: Date;
                if (typeof task.dueDate === 'string') {
                  const dateStr = task.dueDate.endsWith('Z') ? task.dueDate : task.dueDate + 'Z';
                  taskDate = new Date(dateStr);
                } else {
                  taskDate = task.dueDate;
                }
                const taskDateKey = this.formatDateKey(taskDate);
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

  /**
   * Carga las tareas de hoy
   */
  loadTodayTasks(): void {
    this.loadingTodayTasks.set(true);

    // Usar métodos locales para obtener el día calendario de hoy
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    
    // Crear fechas locales para el inicio y fin del día de hoy
    const todayStartLocal = new Date(year, month, day, 0, 0, 0, 0);
    const todayEndLocal = new Date(year, month, day, 23, 59, 59, 999);
    
    // Ampliar el rango para cubrir todo el día local, incluyendo el día anterior y siguiente en UTC
    // Esto asegura que capturemos todas las tareas del día local, incluso si están en días UTC diferentes
    // Por ejemplo: Si hoy es 26/01/2026 en hora local (UTC-5):
    // - Una tarea a las 20:00 hora local = 27/01/2026 01:00 UTC
    // - Necesitamos incluir desde 25/01/2026 en UTC hasta 28/01/2026 en UTC para cubrir todo el día 26 local
    const dayBeforeLocal = new Date(year, month, day - 1, 0, 0, 0, 0);
    const dayAfterLocal = new Date(year, month, day + 1, 23, 59, 59, 999);
    
    const todayStartUTC = dayBeforeLocal.toISOString();
    const todayEndUTC = dayAfterLocal.toISOString();

    const params: TasksSearchParams = {
      dueDateFrom: todayStartUTC,
      dueDateTo: todayEndUTC,
      limit: 1000,
    };

    this.tasksService.getTasks(params).subscribe({
      next: (response) => {
        // Filtrar las tareas para mostrar solo las que corresponden al día calendario local de hoy
        // Esto es necesario porque el backend puede devolver tareas de días adyacentes debido a la zona horaria
        const filteredTasks = (response.data || []).filter(task => {
          if (!task.dueDate) return false;
          
          const taskDate = typeof task.dueDate === 'string' 
            ? new Date(task.dueDate) 
            : task.dueDate;
          
          // Usar métodos locales para comparar el día calendario
          const taskYear = taskDate.getFullYear();
          const taskMonth = taskDate.getMonth();
          const taskDay = taskDate.getDate();
          
          return taskYear === year && taskMonth === month && taskDay === day;
        });
        
        this.todayTasks.set(filteredTasks);
        this.loadingTodayTasks.set(false);
      },
      error: () => {
        this.loadingTodayTasks.set(false);
        this.todayTasks.set([]);
      },
    });
  }


  /**
   * Obtiene el nombre del tablero de una tarea
   */
  getBoardNameForTask(task: Task): string {
    if (!task.boardId) return 'Sin tablero';
    const board = this.boards().find((b) => b._id === task.boardId);
    return board?.title || 'Tablero desconocido';
  }

  /**
   * Obtiene el badge class según el estado de la tarea
   */
  getTaskStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Terminada':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'En curso':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Pendiente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }

  /**
   * Navega a la vista de detalles de la tarea
   */
  viewTask(task: Task): void {
    // Extraer el boardId de la tarea
    let boardId: string;
    if (typeof task.boardId === 'string') {
      boardId = task.boardId;
    } else if (task.boardId && typeof task.boardId === 'object' && '_id' in task.boardId) {
      const boardIdObj = task.boardId as { _id?: string; title?: string };
      boardId = boardIdObj._id || '';
    } else {
      boardId = '';
    }

    if (boardId) {
      // Navegar a la vista de tareas con el boardId y luego abrir el modal de detalles
      this.router.navigate(['/tasks', boardId], { 
        queryParams: { taskId: task._id },
        replaceUrl: false 
      });
    } else {
      // Si no hay boardId, mostrar un mensaje
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Esta tarea no está asociada a un tablero',
      });
    }
  }

  /**
   * Formatea una fecha para mostrar
   */
  formatTaskDate(dateString: string | Date | undefined): string {
    if (!dateString) return '-';
    try {
      const date = dateString instanceof Date ? dateString : new Date(dateString);
      return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return typeof dateString === 'string' ? dateString : '-';
    }
  }
}
