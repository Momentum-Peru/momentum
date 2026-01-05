import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  MaterialRequest,
  CreateMaterialRequestRequest,
  UpdateMaterialRequestRequest,
  AddUpdateRequest,
  MaterialRequestStatsResponse,
  MaterialRequestQueryParams,
} from '../interfaces/material-request.interface';

/**
 * Servicio para gestionar las operaciones de API de Solicitudes de Materiales
 * Implementa principios SOLID:
 * - Single Responsibility: Solo gestiona comunicación HTTP con el backend de solicitudes de materiales
 * - Dependency Inversion: Depende de abstracciones (HttpClient)
 * - Open/Closed: Extensible sin modificar código existente
 */
@Injectable({
  providedIn: 'root',
})
export class MaterialRequestsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/material-requests`;

  /**
   * Obtiene todas las solicitudes con filtros opcionales
   * @param params Parámetros de consulta opcionales
   * @returns Observable con la lista de solicitudes
   */
  list(params?: MaterialRequestQueryParams): Observable<MaterialRequest[]> {
    let httpParams = new HttpParams();

    if (params?.q) {
      httpParams = httpParams.set('q', params.q);
    }
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.priority) {
      httpParams = httpParams.set('priority', params.priority);
    }
    if (params?.requestedBy) {
      httpParams = httpParams.set('requestedBy', params.requestedBy);
    }
    if (params?.projectId) {
      httpParams = httpParams.set('projectId', params.projectId);
    }
    if (params?.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params?.sortOrder) {
      httpParams = httpParams.set('sortOrder', params.sortOrder);
    }

    return this.http.get<MaterialRequest[]>(this.baseUrl, { params: httpParams });
  }

  /**
   * Obtiene una solicitud por su ID
   * @param id ID de la solicitud
   * @returns Observable con la solicitud encontrada
   */
  getById(id: string): Observable<MaterialRequest> {
    return this.http.get<MaterialRequest>(`${this.baseUrl}/${id}`);
  }

  /**
   * Obtiene estadísticas de solicitudes
   * @param startDate Fecha de inicio opcional
   * @param endDate Fecha de fin opcional
   * @returns Observable con las estadísticas
   */
  getStats(startDate?: string, endDate?: string): Observable<MaterialRequestStatsResponse> {
    let httpParams = new HttpParams();

    if (startDate) {
      httpParams = httpParams.set('startDate', startDate);
    }
    if (endDate) {
      httpParams = httpParams.set('endDate', endDate);
    }

    return this.http.get<MaterialRequestStatsResponse>(`${this.baseUrl}/stats`, {
      params: httpParams,
    });
  }

  /**
   * Crea una nueva solicitud
   * @param data Datos de la solicitud a crear
   * @returns Observable con la solicitud creada
   */
  create(data: CreateMaterialRequestRequest): Observable<MaterialRequest> {
    return this.http.post<MaterialRequest>(this.baseUrl, data);
  }

  /**
   * Actualiza una solicitud existente
   * @param id ID de la solicitud
   * @param data Datos a actualizar
   * @returns Observable con la solicitud actualizada
   */
  update(id: string, data: UpdateMaterialRequestRequest): Observable<MaterialRequest> {
    return this.http.patch<MaterialRequest>(`${this.baseUrl}/${id}`, data);
  }

  /**
   * Elimina una solicitud
   * @param id ID de la solicitud
   * @returns Observable con la confirmación de eliminación
   */
  delete(id: string): Observable<{ deleted: boolean; id: string }> {
    return this.http.delete<{ deleted: boolean; id: string }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Agrega una actualización a la solicitud
   * @param requestId ID de la solicitud
   * @param data Datos de la actualización
   * @returns Observable con la solicitud actualizada
   */
  addUpdate(requestId: string, data: AddUpdateRequest): Observable<MaterialRequest> {
    return this.http.post<MaterialRequest>(`${this.baseUrl}/${requestId}/updates`, data);
  }

  /**
   * Aprueba una solicitud
   * @param id ID de la solicitud
   * @param approvedBy ID del usuario que aprueba
   * @returns Observable con la solicitud aprobada
   */
  approveRequest(id: string, approvedBy: string): Observable<MaterialRequest> {
    const params = new HttpParams().set('approvedBy', approvedBy);
    return this.http.post<MaterialRequest>(`${this.baseUrl}/${id}/approve`, {}, { params });
  }

  /**
   * Rechaza una solicitud
   * @param id ID de la solicitud
   * @param rejectedBy ID del usuario que rechaza
   * @param rejectionReason Razón del rechazo (opcional)
   * @returns Observable con la solicitud rechazada
   */
  rejectRequest(
    id: string,
    rejectedBy: string,
    rejectionReason?: string
  ): Observable<MaterialRequest> {
    let params = new HttpParams().set('rejectedBy', rejectedBy);
    if (rejectionReason) {
      params = params.set('rejectionReason', rejectionReason);
    }
    return this.http.post<MaterialRequest>(`${this.baseUrl}/${id}/reject`, {}, { params });
  }

  /**
   * Sube un archivo adjunto a una solicitud
   * @param requestId ID de la solicitud
   * @param file Archivo a subir
   * @returns Observable con la solicitud actualizada
   */
  uploadDocument(requestId: string, file: File): Observable<MaterialRequest> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<MaterialRequest>(`${this.baseUrl}/${requestId}/documents`, formData);
  }
}
