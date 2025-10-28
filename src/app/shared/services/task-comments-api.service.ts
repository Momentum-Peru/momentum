import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TaskComment,
  CreateTaskCommentRequest,
  UpdateTaskCommentRequest,
  TaskFile,
  Task,
} from '../interfaces/task.interface';

@Injectable({ providedIn: 'root' })
export class TaskCommentsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // Signals para el estado reactivo
  public readonly loading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);

  /**
   * Obtiene todos los comentarios de una tarea
   */
  getTaskComments(taskId: string): Observable<TaskComment[]> {
    this.setLoading(true);
    this.setError(null);

    return this.http.get<TaskComment[]>(`${this.baseUrl}/tasks/${taskId}/info`).pipe(
      tap(() => this.setLoading(false)),
      tap({ error: (err) => this.handleError(err) })
    );
  }

  /**
   * Crea un nuevo comentario
   */
  createComment(commentData: CreateTaskCommentRequest): Observable<Task> {
    this.setLoading(true);
    this.setError(null);

    const payload = {
      content: commentData.content,
      createdBy: commentData.createdBy,
    };

    return this.http.post<Task>(`${this.baseUrl}/tasks/${commentData.taskId}/info`, payload).pipe(
      tap(() => this.setLoading(false)),
      tap({ error: (err) => this.handleError(err) })
    );
  }

  /**
   * Actualiza un comentario existente
   */
  updateComment(
    taskId: string,
    commentId: string,
    commentData: UpdateTaskCommentRequest
  ): Observable<TaskComment> {
    this.setLoading(true);
    this.setError(null);

    return this.http
      .put<TaskComment>(`${this.baseUrl}/tasks/${taskId}/info/${commentId}`, commentData)
      .pipe(
        tap(() => this.setLoading(false)),
        tap({ error: (err) => this.handleError(err) })
      );
  }

  /**
   * Elimina un comentario
   */
  deleteComment(taskId: string, commentId: string): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return this.http.delete<void>(`${this.baseUrl}/tasks/${taskId}/comments/${commentId}`).pipe(
      tap(() => this.setLoading(false)),
      tap({ error: (err) => this.handleError(err) })
    );
  }

  /**
   * Sube un archivo asociado a un comentario
   */
  uploadCommentFile(taskId: string, commentId: string, file: File): Observable<TaskFile> {
    this.setLoading(true);
    this.setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('commentId', commentId);

    return this.http.post<TaskFile>(`${this.baseUrl}/tasks/${taskId}/files`, formData).pipe(
      tap(() => this.setLoading(false)),
      tap({ error: (err) => this.handleError(err) })
    );
  }

  /**
   * Sube un archivo asociado directamente a una tarea
   */
  uploadTaskFile(taskId: string, file: File): Observable<TaskFile> {
    this.setLoading(true);
    this.setError(null);

    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<TaskFile>(`${this.baseUrl}/tasks/${taskId}/files`, formData).pipe(
      tap(() => this.setLoading(false)),
      tap({ error: (err) => this.handleError(err) })
    );
  }

  /**
   * Elimina un archivo
   */
  deleteFile(taskId: string, fileId: string): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return this.http.delete<void>(`${this.baseUrl}/tasks/${taskId}/files/${fileId}`).pipe(
      tap(() => this.setLoading(false)),
      tap({ error: (err) => this.handleError(err) })
    );
  }

  /**
   * Descarga un archivo
   */
  downloadFile(taskId: string, fileId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/tasks/${taskId}/files/${fileId}/download`, {
      responseType: 'blob',
    });
  }

  /**
   * Obtiene la URL de descarga de un archivo
   */
  getFileDownloadUrl(taskId: string, fileId: string): string {
    return `${this.baseUrl}/tasks/${taskId}/files/${fileId}/download`;
  }

  // Métodos privados para manejo de estado
  private setLoading(loading: boolean): void {
    this.loading.set(loading);
  }

  private setError(error: string | null): void {
    this.error.set(error);
  }

  private handleError(error: any): void {
    const errorMessage = error?.error?.message || error?.message || 'Error desconocido';
    this.setError(errorMessage);
    this.setLoading(false);
  }
}
