import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../../pages/login/services/auth.service';

export interface UserCreateRequest {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'moderator' | 'admin';
}

export interface UserUpdateRequest {
  email?: string;
  name?: string;
  role?: 'user' | 'moderator' | 'admin';
  isActive?: boolean;
}

export interface UserOption {
  _id: string;
  name: string;
  email: string;
}

export interface UsersResponse {
  page: number;
  total: number;
  totalPages: number;
  users: User[];
}

@Injectable({
  providedIn: 'root',
})
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Obtiene la lista de todos los usuarios
   */
  list(): Observable<User[]> {
    return this.http
      .get<UsersResponse>(`${this.baseUrl}/users`)
      .pipe(map((response) => response.users || []));
  }

  /**
   * Obtiene la lista de usuarios con filtros de búsqueda
   */
  listWithFilters(filters?: { q?: string; role?: string; isActive?: boolean }): Observable<User[]> {
    let httpParams = new HttpParams();

    if (filters?.q) {
      httpParams = httpParams.set('q', filters.q);
    }
    if (filters?.role) {
      httpParams = httpParams.set('role', filters.role);
    }
    if (filters?.isActive !== undefined) {
      httpParams = httpParams.set('isActive', filters.isActive.toString());
    }

    const url = `${this.baseUrl}/users`;
    console.log('URL de la petición:', url);
    console.log('Parámetros HTTP:', httpParams.toString());

    return this.http.get<UsersResponse>(url, { params: httpParams }).pipe(
      map((response) => {
        console.log('Respuesta completa de la API:', response);
        return response.users || [];
      })
    );
  }

  /**
   * Obtiene un usuario por ID
   */
  getById(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/users/${id}`);
  }

  /**
   * Crea un nuevo usuario usando el endpoint de registro
   */
  create(user: UserCreateRequest): Observable<User> {
    return this.http
      .post<{ user: User }>(`${this.baseUrl}/auth/register`, user)
      .pipe(map((response) => response.user));
  }

  /**
   * Actualiza un usuario existente
   * NOTA: Endpoint no implementado en el backend
   */
  update(id: string, user: UserUpdateRequest): Observable<User> {
    throw new Error('Funcionalidad de actualización no implementada en el backend');
  }

  /**
   * Cambia el rol de un usuario
   * NOTA: Endpoint no implementado en el backend
   */
  updateRole(id: string, role: 'user' | 'moderator' | 'admin'): Observable<User> {
    throw new Error('Funcionalidad de cambio de rol no implementada en el backend');
  }

  /**
   * Activa o desactiva un usuario
   * NOTA: Endpoint no implementado en el backend
   */
  toggleActive(id: string): Observable<User> {
    throw new Error('Funcionalidad de cambio de estado no implementada en el backend');
  }

  /**
   * Desactiva un usuario (soft delete)
   */
  delete(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/users/${id}`);
  }

  /**
   * Obtiene opciones de usuarios para selectores
   */
  getOptions(): Observable<UserOption[]> {
    return this.http.get<UserOption[]>(`${this.baseUrl}/users/options`);
  }

  /**
   * Obtiene estadísticas de usuarios
   */
  getStats(): Observable<{
    total: number;
    active: number;
    inactive: number;
    byRole: { [key: string]: number };
  }> {
    return this.http.get<{
      total: number;
      active: number;
      inactive: number;
      byRole: { [key: string]: number };
    }>(`${this.baseUrl}/users/stats`);
  }
}
