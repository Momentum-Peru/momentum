import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, timeout, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DailyReport } from '../interfaces/daily-report.interface';

interface DailyReportStats {
  total: number;
  byProject: { projectId: string; projectName: string; count: number }[];
  byUser: { userId: string; userName: string; count: number }[];
  byDate: { date: string; count: number }[];
}

/**
 * Interfaces para Presigned URLs
 */
export interface PresignedUrlRequest {
  fileName: string;
  contentType: string;
  expirationTime?: number;
}

export interface PresignedUrlResponse {
  presignedUrl: string;
  publicUrl: string;
  key: string;
}

@Injectable({
  providedIn: 'root',
})
export class DailyExpensesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<DailyReport[]> {
    return this.http.get<DailyReport[]>(`${this.baseUrl}/daily-reports`);
  }

  getStats(filters?: {
    userId?: string;
    projectId?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<DailyReportStats> {
    let url = `${this.baseUrl}/daily-reports/stats`;
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.projectId) params.append('projectId', filters.projectId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (params.toString()) url += `?${params.toString()}`;
    return this.http.get<DailyReportStats>(url);
  }

  listWithFilters(filters?: {
    userId?: string;
    projectId?: string;
    startDate?: string;
    endDate?: string;
    q?: string;
    tenantId?: string; // Para filtrar por empresa (rol gerencia)
  }): Observable<DailyReport[]> {
    let url = `${this.baseUrl}/daily-reports`;
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.projectId) params.append('projectId', filters.projectId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.q) params.append('q', filters.q);
    if (filters?.tenantId) params.append('tenantId', filters.tenantId);
    if (params.toString()) url += `?${params.toString()}`;
    return this.http.get<DailyReport[]>(url);
  }

  getByUser(
    userId: string,
    filters?: { startDate?: string; endDate?: string }
  ): Observable<DailyReport[]> {
    let url = `${this.baseUrl}/daily-reports/user/${userId}`;
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (params.toString()) url += `?${params.toString()}`;
    return this.http.get<DailyReport[]>(url);
  }

  getByProject(
    projectId: string,
    filters?: { startDate?: string; endDate?: string }
  ): Observable<DailyReport[]> {
    let url = `${this.baseUrl}/daily-reports/project/${projectId}`;
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (params.toString()) url += `?${params.toString()}`;
    return this.http.get<DailyReport[]>(url);
  }

  getById(id: string): Observable<DailyReport> {
    return this.http.get<DailyReport>(`${this.baseUrl}/daily-reports/${id}`);
  }

  create(report: DailyReport): Observable<DailyReport> {
    return this.http.post<DailyReport>(`${this.baseUrl}/daily-reports`, report);
  }

  update(id: string, report: Partial<DailyReport>): Observable<DailyReport> {
    return this.http.patch<DailyReport>(`${this.baseUrl}/daily-reports/${id}`, report);
  }

  delete(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/daily-reports/${id}`);
  }

  /**
   * Subir documento a observación
   */
  /**
   * Subida de archivos al reporte (según API)
   */
  /**
   * @deprecated Usar generateDocumentPresignedUrl + uploadFileToS3 + confirmDocumentUpload
   * Mantenido solo para compatibilidad temporal
   */
  uploadDocument(reportId: string, file: File): Observable<DailyReport> {
    console.warn('uploadDocument está deprecado. Usar Presigned URLs en su lugar.');
    const formData = new FormData();
    formData.append('file', file);

    // Calcular timeout basado en el tamaño del archivo
    const fileSizeMB = file.size / (1024 * 1024);
    const timeoutMs = Math.max(30000, 30000 + fileSizeMB * 5000); // Mínimo 30s, +5s por MB
    const maxTimeout = 300000; // Máximo 5 minutos
    const finalTimeout = Math.min(timeoutMs, maxTimeout);

    return this.http
      .post<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/documents`, formData, {
        headers: new HttpHeaders({}),
        reportProgress: false,
      })
      .pipe(
        timeout(finalTimeout),
        catchError((error) => {
          console.error('Error en uploadDocument:', { fileName: file.name, error });
          return throwError(() => error);
        })
      );
  }

  deleteDocument(reportId: string, documentUrl: string): Observable<DailyReport> {
    return this.http.delete<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/documents`, {
      body: { documentUrl },
    });
  }

  uploadAudio(reportId: string, file: File): Observable<DailyReport> {
    const formData = new FormData();
    formData.append('file', file);

    // Calcular timeout basado en el tamaño del archivo
    const fileSizeMB = file.size / (1024 * 1024);
    const timeoutMs = Math.max(30000, 30000 + fileSizeMB * 5000); // Mínimo 30s, +5s por MB
    const maxTimeout = 300000; // Máximo 5 minutos
    const finalTimeout = Math.min(timeoutMs, maxTimeout);

    return this.http
      .post<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/audio`, formData, {
        headers: new HttpHeaders({}),
        reportProgress: false,
      })
      .pipe(
        timeout(finalTimeout),
        catchError((error) => {
          console.error('Error en uploadAudio:', { fileName: file.name, error });
          return throwError(() => error);
        })
      );
  }

  uploadVideo(reportId: string, file: File): Observable<DailyReport> {
    const formData = new FormData();
    formData.append('file', file);

    // Calcular timeout basado en el tamaño del archivo
    const fileSizeMB = file.size / (1024 * 1024);
    const timeoutMs = Math.max(60000, 60000 + fileSizeMB * 10000); // Mínimo 60s, +10s por MB (videos son más grandes)
    const maxTimeout = 600000; // Máximo 10 minutos para videos
    const finalTimeout = Math.min(timeoutMs, maxTimeout);

    return this.http
      .post<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/video`, formData, {
        headers: new HttpHeaders({}),
        reportProgress: false,
      })
      .pipe(
        timeout(finalTimeout),
        catchError((error) => {
          console.error('Error en uploadVideo:', { fileName: file.name, error });
          return throwError(() => error);
        })
      );
  }

  /**
   * @deprecated Usar generatePhotoPresignedUrl + uploadFileToS3 + confirmPhotoUpload
   * Mantenido solo para compatibilidad temporal
   */
  uploadPhoto(reportId: string, file: File): Observable<DailyReport> {
    console.warn('uploadPhoto está deprecado. Usar Presigned URLs en su lugar.');
    const formData = new FormData();
    formData.append('file', file);

    // Calcular timeout basado en el tamaño del archivo
    const fileSizeMB = file.size / (1024 * 1024);
    const timeoutMs = Math.max(30000, 30000 + fileSizeMB * 5000); // Mínimo 30s, +5s por MB
    const maxTimeout = 300000; // Máximo 5 minutos
    const finalTimeout = Math.min(timeoutMs, maxTimeout);

    return this.http
      .post<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/photo`, formData, {
        headers: new HttpHeaders({}),
        reportProgress: false,
      })
      .pipe(
        timeout(finalTimeout),
        catchError((error) => {
          console.error('Error en uploadPhoto:', { fileName: file.name, error });
          return throwError(() => error);
        })
      );
  }

  deleteAudio(reportId: string, audioUrl: string): Observable<DailyReport> {
    return this.http.delete<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/audio`, {
      body: { audioUrl },
    });
  }

  deleteVideo(reportId: string, videoUrl: string): Observable<DailyReport> {
    return this.http.delete<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/video`, {
      body: { videoUrl },
    });
  }

  deletePhoto(reportId: string, photoUrl: string): Observable<DailyReport> {
    return this.http.delete<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/photo`, {
      body: { photoUrl },
    });
  }

  // ============================================
  // MÉTODOS PARA PRESIGNED URLS (Subida directa a S3)
  // ============================================

  /**
   * Genera una Presigned URL para subir un video directamente a S3
   * @param reportId ID del reporte
   * @param fileName Nombre del archivo
   * @param contentType Tipo MIME del archivo
   * @param expirationTime Tiempo de expiración en segundos (opcional, default: 3600)
   * @returns Observable con la Presigned URL y URL pública
   */
  generateVideoPresignedUrl(
    reportId: string,
    fileName: string,
    contentType: string,
    expirationTime?: number
  ): Observable<PresignedUrlResponse> {
    const body: PresignedUrlRequest = {
      fileName,
      contentType,
      ...(expirationTime && { expirationTime }),
    };

    return this.http.post<PresignedUrlResponse>(
      `${this.baseUrl}/daily-reports/${reportId}/video/presigned-url`,
      body
    );
  }

  /**
   * Genera múltiples Presigned URLs para subir varios videos
   * @param reportId ID del reporte
   * @param files Array de objetos con fileName y contentType
   * @param expirationTime Tiempo de expiración en segundos (opcional)
   * @returns Observable con array de Presigned URLs
   */
  generateMultipleVideoPresignedUrls(
    reportId: string,
    files: { fileName: string; contentType: string }[],
    expirationTime?: number
  ): Observable<PresignedUrlResponse[]> {
    const body: {
      files: PresignedUrlRequest[];
      expirationTime?: number;
    } = {
      files: files.map((f) => ({
        fileName: f.fileName,
        contentType: f.contentType,
      })),
      ...(expirationTime && { expirationTime }),
    };

    return this.http.post<PresignedUrlResponse[]>(
      `${this.baseUrl}/daily-reports/${reportId}/video/presigned-urls`,
      body
    );
  }

  /**
   * Confirma la subida de un video y lo agrega al reporte
   * Debe llamarse después de subir el archivo a S3 usando la Presigned URL
   * @param reportId ID del reporte
   * @param videoUrl URL pública del video en S3
   * @returns Observable con el reporte actualizado
   */
  confirmVideoUpload(reportId: string, videoUrl: string): Observable<DailyReport> {
    return this.http.post<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/video/confirm`, {
      videoUrl,
    });
  }

  /**
   * Genera una Presigned URL para subir un audio directamente a S3
   * @param reportId ID del reporte
   * @param fileName Nombre del archivo
   * @param contentType Tipo MIME del archivo
   * @param expirationTime Tiempo de expiración en segundos (opcional, default: 3600)
   * @returns Observable con la Presigned URL y URL pública
   */
  generateAudioPresignedUrl(
    reportId: string,
    fileName: string,
    contentType: string,
    expirationTime?: number
  ): Observable<PresignedUrlResponse> {
    const body: PresignedUrlRequest = {
      fileName,
      contentType,
      ...(expirationTime && { expirationTime }),
    };

    return this.http.post<PresignedUrlResponse>(
      `${this.baseUrl}/daily-reports/${reportId}/audio/presigned-url`,
      body
    );
  }

  /**
   * Genera múltiples Presigned URLs para subir varios audios
   * @param reportId ID del reporte
   * @param files Array de objetos con fileName y contentType
   * @param expirationTime Tiempo de expiración en segundos (opcional)
   * @returns Observable con array de Presigned URLs
   */
  generateMultipleAudioPresignedUrls(
    reportId: string,
    files: { fileName: string; contentType: string }[],
    expirationTime?: number
  ): Observable<PresignedUrlResponse[]> {
    const body: {
      files: PresignedUrlRequest[];
      expirationTime?: number;
    } = {
      files: files.map((f) => ({
        fileName: f.fileName,
        contentType: f.contentType,
      })),
      ...(expirationTime && { expirationTime }),
    };

    return this.http.post<PresignedUrlResponse[]>(
      `${this.baseUrl}/daily-reports/${reportId}/audio/presigned-urls`,
      body
    );
  }

  /**
   * Confirma la subida de un audio y lo agrega al reporte
   * Debe llamarse después de subir el archivo a S3 usando la Presigned URL
   * @param reportId ID del reporte
   * @param audioUrl URL pública del audio en S3
   * @returns Observable con el reporte actualizado
   */
  confirmAudioUpload(reportId: string, audioUrl: string): Observable<DailyReport> {
    return this.http.post<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/audio/confirm`, {
      audioUrl,
    });
  }

  // ============================================
  // PRESIGNED URLS PARA PHOTOS
  // ============================================

  /**
   * Genera una Presigned URL para subir una foto
   */
  generatePhotoPresignedUrl(
    reportId: string,
    fileName: string,
    contentType: string,
    expirationTime?: number
  ): Observable<PresignedUrlResponse> {
    // Timeout de 60 segundos (aumentado para archivos grandes, aunque solo envía metadata)
    // El timeout es solo por seguridad, la llamada debería ser instantánea
    return this.http
      .post<PresignedUrlResponse>(`${this.baseUrl}/daily-reports/${reportId}/photo/presigned-url`, {
        fileName,
        contentType,
        ...(expirationTime && { expirationTime }),
      })
      .pipe(timeout(60000));
  }

  /**
   * Genera múltiples Presigned URLs para subir varias fotos
   */
  generateMultiplePhotoPresignedUrls(
    reportId: string,
    files: PresignedUrlRequest[],
    expirationTime?: number
  ): Observable<PresignedUrlResponse[]> {
    const body: {
      files: PresignedUrlRequest[];
      expirationTime?: number;
    } = {
      files: files.map((f) => ({
        fileName: f.fileName,
        contentType: f.contentType,
      })),
      ...(expirationTime && { expirationTime }),
    };

    // Timeout de 60 segundos (aumentado para archivos grandes, aunque solo envía metadata)
    return this.http
      .post<PresignedUrlResponse[]>(
        `${this.baseUrl}/daily-reports/${reportId}/photo/presigned-urls`,
        body
      )
      .pipe(timeout(60000));
  }

  /**
   * Confirma la subida de una foto y la agrega al reporte
   */
  confirmPhotoUpload(reportId: string, photoUrl: string): Observable<DailyReport> {
    return this.http.post<DailyReport>(`${this.baseUrl}/daily-reports/${reportId}/photo/confirm`, {
      photoUrl,
    });
  }

  // ============================================
  // PRESIGNED URLS PARA DOCUMENTS
  // ============================================

  /**
   * Genera una Presigned URL para subir un documento
   */
  generateDocumentPresignedUrl(
    reportId: string,
    fileName: string,
    contentType: string,
    expirationTime?: number
  ): Observable<PresignedUrlResponse> {
    // Timeout de 60 segundos (aumentado para archivos grandes, aunque solo envía metadata)
    return this.http
      .post<PresignedUrlResponse>(
        `${this.baseUrl}/daily-reports/${reportId}/documents/presigned-url`,
        {
          fileName,
          contentType,
          ...(expirationTime && { expirationTime }),
        }
      )
      .pipe(timeout(60000));
  }

  /**
   * Genera múltiples Presigned URLs para subir varios documentos
   */
  generateMultipleDocumentPresignedUrls(
    reportId: string,
    files: PresignedUrlRequest[],
    expirationTime?: number
  ): Observable<PresignedUrlResponse[]> {
    const body: {
      files: PresignedUrlRequest[];
      expirationTime?: number;
    } = {
      files: files.map((f) => ({
        fileName: f.fileName,
        contentType: f.contentType,
      })),
      ...(expirationTime && { expirationTime }),
    };

    // Timeout de 60 segundos (aumentado para archivos grandes, aunque solo envía metadata)
    return this.http
      .post<PresignedUrlResponse[]>(
        `${this.baseUrl}/daily-reports/${reportId}/documents/presigned-urls`,
        body
      )
      .pipe(timeout(60000));
  }

  /**
   * Confirma la subida de un documento y lo agrega al reporte
   */
  confirmDocumentUpload(reportId: string, documentUrl: string): Observable<DailyReport> {
    return this.http.post<DailyReport>(
      `${this.baseUrl}/daily-reports/${reportId}/documents/confirm`,
      {
        documentUrl,
      }
    );
  }

  /**
   * Sube un archivo directamente a S3 usando una Presigned URL
   * IMPORTANTE: No incluye headers de Authorization (la URL ya está firmada)
   * IMPORTANTE: El contentType debe coincidir exactamente con el usado para generar la Presigned URL
   * @param presignedUrl URL firmada de S3
   * @param file Archivo a subir
   * @param contentType Tipo MIME del archivo (debe coincidir con el usado en la Presigned URL)
   * @returns Promise que se resuelve cuando la subida es exitosa
   */
  async uploadFileToS3(presignedUrl: string, file: File, contentType?: string): Promise<void> {
    try {
      // Usar el contentType proporcionado o el del archivo como fallback
      // Es importante que coincida con el usado para generar la Presigned URL
      const finalContentType = contentType || file.type || 'application/octet-stream';

      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': finalContentType,
          // NO incluir Authorization - la URL ya está firmada
        },
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Detectar errores CORS específicamente
        if (
          response.status === 0 ||
          errorText.includes('CORS') ||
          errorText.includes('Access-Control')
        ) {
          const currentOrigin = window.location.origin;
          throw new Error(
            `Error CORS: El bucket de S3 no permite el origen "${currentOrigin}". ` +
              `Configura CORS en el bucket para permitir este origen. ` +
              `Ver documentación: s3-cors-configuration.md`
          );
        }

        throw new Error(
          `Error al subir archivo a S3: ${response.status} ${response.statusText}. ${errorText}`
        );
      }
    } catch (error) {
      // Si es un error de red (CORS bloqueado), mejorar el mensaje
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        const currentOrigin = window.location.origin;
        throw new Error(
          `Error de red/CORS: No se pudo conectar a S3 desde "${currentOrigin}". ` +
            `Verifica que el bucket tenga configurado CORS para permitir este origen.`
        );
      }
      throw error;
    }
  }
}
