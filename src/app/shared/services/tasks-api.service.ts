import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  TasksListResponse,
  TasksSearchParams,
  TaskStats,
  TaskStatus,
  DragDropEvent,
} from '../interfaces/task.interface';

@Injectable({ providedIn: 'root' })
export class TasksApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // Signals para el estado reactivo
  private readonly tasksSubject = new BehaviorSubject<Task[]>([]);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  // Signals públicos
  public readonly tasks = signal<Task[]>([]);
  public readonly loading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);

  // Computed signals
  public readonly tasksByStatus = computed(() => {
    const allTasks = this.tasks() || [];
    return {
      pending: allTasks.filter((task) => task.status === 'Pendiente'),
      inProgress: allTasks.filter((task) => task.status === 'En curso'),
      completed: allTasks.filter((task) => task.status === 'Terminada'),
    };
  });

  public readonly taskStats = computed(() => {
    const allTasks = this.tasks() || [];
    const now = new Date();

    return {
      total: allTasks.length,
      pending: allTasks.filter((task) => task.status === 'Pendiente').length,
      inProgress: allTasks.filter((task) => task.status === 'En curso').length,
      completed: allTasks.filter((task) => task.status === 'Terminada').length,
      overdue: allTasks.filter(
        (task) => task.dueDate && new Date(task.dueDate) < now && task.status !== 'Terminada'
      ).length,
    };
  });

  /**
   * Obtiene todas las tareas
   */
  getTasks(params?: TasksSearchParams): Observable<TasksListResponse> {
    this.setLoading(true);
    this.setError(null);

    return this.http
      .get<TasksListResponse>(`${this.baseUrl}/tasks`, { params: params as any })
      .pipe(
        tap((response) => {
          this.tasks.set(response.data || []);
          this.tasksSubject.next(response.data);
        }),
        tap(() => this.setLoading(false)),
        tap({ error: (err) => this.handleError(err) })
      );
  }

  /**
   * Obtiene una tarea por ID
   */
  getTaskById(id: string): Observable<Task> {
    this.setLoading(true);
    this.setError(null);

    return this.http.get<Task>(`${this.baseUrl}/tasks/${id}`).pipe(
      tap(() => this.setLoading(false)),
      tap({ error: (err) => this.handleError(err) })
    );
  }

  /**
   * Crea una nueva tarea
   */
  createTask(taskData: CreateTaskRequest): Observable<Task> {
    this.setLoading(true);
    this.setError(null);

    return this.http.post<Task>(`${this.baseUrl}/tasks`, taskData).pipe(
      tap((newTask) => {
        const currentTasks = this.tasks();
        this.tasks.set([...currentTasks, newTask]);
        this.tasksSubject.next([...currentTasks, newTask]);
      }),
      tap(() => this.setLoading(false)),
      tap({ error: (err) => this.handleError(err) })
    );
  }

  /**
   * Actualiza una tarea existente
   */
  updateTask(id: string, taskData: UpdateTaskRequest): Observable<Task> {
    this.setLoading(true);
    this.setError(null);

    return this.http.put<Task>(`${this.baseUrl}/tasks/${id}`, taskData).pipe(
      tap((updatedTask) => {
        const currentTasks = this.tasks();
        const index = currentTasks.findIndex((task) => task._id === id);
        if (index !== -1) {
          currentTasks[index] = updatedTask;
          this.tasks.set([...currentTasks]);
          this.tasksSubject.next([...currentTasks]);
        }
      }),
      tap(() => this.setLoading(false)),
      tap({ error: (err) => this.handleError(err) })
    );
  }

  /**
   * Actualiza el estado de una tarea (para drag & drop)
   */
  updateTaskStatus(dragEvent: DragDropEvent): Observable<Task> {
    this.setLoading(true);
    this.setError(null);

    console.log('🔄 Actualizando estado de tarea en servicio:', {
      taskId: dragEvent.taskId,
      newStatus: dragEvent.newStatus,
      toStatus: dragEvent.toStatus,
    });

    return this.http
      .patch<Task>(`${this.baseUrl}/tasks/${dragEvent.taskId}/status`, {
        status: dragEvent.newStatus || dragEvent.toStatus,
        position: dragEvent.newPosition,
      })
      .pipe(
        tap((updatedTask) => {
          console.log('✅ Tarea actualizada en servicio:', updatedTask);
          const currentTasks = this.tasks();
          const index = currentTasks.findIndex((task) => task._id === dragEvent.taskId);
          if (index !== -1) {
            currentTasks[index] = updatedTask;
            this.tasks.set([...currentTasks]);
            this.tasksSubject.next([...currentTasks]);
          }
        }),
        tap(() => this.setLoading(false)),
        tap({ error: (err) => this.handleError(err) })
      );
  }

  /**
   * Elimina una tarea
   */
  deleteTask(id: string): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return this.http.delete<void>(`${this.baseUrl}/tasks/${id}`).pipe(
      tap(() => {
        const currentTasks = this.tasks();
        const filteredTasks = currentTasks.filter((task) => task._id !== id);
        this.tasks.set(filteredTasks);
        this.tasksSubject.next(filteredTasks);
      }),
      tap(() => this.setLoading(false)),
      tap({ error: (err) => this.handleError(err) })
    );
  }

  /**
   * Obtiene estadísticas de tareas
   */
  getTaskStats(): Observable<TaskStats> {
    return this.http.get<TaskStats>(`${this.baseUrl}/tasks/stats`);
  }

  /**
   * Busca tareas con filtros avanzados
   */
  searchTasks(searchParams: TasksSearchParams): Observable<TasksListResponse> {
    this.setLoading(true);
    this.setError(null);

    return this.http
      .get<TasksListResponse>(`${this.baseUrl}/tasks/search`, {
        params: searchParams as any,
      })
      .pipe(
        tap((response) => {
          this.tasks.set(response.data || []);
          this.tasksSubject.next(response.data);
        }),
        tap(() => this.setLoading(false)),
        tap({ error: (err) => this.handleError(err) })
      );
  }

  /**
   * Refresca la lista de tareas
   */
  refreshTasks(): void {
    this.getTasks().subscribe();
  }

  /**
   * Limpia el estado del servicio
   */
  clearState(): void {
    this.tasks.set([]);
    this.tasksSubject.next([]);
    this.setLoading(false);
    this.setError(null);
  }

  // Métodos privados para manejo de estado
  private setLoading(loading: boolean): void {
    this.loading.set(loading);
    this.loadingSubject.next(loading);
  }

  private setError(error: string | null): void {
    this.error.set(error);
    this.errorSubject.next(error);
  }

  private handleError(error: any): void {
    const errorMessage = error?.error?.message || error?.message || 'Error desconocido';
    this.setError(errorMessage);
    this.setLoading(false);
  }
}
