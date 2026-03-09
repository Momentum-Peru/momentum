import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  SendNotificationRequest,
  SendNotificationResult,
} from '../interfaces/notification-delivery.interface';

/**
 * Servicio API para envío de notificaciones (correo y en el futuro WhatsApp).
 * Independiente y reutilizable: cualquier módulo puede inyectarlo para enviar
 * notificaciones por el canal configurado.
 */
@Injectable({ providedIn: 'root' })
export class NotificationDeliveryApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/notification-delivery`;

  /**
   * Envía una notificación por el canal indicado.
   * Por ahora solo 'email' está implementado en backend; 'whatsapp' devolverá error controlado.
   */
  send(request: SendNotificationRequest): Observable<SendNotificationResult> {
    return this.http.post<SendNotificationResult>(`${this.baseUrl}/send`, request);
  }

  /**
   * Atajo para enviar por correo (canal por defecto actual).
   */
  sendByEmail(params: {
    to: string;
    subject?: string;
    title: string;
    body: string;
    isHtml?: boolean;
    metadata?: Record<string, string | number | boolean>;
  }): Observable<SendNotificationResult> {
    return this.send({
      channel: 'email',
      to: params.to,
      subject: params.subject,
      title: params.title,
      body: params.body,
      isHtml: params.isHtml ?? false,
      metadata: params.metadata,
    });
  }
}
