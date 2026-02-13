import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Area,
  CreateAreaRequest,
  UpdateAreaRequest,
  AreaQueryParams,
  AssignUsersRequest,
} from '../interfaces/area.interface';

/**
 * Servicio para gestionar Áreas
 * Principio de Responsabilidad Única: Solo maneja las llamadas HTTP al endpoint de areas
 */
@Injectable({
  providedIn: 'root',
})
export class AreasApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/areas`;

  /**
   * Crea un nuevo área
   */
  create(area: CreateAreaRequest): Observable<Area> {
    return this.http.post<Area>(this.baseUrl, area);
  }

  /**
   * Obtiene la lista de áreas con filtros opcionales
   */
  list(params?: AreaQueryParams): Observable<Area[]> {
    let httpParams = new HttpParams();

    if (params?.q) {
      httpParams = httpParams.set('q', params.q);
    }

    if (params?.isActive !== undefined) {
      httpParams = httpParams.set('isActive', params.isActive.toString());
    }

    const url = httpParams.toString() ? `${this.baseUrl}?${httpParams.toString()}` : this.baseUrl;
    return this.http.get<Area[]>(url);
  }

  /**
   * Obtiene todas las áreas activas
   */
  listActive(): Observable<Area[]> {
    return this.http.get<Area[]>(`${this.baseUrl}/active`);
  }

  /**
   * Obtiene las áreas asignadas al usuario actual
   */
  listMine(): Observable<Area[]> {
    return this.http.get<Area[]>(`${this.baseUrl}/my-areas`);
  }

  /**
   * Obtiene un área por ID
   */
  getById(id: string): Observable<Area> {
    return this.http.get<Area>(`${this.baseUrl}/${id}`);
  }

  /**
   * Obtiene un área por código
   */
  getByCodigo(codigo: string): Observable<Area> {
    return this.http.get<Area>(`${this.baseUrl}/codigo/${codigo}`);
  }

  /**
   * Actualiza un área existente
   */
  update(id: string, area: UpdateAreaRequest): Observable<Area> {
    return this.http.patch<Area>(`${this.baseUrl}/${id}`, area);
  }

  /**
   * Cambia el estado activo de un área
   */
  toggleActive(id: string, isActive: boolean): Observable<Area> {
    return this.http.put<Area>(`${this.baseUrl}/${id}/toggle-active`, { isActive });
  }

  /**
   * Elimina un área
   */
  delete(id: string): Observable<{ deleted: boolean; id: string }> {
    return this.http.delete<{ deleted: boolean; id: string }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Asigna usuarios a un área
   */
  assignUsers(id: string, request: AssignUsersRequest): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/${id}/users`, request);
  }

  /**
   * Obtiene los usuarios asignados a un área
   */
  getAssignedUsers(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${id}/users`);
  }
}

