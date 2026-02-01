import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Meeting,
  CreateMeetingRequest,
  UpdateMeetingRequest,
  MeetingStatsResponse,
  MeetingQueryParams,
} from '../interfaces/meeting.interface';

/**
 * Servicio para gestionar las operaciones de API de Reuniones
 * Implementa principios SOLID:
 * - Single Responsibility: Solo gestiona comunicación HTTP con el backend de reuniones
 * - Dependency Inversion: Depende de abstracciones (HttpClient)
 * - Open/Closed: Extensible sin modificar código existente
 */
@Injectable({
  providedIn: 'root',
})
export class MeetingsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/meetings`;

  /**
   * Obtiene todas las reuniones con filtros opcionales
   * @param params Parámetros de consulta opcionales
   * @returns Observable con la lista de reuniones
   */
  list(params?: MeetingQueryParams): Observable<Meeting[]> {
    let httpParams = new HttpParams();

    if (params?.q) {
      httpParams = httpParams.set('q', params.q);
    }
    if (params?.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params?.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    if (params?.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params?.sortOrder) {
      httpParams = httpParams.set('sortOrder', params.sortOrder);
    }

    return this.http.get<Meeting[]>(this.baseUrl, { params: httpParams });
  }

  /**
   * Obtiene una reunión por su ID
   * @param id ID de la reunión
   * @returns Observable con la reunión encontrada
   */
  getById(id: string): Observable<Meeting> {
    return this.http.get<Meeting>(`${this.baseUrl}/${id}`);
  }

  /**
   * Obtiene reuniones por fecha específica
   * @param date Fecha en formato ISO 8601 (ej: 2024-01-15)
   * @returns Observable con la lista de reuniones de esa fecha
   */
  getByDate(date: string): Observable<Meeting[]> {
    return this.http.get<Meeting[]>(`${this.baseUrl}/date/${date}`);
  }

  /**
   * Obtiene reuniones por rango de fechas
   * @param startDate Fecha de inicio
   * @param endDate Fecha de fin
   * @returns Observable con la lista de reuniones en el rango
   */
  getByDateRange(startDate: string, endDate: string): Observable<Meeting[]> {
    const httpParams = new HttpParams().set('startDate', startDate).set('endDate', endDate);

    return this.http.get<Meeting[]>(`${this.baseUrl}/date-range`, {
      params: httpParams,
    });
  }

  /**
   * Obtiene estadísticas de reuniones
   * @param startDate Fecha de inicio opcional
   * @param endDate Fecha de fin opcional
   * @returns Observable con las estadísticas
   */
  getStats(startDate?: string, endDate?: string): Observable<MeetingStatsResponse> {
    let httpParams = new HttpParams();

    if (startDate) {
      httpParams = httpParams.set('startDate', startDate);
    }
    if (endDate) {
      httpParams = httpParams.set('endDate', endDate);
    }

    return this.http.get<MeetingStatsResponse>(`${this.baseUrl}/stats`, {
      params: httpParams,
    });
  }

  /**
   * Crea una nueva reunión
   * @param data Datos de la reunión a crear
   * @returns Observable con la reunión creada
   */
  create(data: CreateMeetingRequest): Observable<Meeting> {
    return this.http.post<Meeting>(this.baseUrl, data);
  }

  /**
   * Actualiza una reunión existente
   * @param id ID de la reunión
   * @param data Datos a actualizar
   * @returns Observable con la reunión actualizada
   */
  update(id: string, data: UpdateMeetingRequest): Observable<Meeting> {
    return this.http.patch<Meeting>(`${this.baseUrl}/${id}`, data);
  }

  /**
   * Elimina una reunión
   * @param id ID de la reunión
   * @returns Observable con la confirmación de eliminación
   */
  delete(id: string): Observable<{ deleted: boolean; id: string }> {
    return this.http.delete<{ deleted: boolean; id: string }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Sube un archivo adjunto a una reunión
   * @param meetingId ID de la reunión
   * @param file Archivo a subir
   * @returns Observable con la reunión actualizada
   */
  uploadDocument(meetingId: string, file: File): Observable<Meeting> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Meeting>(`${this.baseUrl}/${meetingId}/documents`, formData);
  }
}
