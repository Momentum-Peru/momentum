import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserOption {
  _id: string;
  name: string;
  email: string;
}

export interface User {
  id: string;
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'moderator' | 'admin';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserCreateRequest {
  name: string;
  email: string;
  password: string;
  role: string;
  isActive?: boolean;
}

export interface UserUpdateRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  isActive?: boolean;
}

export interface UsersListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export interface UsersSearchParams {
  search?: string;
  role?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Obtiene la lista de usuarios
   */
  list(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`);
  }

  /**
   * Obtiene la lista de usuarios con filtros
   */
  listWithFilters(params?: UsersSearchParams): Observable<UsersListResponse> {
    return this.http.get<UsersListResponse>(`${this.baseUrl}/users`, {
      params: params as any
    });
  }

  /**
   * Obtiene un usuario por ID
   */
  getById(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/users/${id}`);
  }

  /**
   * Crea un nuevo usuario
   */
  create(userData: UserCreateRequest): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/users`, userData);
  }

  /**
   * Actualiza un usuario
   */
  update(id: string, userData: UserUpdateRequest): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/users/${id}`, userData);
  }

  /**
   * Elimina un usuario
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/users/${id}`);
  }
}