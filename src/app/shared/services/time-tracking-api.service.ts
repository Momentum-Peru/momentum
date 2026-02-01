import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, timeout, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TimeTracking,
  CreateTimeTrackingRequest,
  UpdateTimeTrackingRequest,
  TimeTrackingQueryParams,
} from '../interfaces/time-tracking.interface';

/**
 * Servicio para gestionar registros de tiempo trabajado
 * Principio de Responsabilidad Única: Solo maneja las llamadas HTTP al endpoint de time-tracking
 */
@Injectable({
  providedIn: 'root',
})
export class TimeTrackingApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/time-tracking`;

  /**
   * Obtiene todos los registros de tiempo con filtros opcionales
   */
  list(params?: TimeTrackingQueryParams): Observable<TimeTracking[]> {
    let httpParams = new HttpParams();
    if (params?.userId) httpParams = httpParams.set('userId', params.userId);
    if (params?.projectId) httpParams = httpParams.set('projectId', params.projectId);
    if (params?.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params?.endDate) httpParams = httpParams.set('endDate', params.endDate);
    if (params?.type) httpParams = httpParams.set('type', params.type);
    if (params?.q) httpParams = httpParams.set('q', params.q);
    if (params?.tenantId) httpParams = httpParams.set('tenantId', params.tenantId);

    return this.http.get<TimeTracking[]>(this.baseUrl, { params: httpParams });
  }

  /**
   * Obtiene registros de tiempo por usuario
   */
  getByUser(
    userId: string,
    filters?: { startDate?: string; endDate?: string; type?: string }
  ): Observable<TimeTracking[]> {
    let url = `${this.baseUrl}/user/${userId}`;
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.type) params.append('type', filters.type);
    if (params.toString()) url += `?${params.toString()}`;
    return this.http.get<TimeTracking[]>(url);
  }

  /**
   * Obtiene registros activos del usuario
   */
  getActiveByUser(userId: string): Observable<TimeTracking[]> {
    return this.http.get<TimeTracking[]>(`${this.baseUrl}/user/${userId}/active`);
  }

  /**
   * Obtiene registros de tiempo por proyecto
   */
  getByProject(
    projectId: string,
    filters?: { startDate?: string; endDate?: string; type?: string }
  ): Observable<TimeTracking[]> {
    let url = `${this.baseUrl}/project/${projectId}`;
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.type) params.append('type', filters.type);
    if (params.toString()) url += `?${params.toString()}`;
    return this.http.get<TimeTracking[]>(url);
  }

  /**
   * Obtiene registros de tiempo por fecha
   */
  getByDate(date: string): Observable<TimeTracking[]> {
    return this.http.get<TimeTracking[]>(`${this.baseUrl}/date/${date}`);
  }

  /**
   * Obtiene un registro de tiempo por ID
   */
  getById(id: string): Observable<TimeTracking> {
    return this.http.get<TimeTracking>(`${this.baseUrl}/${id}`);
  }

  /**
   * Crea un nuevo registro de tiempo
   */
  create(record: CreateTimeTrackingRequest): Observable<TimeTracking> {
    return this.http.post<TimeTracking>(this.baseUrl, record);
  }

  /**
   * Actualiza un registro de tiempo
   */
  update(id: string, record: UpdateTimeTrackingRequest): Observable<TimeTracking> {
    return this.http.patch<TimeTracking>(`${this.baseUrl}/${id}`, record);
  }

  /**
   * Elimina un registro de tiempo
   */
  delete(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Sube un documento a un registro de tiempo
   */
  uploadDocument(recordId: string, file: File): Observable<TimeTracking> {
    const formData = new FormData();
    formData.append('file', file);

    // Calcular timeout basado en el tamaño del archivo
    const fileSizeMB = file.size / (1024 * 1024);
    const timeoutMs = Math.max(30000, 30000 + fileSizeMB * 5000); // Mínimo 30s, +5s por MB
    const maxTimeout = 300000; // Máximo 5 minutos
    const finalTimeout = Math.min(timeoutMs, maxTimeout);

    return this.http
      .post<TimeTracking>(`${this.baseUrl}/${recordId}/documents`, formData, {
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

  /**
   * Elimina un documento de un registro de tiempo
   */
  deleteDocument(recordId: string, documentUrl: string): Observable<TimeTracking> {
    return this.http.delete<TimeTracking>(`${this.baseUrl}/${recordId}/documents`, {
      body: { documentUrl },
    });
  }
}

