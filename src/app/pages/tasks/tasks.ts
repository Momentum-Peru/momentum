import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Components
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

// PrimeNG Services
import { ConfirmationService, MessageService } from 'primeng/api';

// Services
import { BoardsApiService } from '../../shared/services/boards-api.service';
import { TasksApiService } from '../../shared/services/tasks-api.service';
import { AuthService } from '../login/services/auth.service';

// Components
import { BoardListComponent } from './components/board-list/board-list';
import { BoardFormComponent } from './components/board-form/board-form';
import { BoardInviteComponent } from './components/board-invite/board-invite';
import { BoardViewComponent } from './components/board-view/board-view';
import { NativeTaskFormComponent } from './components/native-task-form/native-task-form';
import { TaskDetailsComponent } from './components/task-details/task-details';
import { BoardInvitationsComponent } from './components/board-invitations/board-invitations';

// Interfaces
import {
  Board,
  CreateBoardRequest,
  UpdateBoardRequest,
  InviteUserRequest,
} from '../../shared/interfaces/board.interface';
import { Task, DragDropEvent } from '../../shared/interfaces/task.interface';

/**
 * Componente principal de gestión de tareas con tableros
 * Principio de Responsabilidad Única: Coordina la vista de tableros y tareas
 */
@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    ProgressSpinnerModule,
    MessageModule,
    ConfirmDialogModule,
    ToastModule,
    TooltipModule,
    BoardListComponent,
    BoardFormComponent,
    BoardInviteComponent,
    BoardViewComponent,
    NativeTaskFormComponent,
    TaskDetailsComponent,
    BoardInvitationsComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './tasks.html',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class TasksPage implements OnInit {
  public readonly boardsService = inject(BoardsApiService);
  public readonly tasksService = inject(TasksApiService);
  private readonly authService = inject(AuthService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  // Signals
  public readonly showBoardForm = signal<boolean>(false);
  public readonly showBoardInvite = signal<boolean>(false);
  public readonly showTaskForm = signal<boolean>(false);
  public readonly showTaskDetails = signal<boolean>(false);
  public readonly showBoardInvitations = signal<boolean>(false);
  public readonly selectedBoard = signal<Board | null>(null);
  public readonly selectedTask = signal<Task | null>(null);
  public readonly isEditingBoard = signal<boolean>(false);
  public readonly isEditingTask = signal<boolean>(false);
  public readonly boardFormLoading = signal<boolean>(false);
  public readonly boardInviteLoading = signal<boolean>(false);
  public readonly editingBoardFromList = signal<Board | null>(null);
  public readonly invitingBoardFromList = signal<Board | null>(null);

  // Computed
  public readonly currentUserId = computed(() => {
    const user = this.authService.getCurrentUser();
    return user?.id || '';
  });

  public readonly tasksByStatus = computed(() => {
    const tasks = this.tasksService.tasks();
    const boardId = this.selectedBoard()?._id;

    // Helper para obtener el ID del boardId (puede ser string o objeto populado)
    const getBoardId = (boardIdValue: string | { _id: string } | undefined): string | undefined => {
      if (!boardIdValue) return undefined;
      if (typeof boardIdValue === 'string') return boardIdValue;
      if (typeof boardIdValue === 'object' && '_id' in boardIdValue) {
        return String(boardIdValue._id);
      }
      return undefined;
    };

    const filteredTasks = boardId
      ? tasks.filter((task) => {
          const taskBoardId = getBoardId(task.boardId);
          return taskBoardId === boardId;
        })
      : [];

    return {
      pending: filteredTasks.filter((task) => task.status === 'Pendiente'),
      inProgress: filteredTasks.filter((task) => task.status === 'En curso'),
      completed: filteredTasks.filter((task) => task.status === 'Terminada'),
    };
  });

  public readonly taskStats = computed(() => {
    const tasks = this.tasksService.tasks();
    const boardId = this.selectedBoard()?._id;

    // Helper para obtener el ID del boardId (puede ser string o objeto populado)
    const getBoardId = (boardIdValue: string | { _id: string } | undefined): string | undefined => {
      if (!boardIdValue) return undefined;
      if (typeof boardIdValue === 'string') return boardIdValue;
      if (typeof boardIdValue === 'object' && '_id' in boardIdValue) {
        return String(boardIdValue._id);
      }
      return undefined;
    };

    const filteredTasks = boardId
      ? tasks.filter((task) => {
          const taskBoardId = getBoardId(task.boardId);
          return taskBoardId === boardId;
        })
      : [];
    const now = new Date();

    return {
      total: filteredTasks.length,
      pending: filteredTasks.filter((task) => task.status === 'Pendiente').length,
      inProgress: filteredTasks.filter((task) => task.status === 'En curso').length,
      completed: filteredTasks.filter((task) => task.status === 'Terminada').length,
      overdue: filteredTasks.filter(
        (task) => task.dueDate && new Date(task.dueDate) < now && task.status !== 'Terminada'
      ).length,
    };
  });

  public readonly isBoardOwner = computed(() => {
    const board = this.selectedBoard();
    const userId = this.currentUserId();
    return board ? board.owner._id === userId : false;
  });

  public readonly existingMemberIds = computed(() => {
    const board = this.invitingBoardFromList() || this.selectedBoard();
    if (!board) return [];
    return [board.owner._id, ...board.members.map((m) => m._id)];
  });

  public readonly pendingInvitations = signal<Board[]>([]);

  public readonly pendingInvitationsCount = computed(() => {
    return this.pendingInvitations().length;
  });

  constructor() {
    // Efecto para manejar el cierre del formulario de tablero
    effect(() => {
      if (!this.showBoardForm()) {
        this.isEditingBoard.set(false);
      }
    });

    // Efecto para manejar el cierre del formulario de tarea
    effect(() => {
      if (!this.showTaskForm()) {
        this.selectedTask.set(null);
        this.isEditingTask.set(false);
      }
    });
  }

  ngOnInit(): void {
    this.loadBoards();
    this.loadPendingInvitations();
  }

  /**
   * Carga los tableros del usuario
   */
  private loadBoards(): void {
    this.boardsService.getAll().subscribe({
      next: () => {
        // Tableros cargados exitosamente
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los tableros',
        });
      },
    });
  }

  /**
   * Carga las invitaciones pendientes
   */
  private loadPendingInvitations(): void {
    this.boardsService.getPendingInvitations().subscribe({
      next: (boards) => {
        this.pendingInvitations.set(boards || []);
      },
      error: () => {
        // Error silencioso, no es crítico
        this.pendingInvitations.set([]);
      },
    });
  }

  /**
   * Refresca la lista de tableros
   */
  public refreshBoards(): void {
    this.boardsService.refresh();
  }

  /**
   * Abre el formulario de tablero
   */
  public openBoardForm(board?: Board): void {
    if (board) {
      // Si ya estamos viendo este tablero, mantener el selectedBoard actual
      // Solo establecer el flag de edición
      const currentBoard = this.selectedBoard();
      if (!currentBoard || currentBoard._id !== board._id) {
        this.selectedBoard.set(board);
      }
      this.isEditingBoard.set(true);
    } else {
      // Solo resetear selectedBoard si no estamos en la vista de un tablero
      if (!this.selectedBoard()) {
        this.selectedBoard.set(null);
      }
      this.isEditingBoard.set(false);
    }
    this.showBoardForm.set(true);
  }

  /**
   * Abre el formulario de tablero desde la lista (sin cambiar selectedBoard)
   */
  public openBoardFormFromList(board: Board): void {
    // Guardar temporalmente el board para el formulario sin cambiar selectedBoard
    // para evitar que se muestre la vista del tablero
    this.editingBoardFromList.set(board);
    this.isEditingBoard.set(true);
    this.showBoardForm.set(true);
  }

  /**
   * Cierra el formulario de tablero
   */
  public closeBoardForm(): void {
    this.showBoardForm.set(false);
    // Limpiar el board temporal si se estaba editando desde la lista
    this.editingBoardFromList.set(null);
  }

  /**
   * Maneja el guardado de tableros
   */
  public onBoardSave(data: CreateBoardRequest | UpdateBoardRequest): void {
    this.boardFormLoading.set(true);

    const board = this.editingBoardFromList() || this.selectedBoard();
    const wasEditing = !!board;
    const boardId = board?._id;

    const operation = board
      ? this.boardsService.update(board._id, data as UpdateBoardRequest)
      : this.boardsService.create(data as CreateBoardRequest);

    operation.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: board ? 'Tablero actualizado' : 'Tablero creado',
        });
        this.closeBoardForm();
        this.refreshBoards();

        // Si estábamos editando un tablero y estamos en su vista, mantenerlo seleccionado
        if (wasEditing && boardId && this.selectedBoard()?._id === boardId) {
          // Recargar el tablero actualizado para mantener la vista
          this.boardsService.getById(boardId).subscribe({
            next: (refreshedBoard) => {
              this.selectedBoard.set(refreshedBoard);
              this.loadBoardTasks(boardId);
            },
          });
        }

        this.boardFormLoading.set(false);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.error?.message || 'Error al guardar el tablero',
        });
        this.boardFormLoading.set(false);
      },
    });
  }

  /**
   * Maneja la visualización de un tablero
   */
  public onViewBoard(board: Board): void {
    this.selectedBoard.set(board);
    this.loadBoardTasks(board._id);
  }

  /**
   * Carga las tareas de un tablero
   */
  private loadBoardTasks(boardId: string): void {
    this.tasksService.getTasks({ boardId }).subscribe({
      next: () => {
        // Tareas cargadas exitosamente
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las tareas del tablero',
        });
      },
    });
  }

  /**
   * Refresca el tablero actual y sus tareas
   */
  public onRefreshBoard(): void {
    const board = this.selectedBoard();
    if (!board) return;

    // Recargar el tablero
    this.boardsService.getById(board._id).subscribe({
      next: (refreshedBoard) => {
        this.selectedBoard.set(refreshedBoard);
        this.loadBoardTasks(board._id);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el tablero',
        });
      },
    });
  }

  /**
   * Vuelve a la lista de tableros
   */
  public onBackToBoards(): void {
    this.selectedBoard.set(null);
    this.tasksService.clearState();
  }

  /**
   * Abre el formulario de invitación
   */
  public openBoardInvite(): void {
    this.showBoardInvite.set(true);
  }

  /**
   * Abre el formulario de invitación desde la lista (sin cambiar selectedBoard)
   */
  public openBoardInviteFromList(board: Board): void {
    // Guardar temporalmente el board para la invitación sin cambiar selectedBoard
    // para evitar que se muestre la vista del tablero
    this.invitingBoardFromList.set(board);
    this.showBoardInvite.set(true);
  }

  /**
   * Cierra el formulario de invitación
   */
  public closeBoardInvite(): void {
    this.showBoardInvite.set(false);
    // Limpiar el board temporal si se estaba invitando desde la lista
    this.invitingBoardFromList.set(null);
  }

  /**
   * Maneja la invitación de usuarios
   */
  public onInviteUser(data: InviteUserRequest): void {
    const board = this.invitingBoardFromList() || this.selectedBoard();
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
        if (this.selectedBoard()) {
          this.boardsService.getById(this.selectedBoard()!._id).subscribe();
        }
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
   * Confirma la eliminación de un tablero
   */
  public confirmDeleteBoard(board: Board): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que quieres eliminar el tablero "${board.title}"? Se desasociarán todas sus tareas.`,
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
          detail: 'Tablero eliminado',
        });
        if (this.selectedBoard()?._id === boardId) {
          this.onBackToBoards();
        }
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
   * Abre el formulario de tarea
   */
  public openTaskForm(task?: Task): void {
    if (task) {
      this.selectedTask.set(task);
      this.isEditingTask.set(true);
    } else {
      this.selectedTask.set(null);
      this.isEditingTask.set(false);
    }
    this.showTaskForm.set(true);
  }

  /**
   * Cierra el formulario de tarea
   */
  public closeTaskForm(): void {
    this.showTaskForm.set(false);
  }

  /**
   * Maneja el guardado de tareas
   */
  public onTaskSave(): void {
    this.closeTaskForm();
    const board = this.selectedBoard();
    if (board) {
      this.loadBoardTasks(board._id);
    }
  }

  /**
   * Maneja el cambio de estado de tareas (drag and drop)
   */
  public onTaskStatusChanged(event: DragDropEvent): void {
    this.tasksService.updateTaskStatus(event).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Tarea movida a ${event.newStatus}`,
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el estado de la tarea',
        });
        const board = this.selectedBoard();
        if (board) {
          this.loadBoardTasks(board._id);
        }
      },
    });
  }

  /**
   * Confirma la eliminación de una tarea
   */
  public confirmDeleteTask(task: Task): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que quieres eliminar la tarea "${task.title}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.deleteTask(task._id);
      },
    });
  }

  /**
   * Elimina una tarea
   */
  private deleteTask(taskId: string): void {
    this.tasksService.deleteTask(taskId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Tarea eliminada',
        });
        const board = this.selectedBoard();
        if (board) {
          this.loadBoardTasks(board._id);
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar la tarea',
        });
      },
    });
  }

  /**
   * Muestra los detalles de una tarea
   */
  public viewTaskDetails(task: Task): void {
    this.selectedTask.set(task);
    this.showTaskDetails.set(true);
  }

  /**
   * Cierra los detalles de la tarea
   */
  public closeTaskDetails(): void {
    this.showTaskDetails.set(false);
    this.selectedTask.set(null);
  }

  /**
   * Abre el diálogo de invitaciones pendientes
   */
  public openBoardInvitations(): void {
    this.loadPendingInvitations();
    this.showBoardInvitations.set(true);
  }

  /**
   * Cierra el diálogo de invitaciones pendientes
   */
  public closeBoardInvitations(): void {
    this.showBoardInvitations.set(false);
  }

  /**
   * Maneja cuando se acepta una invitación
   */
  public onInvitationAccepted(board: Board): void {
    this.refreshBoards();
    this.loadPendingInvitations();
    // Si el tablero aceptado es el seleccionado, recargarlo
    if (this.selectedBoard()?._id === board._id) {
      this.boardsService.getById(board._id).subscribe({
        next: (updatedBoard) => {
          this.selectedBoard.set(updatedBoard);
          this.loadBoardTasks(board._id);
        },
      });
    }
  }

  /**
   * Maneja cuando se rechaza una invitación
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public onInvitationRejected(_board: Board): void {
    // Solo refrescar la lista de tableros
    this.refreshBoards();
    this.loadPendingInvitations();
  }
}
