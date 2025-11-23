import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserProfile, UpdateProfileRequest } from '../interfaces/profile.interface';

/**
 * Servicio para gestionar el perfil de usuario
 * Principio de Responsabilidad Única: Solo maneja las llamadas HTTP al endpoint de perfil
 */
@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/profile`;

  /**
   * Obtiene el perfil del usuario autenticado
   */
  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(this.baseUrl);
  }

  /**
   * Actualiza el perfil del usuario autenticado
   * Solo permite actualizar el nombre (email y role no son editables)
   */
  updateProfile(data: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.patch<UserProfile>(this.baseUrl, data);
  }

  /**
   * Sube una foto de perfil
   */
  uploadProfilePicture(file: File): Observable<UserProfile> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<UserProfile>(`${this.baseUrl}/photo`, formData);
  }

  /**
   * Elimina la foto de perfil
   */
  deleteProfilePicture(): Observable<UserProfile> {
    return this.http.delete<UserProfile>(`${this.baseUrl}/photo`);
  }
}
