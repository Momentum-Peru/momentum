import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CreateLogRequest {
  modulo: string;
  userId?: string;
  fechaModificacion?: string;
  detalle: Record<string, unknown>;
}

export interface Log {
  _id: string;
  tenantId: string;
  modulo: string;
  userId: string | { _id: string; name: string; email: string };
  fechaModificacion: string;
  detalle: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LogQueryParams {
  modulo?: string;
  userId?: string;
  fechaInicio?: string;
  fechaFin?: string;
  page?: number;
  limit?: number;
}

export interface LogsResponse {
  logs: Log[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

/**
 * Servicio para interactuar con la API de logs
 * Principio de Responsabilidad Única: Solo maneja las peticiones HTTP relacionadas con logs
 */
@Injectable({
  providedIn: 'root',
})
export class LogsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/logs`;

  /**
   * Crea un nuevo log
   */
  create(log: CreateLogRequest): Observable<Log> {
    return this.http.post<Log>(this.baseUrl, log);
  }

  /**
   * Crea un nuevo log con tenantId específico en los headers
   * Útil cuando se crea un log desde un interceptor y se necesita el tenantId de la petición original
   */
  createWithTenant(log: CreateLogRequest, tenantId: string): Observable<Log> {
    return this.http.post<Log>(this.baseUrl, log, {
      headers: {
        'X-Tenant-Id': tenantId,
      },
    });
  }

  /**
   * Obtiene todos los logs con filtros opcionales
   */
  findAll(params?: LogQueryParams): Observable<LogsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.modulo) queryParams.append('modulo', params.modulo);
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.fechaInicio) queryParams.append('fechaInicio', params.fechaInicio);
    if (params?.fechaFin) queryParams.append('fechaFin', params.fechaFin);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;
    return this.http.get<LogsResponse>(url);
  }

  /**
   * Obtiene logs por módulo
   */
  findByModulo(modulo: string, limit?: number): Observable<Log[]> {
    const url = limit
      ? `${this.baseUrl}/modulo/${modulo}?limit=${limit}`
      : `${this.baseUrl}/modulo/${modulo}`;
    return this.http.get<Log[]>(url);
  }

  /**
   * Obtiene logs por usuario
   */
  findByUser(userId: string, limit?: number): Observable<Log[]> {
    const url = limit
      ? `${this.baseUrl}/user/${userId}?limit=${limit}`
      : `${this.baseUrl}/user/${userId}`;
    return this.http.get<Log[]>(url);
  }

  /**
   * Obtiene un log por ID
   */
  findOne(id: string): Observable<Log> {
    return this.http.get<Log>(`${this.baseUrl}/${id}`);
  }
}

