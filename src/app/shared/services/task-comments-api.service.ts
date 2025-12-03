import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TaskComment,
  CreateTaskCommentRequest,
  UpdateTaskCommentRequest,
  Task,
} from '../interfaces/task.interface';
import { PresignedUploadService, PresignedUrlResponse } from './presigned-upload.service';

@Injectable({ providedIn: 'root' })
export class TaskCommentsApiService {
  private readonly http = inject(HttpClient);
  private readonly presignedUpload = inject(PresignedUploadService);
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
   * Sube archivos asociados a un comentario (info) usando Presigned URLs
   */
  async uploadCommentFiles(
    taskId: string,
    infoId: string,
    files: File[],
    uploadedBy: string,
    onProgress?: (progress: number) => void
  ): Promise<Task> {
    this.setLoading(true);
    this.setError(null);

    try {
      // Paso 1: Generar Presigned URLs
      const presignedResponses: PresignedUrlResponse[] = await firstValueFrom(
        this.presignedUpload.generateMultiplePresignedUrls(
          files.map((f) => ({
            fileName: f.name,
            contentType: f.type || 'application/octet-stream',
          })),
          300 // 5 minutos
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
          };
        }
      );

      const result = await firstValueFrom(
        this.http.post<Task>(`${this.baseUrl}/tasks/${taskId}/info/${infoId}/attachments/confirm`, {
          attachments,
        })
      );

      this.setLoading(false);
      return result;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Sube archivos adjuntos directamente a una tarea usando Presigned URLs
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

      const result = await firstValueFrom(
        this.http.post<Task>(`${this.baseUrl}/tasks/${taskId}/attachments/confirm`, { attachments })
      );

      this.setLoading(false);
      return result;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
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
