import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  MenuPermissionWithUser,
  AssignPermissionsRequest,
  MenuPermissionResponse,
  MenuPermissionStats,
} from '../interfaces/menu-permission.interface';

@Injectable({
  providedIn: 'root',
})
export class MenuPermissionsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/menu-permissions`;

  /**
   * Obtiene todos los permisos con filtros y paginación
   */
  list(query: {
    userId?: string;
    route?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Observable<MenuPermissionResponse> {
    const params = new URLSearchParams();

    if (query.userId) params.append('userId', query.userId);
    if (query.route) params.append('route', query.route);
    if (query.isActive !== undefined) params.append('isActive', query.isActive.toString());
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortOrder) params.append('sortOrder', query.sortOrder);

    return this.http.get<MenuPermissionResponse>(`${this.baseUrl}?${params.toString()}`);
  }

  /**
   * Obtiene un permiso por ID
   */
  getById(id: string): Observable<MenuPermissionWithUser> {
    return this.http.get<MenuPermissionWithUser>(`${this.baseUrl}/${id}`);
  }

  /**
   * Crea un nuevo permiso
   */
  create(
    permission: {
      userId: string;
      route: string;
      isActive?: boolean;
    }
  ): Observable<MenuPermissionWithUser> {
    return this.http.post<MenuPermissionWithUser>(this.baseUrl, permission);
  }

  /**
   * Actualiza un permiso existente
   */
  update(id: string, permission: {
    route?: string;
    isActive?: boolean;
  }): Observable<MenuPermissionWithUser> {
    return this.http.patch<MenuPermissionWithUser>(`${this.baseUrl}/${id}`, permission);
  }

  /**
   * Elimina un permiso
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Obtiene todos los permisos de un usuario específico
   */
  getByUserId(userId: string): Observable<MenuPermissionWithUser[]> {
    return this.http.get<MenuPermissionWithUser[]>(`${this.baseUrl}/user/${userId}`);
  }

  /**
   * Obtiene las rutas permitidas para un usuario
   */
  getUserAllowedRoutes(userId: string): Observable<{ routes: string[] }> {
    return this.http.get<{ routes: string[] }>(`${this.baseUrl}/user/${userId}/routes`);
  }

  /**
   * Verifica si un usuario tiene permiso para acceder a una ruta
   */
  checkPermission(
    userId: string,
    route: string
  ): Observable<{ hasPermission: boolean; userId: string; route: string }> {
    return this.http.get<{ hasPermission: boolean; userId: string; route: string }>(
      `${this.baseUrl}/check/${userId}/${encodeURIComponent(route)}`
    );
  }

  /**
   * Asigna múltiples permisos a un usuario (reemplaza los existentes)
   */
  assignPermissions(request: AssignPermissionsRequest): Observable<MenuPermissionWithUser[]> {
    return this.http.post<MenuPermissionWithUser[]>(`${this.baseUrl}/assign`, request);
  }

  /**
   * Elimina todos los permisos de un usuario
   */
  deleteByUserId(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/user/${userId}`);
  }

  /**
   * Obtiene estadísticas de permisos
   */
  getStats(): Observable<MenuPermissionStats> {
    return this.http.get<MenuPermissionStats>(`${this.baseUrl}/stats`);
  }
}
