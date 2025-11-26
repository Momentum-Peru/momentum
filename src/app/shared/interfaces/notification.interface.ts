/**
 * Interfaz para las notificaciones del sistema
 */
export interface Notification {
  _id: string;
  tenantId: string;
  userId: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  tipo: NotificationType;
  link?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tipos de notificaciones disponibles
 */
export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'task'
  | 'message'
  | 'system';

/**
 * Respuesta de la API al obtener notificaciones paginadas
 */
export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Respuesta del conteo de notificaciones no leídas
 */
export interface UnreadCountResponse {
  count: number;
}

/**
 * DTO para crear una notificación
 */
export interface CreateNotificationDto {
  userId: string;
  titulo: string;
  mensaje: string;
  tipo?: NotificationType;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * DTO para actualizar una notificación
 */
export interface UpdateNotificationDto {
  leida?: boolean;
}

/**
 * Query parameters para filtrar notificaciones
 */
export interface NotificationQueryParams {
  leida?: boolean;
  tipo?: NotificationType;
  page?: number;
  limit?: number;
}
