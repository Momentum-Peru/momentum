import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationsApiService } from './notifications-api.service';
import { Notification, UnreadCountResponse } from '../interfaces/notification.interface';

/**
 * Servicio de gestión de notificaciones
 * Principio de Responsabilidad Única: Gestiona el estado y la lógica de negocio de las notificaciones
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly apiService = inject(NotificationsApiService);
  private readonly router = inject(Router);

  // Estado de las notificaciones
  private readonly _notifications = signal<Notification[]>([]);
  private readonly _unreadCount = signal<number>(0);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Signals públicos (readonly)
  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed: tiene notificaciones no leídas
  readonly hasUnread = computed(() => this._unreadCount() > 0);

  /**
   * Carga las notificaciones no leídas
   */
  loadUnreadNotifications(limit = 20): void {
    this._loading.set(true);
    this._error.set(null);

    this.apiService.getUnreadNotifications(limit).subscribe({
      next: (notifications) => {
        this._notifications.set(notifications);
        this._loading.set(false);
      },
      error: (error) => {
        console.error('[NotificationsService] Error al cargar notificaciones:', error);
        this._error.set('Error al cargar notificaciones');
        this._loading.set(false);
      },
    });
  }

  /**
   * Carga el conteo de notificaciones no leídas
   */
  loadUnreadCount(): void {
    this.apiService.getUnreadCount().subscribe({
      next: (response: UnreadCountResponse) => {
        this._unreadCount.set(response.count);
      },
      error: (error) => {
        console.error('[NotificationsService] Error al cargar conteo de notificaciones:', error);
        // No actualizamos el error para no interrumpir la experiencia
      },
    });
  }

  /**
   * Marca una notificación como leída
   */
  markAsRead(notification: Notification): void {
    if (notification.leida) {
      return;
    }

    this.apiService.markAsRead(notification._id).subscribe({
      next: (updatedNotification) => {
        // Actualizar la notificación en el array
        this._notifications.update((notifications) =>
          notifications.map((n) => (n._id === notification._id ? updatedNotification : n))
        );

        // Actualizar el conteo
        this._unreadCount.update((count) => Math.max(0, count - 1));
      },
      error: (error) => {
        console.error('Error al marcar notificación como leída:', error);
      },
    });
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  markAllAsRead(): void {
    this.apiService.markAllAsRead().subscribe({
      next: () => {
        // Actualizar todas las notificaciones como leídas
        this._notifications.update((notifications) =>
          notifications.map((n) => ({ ...n, leida: true }))
        );

        // Resetear el conteo
        this._unreadCount.set(0);
      },
      error: (error) => {
        console.error('Error al marcar todas como leídas:', error);
      },
    });
  }

  /**
   * Navega a la ruta de la notificación y la marca como leída
   */
  handleNotificationClick(notification: Notification): void {
    // Marcar como leída
    this.markAsRead(notification);

    // Navegar según el tipo de notificación y metadata
    if (notification.metadata) {
      const metadata = notification.metadata;

      // Si es una invitación a tablero
      if (metadata['action'] === 'invited' && metadata['boardId']) {
        this.router.navigate(['/tasks'], {
          queryParams: {
            showInvitations: 'true',
            boardId: metadata['boardId'] as string,
          },
        });
        return;
      }

      // Si es una tarea asignada o reasignada
      if (notification.tipo === 'task' && metadata['taskId']) {
        // Primero necesitamos obtener la tarea para saber en qué tablero está
        // Por ahora, navegamos a la tarea y la página de tareas se encargará de cargar el tablero
        this.router.navigate(['/tasks'], {
          queryParams: {
            taskId: metadata['taskId'] as string,
          },
        });
        return;
      }
    }

    // Navegación por defecto usando el link
    if (notification.link) {
      this.router.navigateByUrl(notification.link);
    }
  }

  /**
   * Refresca las notificaciones manualmente
   */
  refresh(): void {
    this.loadUnreadCount();
    this.loadUnreadNotifications();
  }

  /**
   * Limpia el estado de las notificaciones
   */
  clear(): void {
    this._notifications.set([]);
    this._unreadCount.set(0);
    this._error.set(null);
  }
}
