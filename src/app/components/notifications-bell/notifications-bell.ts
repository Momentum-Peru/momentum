import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BadgeModule } from 'primeng/badge';
import { Popover } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { NotificationsService } from '../../shared/services/notifications.service';
import { Notification } from '../../shared/interfaces/notification.interface';
import { ERP_BRAND_LOGO_SRC } from '../../core/constants/erp-notify.constants';

/**
 * Componente de campana de notificaciones
 * Principio de Responsabilidad Única: Solo maneja la UI y la interacción de la campana de notificaciones
 */
@Component({
  selector: 'app-notifications-bell',
  standalone: true,
  imports: [CommonModule, BadgeModule, Popover, ButtonModule],
  templateUrl: './notifications-bell.html',
  styleUrl: './notifications-bell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsBellComponent implements OnInit {
  private readonly notificationsService = inject(NotificationsService);
  private readonly router = inject(Router);

  readonly brandLogoSrc = ERP_BRAND_LOGO_SRC;

  // Estado del componente
  readonly notifications = this.notificationsService.notifications;
  readonly unreadCount = this.notificationsService.unreadCount;
  readonly loading = this.notificationsService.loading;
  readonly hasUnread = this.notificationsService.hasUnread;

  // Referencia al popover
  popover?: Popover;

  /**
   * Obtiene el icono según el tipo de notificación
   */
  getNotificationIcon(tipo: string): string {
    const iconMap: Record<string, string> = {
      info: 'pi-info-circle',
      success: 'pi-check-circle',
      warning: 'pi-exclamation-triangle',
      error: 'pi-times-circle',
      task: 'pi-check-square',
      message: 'pi-comment',
      system: 'pi-cog',
    };
    return iconMap[tipo] || 'pi-bell';
  }

  /**
   * Obtiene el color según el tipo de notificación
   */
  getNotificationColor(tipo: string): string {
    const colorMap: Record<string, string> = {
      info: 'text-blue-600',
      success: 'text-green-600',
      warning: 'text-yellow-600',
      error: 'text-red-600',
      task: 'text-purple-600',
      message: 'text-indigo-600',
      system: 'text-gray-600',
    };
    return colorMap[tipo] || 'text-gray-600';
  }

  /**
   * Obtiene las clases completas para el icono de notificación
   */
  getNotificationIconClasses(tipo: string): string {
    const icon = this.getNotificationIcon(tipo);
    const color = this.getNotificationColor(tipo);
    return `${icon} ${color} text-lg`;
  }

  /**
   * Verifica si el tipo de notificación es válido
   */
  isValidNotificationType(tipo: string): boolean {
    return ['info', 'success', 'warning', 'error', 'task', 'message', 'system'].includes(tipo);
  }

  /**
   * Obtiene el color de fondo según el tipo de notificación
   */
  getNotificationBgColor(tipo: string): string {
    const bgColorMap: Record<string, string> = {
      info: 'bg-blue-50',
      success: 'bg-green-50',
      warning: 'bg-yellow-50',
      error: 'bg-red-50',
      task: 'bg-purple-50',
      message: 'bg-indigo-50',
      system: 'bg-gray-50',
    };
    return bgColorMap[tipo] || 'bg-gray-50';
  }

  /**
   * Formatea la fecha relativa (hace X tiempo)
   */
  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Hace un momento';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `Hace ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
    }

    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    });
  }

  /**
   * Maneja el clic en la campana
   */
  onBellClick(event: Event, popover: Popover): void {
    this.popover = popover;
    const wasVisible = popover.overlayVisible;
    popover.toggle(event);

    // Cargar notificaciones y conteo si el popover se abre (cuando no estaba visible antes)
    if (!wasVisible) {
      this.notificationsService.loadUnreadCount();
      this.notificationsService.loadUnreadNotifications();
    }
  }

  /**
   * Maneja el clic en una notificación
   */
  onNotificationClick(notification: Notification): void {
    this.notificationsService.handleNotificationClick(notification);
    if (this.popover) {
      this.popover.hide();
    }
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  markAllAsRead(): void {
    this.notificationsService.markAllAsRead();
  }

  /**
   * Refresca las notificaciones
   */
  refreshNotifications(): void {
    this.notificationsService.refresh();
  }

  ngOnInit(): void {
    // Cargar el conteo de notificaciones no leídas al inicializar
    this.notificationsService.loadUnreadCount();
  }
}
