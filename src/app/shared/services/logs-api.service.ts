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
}

