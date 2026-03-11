/**
 * Tipos para el servicio de envío de notificaciones (email / whatsapp).
 * Reutilizable en toda la app; por ahora solo canal email está activo.
 */

export type NotificationChannel = 'email' | 'whatsapp';

export interface SendNotificationRequest {
  channel: NotificationChannel;
  to: string;
  subject?: string;
  title: string;
  body: string;
  isHtml?: boolean;
  metadata?: Record<string, string | number | boolean>;
}

export interface SendNotificationResult {
  success: boolean;
  channel: NotificationChannel;
  messageId?: string;
  error?: string;
}
