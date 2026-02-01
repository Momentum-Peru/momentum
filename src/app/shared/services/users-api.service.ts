import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, EMPTY } from 'rxjs';
import { map, expand, reduce } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UserOption } from '../interfaces/menu-permission.interface';

export interface User {
  _id: string;
  id: string; // Para compatibilidad con código existente
  name: string;
  email: string;
  role: 'user' | 'admin' | 'gerencia' | 'supervisor'; // Tipos específicos para compatibilidad
  isActive: boolean;
  tenantIds?: string[]; // Empresas asignadas al usuario
  createdAt: string;
  updatedAt: string;
  lastLogin?: string; // Último acceso del usuario
  googleId?: string; // ID de Google si está vinculado
}

export interface UserCreateRequest {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin' | 'gerencia' | 'supervisor';
  isActive?: boolean;
}

export interface UserUpdateRequest {
  name?: string;
  email?: string;
  role?: 'user' | 'admin' | 'gerencia' | 'supervisor';
  isActive?: boolean;
  tenantIds?: string[]; // Actualizar empresas asignadas
}

export interface UserFilters {
  search?: string;
  role?: string;
  isActive?: boolean | undefined;
  page?: number;
  limit?: number;
  tenantId?: string;
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
   * @param tenantId Opcional: Filtrar usuarios por tenantId
   */
  list(tenantId?: string): Observable<UserOption[]> {
    let url = this.baseUrl;
    if (tenantId) {
      url = `${this.baseUrl}?tenantId=${tenantId}`;
    }
    return this.http.get<{ users: User[] }>(url).pipe(
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
   * Obtiene todos los usuarios del tenant (todas las páginas) para selectores.
   * Útil cuando el backend pagina y se necesita la lista completa.
   */
  listAll(tenantId?: string, pageSize = 100): Observable<UserOption[]> {
    return this.listWithFilters({
      tenantId,
      page: 1,
      limit: pageSize,
    }).pipe(
      expand((res) => {
        const pagination = res.pagination;
        if (!pagination || pagination.page >= pagination.pages) return EMPTY;
        return this.listWithFilters({
          tenantId,
          page: pagination.page + 1,
          limit: pageSize,
        });
      }),
      reduce(
        (acc: User[], res) => acc.concat(res.data ?? res.users ?? []),
        [] as User[]
      ),
      map((users) =>
        users.map((u) => ({
          _id: u._id || u.id,
          name: u.name,
          email: u.email,
          role: u.role,
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
    if (filters.tenantId) params.append('tenantId', filters.tenantId);
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
