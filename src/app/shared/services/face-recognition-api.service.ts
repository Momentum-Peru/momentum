import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FaceDescriptor,
  RegisterFaceRequest,
  MarkAttendanceRequest,
  AttendanceRecord,
} from '../interfaces/face-recognition.interface';

/**
 * Servicio para gestionar reconocimiento facial
 * Principio de Responsabilidad Única: Solo maneja las llamadas HTTP al endpoint de face-recognition
 */
@Injectable({
  providedIn: 'root',
})
export class FaceRecognitionApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/face-recognition`;

  /**
   * Registra un descriptor facial para un usuario
   */
  registerFace(
    userId: string,
    image: File,
    tenantId: string
  ): Observable<FaceDescriptor> {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('userId', userId);

    return this.http.post<FaceDescriptor>(
      `${this.baseUrl}/register?tenantId=${tenantId}`,
      formData
    );
  }

  /**
   * Marca la asistencia usando reconocimiento facial
   */
  markAttendance(
    image: File,
    tenantId: string,
    request?: MarkAttendanceRequest
  ): Observable<AttendanceRecord> {
    const formData = new FormData();
    formData.append('image', image);
    if (request?.type) formData.append('type', request.type);
    if (request?.location) formData.append('location', request.location);
    if (request?.notes) formData.append('notes', request.notes);

    return this.http.post<AttendanceRecord>(
      `${this.baseUrl}/attendance?tenantId=${tenantId}`,
      formData
    );
  }

  /**
   * Obtiene los descriptores faciales de un usuario
   */
  getDescriptorsByUser(userId: string, tenantId: string): Observable<FaceDescriptor[]> {
    return this.http.get<FaceDescriptor[]>(
      `${this.baseUrl}/descriptors/user/${userId}?tenantId=${tenantId}`
    );
  }

  /**
   * Obtiene los registros de asistencia
   */
  getAttendanceRecords(
    tenantId: string,
    filters?: {
      userId?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Observable<AttendanceRecord[]> {
    let httpParams = new HttpParams().set('tenantId', tenantId);
    if (filters?.userId) httpParams = httpParams.set('userId', filters.userId);
    if (filters?.startDate) httpParams = httpParams.set('startDate', filters.startDate);
    if (filters?.endDate) httpParams = httpParams.set('endDate', filters.endDate);

    return this.http.get<AttendanceRecord[]>(`${this.baseUrl}/attendance`, {
      params: httpParams,
    });
  }

  /**
   * Elimina un descriptor facial
   */
  deleteDescriptor(id: string, tenantId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/descriptors/${id}?tenantId=${tenantId}`
    );
  }
}

