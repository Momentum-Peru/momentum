import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Notification,
  NotificationsResponse,
  UnreadCountResponse,
  CreateNotificationDto,
  UpdateNotificationDto,
  NotificationQueryParams,
} from '../interfaces/notification.interface';

/**
 * Servicio para gestionar las notificaciones del sistema
 * Principio de Responsabilidad Única: Solo maneja las llamadas HTTP al endpoint de notificaciones
 */
@Injectable({ providedIn: 'root' })
export class NotificationsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  /**
   * Obtiene todas las notificaciones del usuario autenticado con filtros opcionales
   */
  getNotifications(params?: NotificationQueryParams): Observable<NotificationsResponse> {
    let httpParams = new HttpParams();

    if (params?.leida !== undefined) {
      httpParams = httpParams.set('leida', params.leida.toString());
    }

    if (params?.tipo) {
      httpParams = httpParams.set('tipo', params.tipo);
    }

    if (params?.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }

    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http.get<NotificationsResponse>(this.baseUrl, { params: httpParams });
  }

  /**
   * Obtiene las notificaciones no leídas del usuario autenticado
   */
  getUnreadNotifications(limit?: number): Observable<Notification[]> {
    let httpParams = new HttpParams();
    if (limit) {
      httpParams = httpParams.set('limit', limit.toString());
    }
    return this.http.get<Notification[]>(`${this.baseUrl}/unread`, {
      params: httpParams,
    });
  }

  /**
   * Obtiene el conteo de notificaciones no leídas
   */
  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.baseUrl}/unread/count`);
  }

  /**
   * Obtiene una notificación por su ID
   */
  getNotificationById(id: string): Observable<Notification> {
    return this.http.get<Notification>(`${this.baseUrl}/${id}`);
  }

  /**
   * Crea una nueva notificación
   */
  createNotification(data: CreateNotificationDto): Observable<Notification> {
    return this.http.post<Notification>(this.baseUrl, data);
  }

  /**
   * Marca una notificación como leída
   */
  markAsRead(id: string): Observable<Notification> {
    return this.http.patch<Notification>(`${this.baseUrl}/${id}/read`, {});
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  markAllAsRead(): Observable<{ count: number }> {
    return this.http.patch<{ count: number }>(`${this.baseUrl}/read-all`, {});
  }

  /**
   * Actualiza una notificación
   */
  updateNotification(id: string, data: UpdateNotificationDto): Observable<Notification> {
    return this.http.patch<Notification>(`${this.baseUrl}/${id}`, data);
  }

  /**
   * Elimina una notificación
   */
  deleteNotification(id: string): Observable<Notification> {
    return this.http.delete<Notification>(`${this.baseUrl}/${id}`);
  }
}
