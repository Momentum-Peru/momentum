import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Ticket,
  CreateTicketRequest,
  UpdateTicketRequest,
  AddUpdateRequest,
  TicketStatsResponse,
  TicketQueryParams,
} from '../interfaces/ticket.interface';

/**
 * Servicio para gestionar las operaciones de API de Tickets
 * Implementa principios SOLID:
 * - Single Responsibility: Solo gestiona comunicación HTTP con el backend de tickets
 * - Dependency Inversion: Depende de abstracciones (HttpClient)
 * - Open/Closed: Extensible sin modificar código existente
 */
@Injectable({
  providedIn: 'root',
})
export class TicketsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tickets`;

  /**
   * Obtiene todos los tickets con filtros opcionales
   * @param params Parámetros de consulta opcionales
   * @returns Observable con la lista de tickets
   */
  list(params?: TicketQueryParams): Observable<Ticket[]> {
    let httpParams = new HttpParams();

    if (params?.q) {
      httpParams = httpParams.set('q', params.q);
    }
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.reportedBy) {
      httpParams = httpParams.set('reportedBy', params.reportedBy);
    }
    if (params?.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params?.sortOrder) {
      httpParams = httpParams.set('sortOrder', params.sortOrder);
    }

    return this.http.get<Ticket[]>(this.baseUrl, { params: httpParams });
  }

  /**
   * Obtiene un ticket por su ID
   * @param id ID del ticket
   * @returns Observable con el ticket encontrado
   */
  getById(id: string): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.baseUrl}/${id}`);
  }

  /**
   * Obtiene estadísticas de tickets
   * @param startDate Fecha de inicio opcional
   * @param endDate Fecha de fin opcional
   * @returns Observable con las estadísticas
   */
  getStats(startDate?: string, endDate?: string): Observable<TicketStatsResponse> {
    let httpParams = new HttpParams();

    if (startDate) {
      httpParams = httpParams.set('startDate', startDate);
    }
    if (endDate) {
      httpParams = httpParams.set('endDate', endDate);
    }

    return this.http.get<TicketStatsResponse>(`${this.baseUrl}/stats`, {
      params: httpParams,
    });
  }

  /**
   * Crea un nuevo ticket
   * @param data Datos del ticket a crear
   * @returns Observable con el ticket creado
   */
  create(data: CreateTicketRequest): Observable<Ticket> {
    return this.http.post<Ticket>(this.baseUrl, data);
  }

  /**
   * Actualiza un ticket existente
   * @param id ID del ticket
   * @param data Datos a actualizar
   * @returns Observable con el ticket actualizado
   */
  update(id: string, data: UpdateTicketRequest): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.baseUrl}/${id}`, data);
  }

  /**
   * Elimina un ticket
   * @param id ID del ticket
   * @returns Observable con la confirmación de eliminación
   */
  delete(id: string): Observable<{ deleted: boolean; id: string }> {
    return this.http.delete<{ deleted: boolean; id: string }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Agrega una actualización al ticket
   * @param ticketId ID del ticket
   * @param data Datos de la actualización
   * @returns Observable con el ticket actualizado
   */
  addUpdate(ticketId: string, data: AddUpdateRequest): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.baseUrl}/${ticketId}/updates`, data);
  }

  /**
   * Cierra un ticket
   * @param id ID del ticket
   * @returns Observable con el ticket cerrado
   */
  closeTicket(id: string): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.baseUrl}/${id}/close`, {});
  }

  /**
   * Sube un archivo adjunto a un ticket
   * @param ticketId ID del ticket
   * @param file Archivo a subir
   * @returns Observable con el ticket actualizado
   */
  uploadDocument(ticketId: string, file: File): Observable<Ticket> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Ticket>(`${this.baseUrl}/${ticketId}/documents`, formData);
  }
}
