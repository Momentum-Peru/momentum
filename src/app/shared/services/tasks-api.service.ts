import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PresignedUploadService, PresignedUrlResponse } from './presigned-upload.service';
import {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  TasksListResponse,
  TasksSearchParams,
  TaskStats,
  DragDropEvent,
} from '../interfaces/task.interface';

@Injectable({ providedIn: 'root' })
export class TasksApiService {
  private readonly http = inject(HttpClient);
  private readonly presignedUpload = inject(PresignedUploadService);
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

    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            // Para arrays (como tags), agregar cada elemento por separado
            value.forEach((item) => {
              httpParams = httpParams.append(key, item);
            });
          } else if (value instanceof Date) {
            // Para fechas, convertir a ISO string
            httpParams = httpParams.set(key, value.toISOString());
          } else {
            // Para otros valores, convertir a string
            httpParams = httpParams.set(key, String(value));
          }
        }
      });
    }
    return this.http.get<TasksListResponse>(`${this.baseUrl}/tasks`, { params: httpParams }).pipe(
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

    return this.http.patch<Task>(`${this.baseUrl}/tasks/${id}`, taskData).pipe(
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

    return this.http
      .patch<Task>(`${this.baseUrl}/tasks/${dragEvent.taskId}/status`, {
        status: dragEvent.newStatus || dragEvent.toStatus,
        position: dragEvent.newPosition,
      })
      .pipe(
        tap((updatedTask) => {
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

    const httpParams: Record<string, string> = {};
    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams[key] = String(value);
        }
      });
    }
    return this.http
      .get<TasksListResponse>(`${this.baseUrl}/tasks/search`, {
        params: httpParams,
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
   * Sube archivos a una tarea usando Presigned URLs
   */
  async uploadTaskAttachments(
    taskId: string,
    files: File[],
    uploadedBy: string,
    description?: string,
    onProgress?: (progress: number) => void
  ): Promise<Task> {
    this.setLoading(true);
    this.setError(null);

    try {
      // Paso 1: Generar Presigned URLs
      const presignedResponses: PresignedUrlResponse[] = await firstValueFrom(
        this.http.post<PresignedUrlResponse[]>(
          `${this.baseUrl}/tasks/${taskId}/attachments/presigned-urls`,
          {
            files: files.map((f) => ({
              fileName: f.name,
              contentType: f.type || 'application/octet-stream',
            })),
            expirationTime: 300, // 5 minutos
          }
        )
      );

      // Paso 2: Subir archivos directamente a S3
      const uploadPromises = presignedResponses.map(
        (presignedResponse: PresignedUrlResponse, index: number) => {
          const file = files[index];
          return this.presignedUpload
            .uploadFileToS3(
              presignedResponse.presignedUrl,
              file,
              file.type || 'application/octet-stream',
              onProgress
            )
            .then(() => presignedResponse);
        }
      );

      await Promise.all(uploadPromises);

      // Paso 3: Confirmar subida al backend
      const attachments = presignedResponses.map(
        (presignedResponse: PresignedUrlResponse, index: number) => {
          const file = files[index];
          return {
            publicUrl: presignedResponse.publicUrl,
            key: presignedResponse.key,
            originalName: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            uploadedBy,
            description,
          };
        }
      );

      const updatedTask = await firstValueFrom(
        this.http.post<Task>(`${this.baseUrl}/tasks/${taskId}/attachments/confirm`, {
          attachments,
        })
      );

      // Actualizar el estado local
      const currentTasks = this.tasks();
      const index = currentTasks.findIndex((task) => task._id === taskId);
      if (index !== -1) {
        currentTasks[index] = updatedTask;
        this.tasks.set([...currentTasks]);
        this.tasksSubject.next([...currentTasks]);
      }

      this.setLoading(false);
      return updatedTask;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Actualiza el estado de una subtarea
   */
  updateSubtaskStatus(taskId: string, subtaskId: string, completed: boolean): Observable<Task> {
    this.setLoading(true);
    this.setError(null);

    return this.http
      .patch<Task>(`${this.baseUrl}/tasks/${taskId}/subtasks/${subtaskId}`, { completed })
      .pipe(
        tap((updatedTask) => {
          const currentTasks = this.tasks();
          const index = currentTasks.findIndex((task) => task._id === taskId);
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
   * Elimina un archivo adjunto de una tarea
   */
  deleteTaskAttachment(taskId: string, attachmentId: string): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return this.http
      .delete<void>(`${this.baseUrl}/tasks/${taskId}/attachments/${attachmentId}`)
      .pipe(
        tap(() => {
          // Actualizar la tarea localmente removiendo el attachment
          const currentTasks = this.tasks();
          const index = currentTasks.findIndex((task) => task._id === taskId);
          if (index !== -1 && currentTasks[index].attachments) {
            currentTasks[index].attachments = currentTasks[index].attachments?.filter(
              (att) => att._id !== attachmentId
            );
            this.tasks.set([...currentTasks]);
            this.tasksSubject.next([...currentTasks]);
          }
        }),
        tap(() => this.setLoading(false)),
        tap({ error: (err) => this.handleError(err) })
      );
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

  private handleError(error: unknown): void {
    let errorMessage = 'Error desconocido';
    if (error && typeof error === 'object') {
      if (
        'error' in error &&
        error.error &&
        typeof error.error === 'object' &&
        'message' in error.error
      ) {
        errorMessage = String(error.error.message);
      } else if ('message' in error && typeof error.message === 'string') {
        errorMessage = error.message;
      }
    }
    this.setError(errorMessage);
    this.setLoading(false);
  }
}
