import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UserOption } from '../interfaces/menu-permission.interface';

export interface User {
  _id: string;
  id: string; // Para compatibilidad con código existente
  name: string;
  email: string;
  role: 'user' | 'moderator' | 'admin'; // Tipos específicos para compatibilidad
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserCreateRequest {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'moderator' | 'admin';
  isActive?: boolean;
}

export interface UserUpdateRequest {
  name?: string;
  email?: string;
  role?: 'user' | 'moderator' | 'admin';
  isActive?: boolean;
}

export interface UserFilters {
  search?: string;
  role?: string;
  isActive?: boolean | undefined;
  page?: number;
  limit?: number;
}

export interface UserResponse {
  data: User[];
  users: User[]; // Para compatibilidad con código existente
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  /**
   * Obtiene la lista de usuarios para el selector
   */
  list(): Observable<UserOption[]> {
    return this.http.get<{ users: User[] }>(this.baseUrl).pipe(
      map((response) =>
        response.users.map((user) => ({
          _id: user._id || user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }))
      )
    );
  }

  /**
   * Obtiene la lista de usuarios con filtros
   */
  listWithFilters(filters: UserFilters = {}): Observable<UserResponse> {
    const params = new URLSearchParams();

    if (filters.search) params.append('search', filters.search);
    if (filters.role) params.append('role', filters.role);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    // Si no se especifica isActive, no enviar el parámetro para que el backend muestre solo activos por defecto
    const url = params.toString() ? `${this.baseUrl}?${params.toString()}` : this.baseUrl;
    return this.http.get<UserResponse>(url);
  }

  /**
   * Obtiene un usuario por ID
   */
  getById(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${id}`);
  }

  /**
   * Crea un nuevo usuario
   */
  create(user: UserCreateRequest): Observable<User> {
    return this.http.post<User>(this.baseUrl, user);
  }

  /**
   * Actualiza un usuario existente
   */
  update(id: string, user: UserUpdateRequest): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/${id}`, user);
  }

  /**
   * Elimina un usuario
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
