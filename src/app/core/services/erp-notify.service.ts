import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import type { ToastMessageOptions } from 'primeng/api';
import { ERP_TOAST_KEY } from '../constants/erp-notify.constants';

export interface ErpNotifyLifeOptions {
  /** Duración en ms (por defecto 4800). */
  life?: number;
  /** No auto-cerrar. */
  sticky?: boolean;
}

/**
 * Notificaciones toast reutilizables con marca Momentum (logo vía {@link ErpToastHostComponent}).
 * Usa la instancia global de {@link MessageService} y la key {@link ERP_TOAST_KEY}.
 */
@Injectable({ providedIn: 'root' })
export class ErpNotifyService {
  private readonly messageService = inject(MessageService);

  private readonly defaultLife = 4800;

  private withKey(
    opts: ToastMessageOptions,
    extra?: ErpNotifyLifeOptions
  ): ToastMessageOptions {
    return {
      ...opts,
      key: ERP_TOAST_KEY,
      life: extra?.life ?? opts.life ?? this.defaultLife,
      sticky: extra?.sticky ?? opts.sticky,
    };
  }

  success(summary: string, detail?: string, extra?: ErpNotifyLifeOptions): void {
    this.messageService.add(
      this.withKey({ severity: 'success', summary, detail }, extra)
    );
  }

  error(summary: string, detail?: string, extra?: ErpNotifyLifeOptions): void {
    this.messageService.add(this.withKey({ severity: 'error', summary, detail }, extra));
  }

  warn(summary: string, detail?: string, extra?: ErpNotifyLifeOptions): void {
    this.messageService.add(this.withKey({ severity: 'warn', summary, detail }, extra));
  }

  info(summary: string, detail?: string, extra?: ErpNotifyLifeOptions): void {
    this.messageService.add(this.withKey({ severity: 'info', summary, detail }, extra));
  }

  secondary(summary: string, detail?: string, extra?: ErpNotifyLifeOptions): void {
    this.messageService.add(
      this.withKey({ severity: 'secondary', summary, detail }, extra)
    );
  }

  /** Contacto nuevo en CRM. */
  crmContactCreated(displayName: string): void {
    this.success('Contacto agregado', `${displayName} se registró en el CRM.`);
  }

  /** Seguimiento registrado (lista o detalle). */
  crmFollowUpCreated(contactLabel?: string): void {
    this.success(
      'Seguimiento registrado',
      contactLabel
        ? `Nuevo seguimiento para ${contactLabel}.`
        : 'El seguimiento se guardó correctamente.'
    );
  }

  /** Seguimiento actualizado. */
  crmFollowUpUpdated(): void {
    this.success('Seguimiento actualizado', 'Los cambios se guardaron correctamente.');
  }

  /** Seguimiento eliminado. */
  crmFollowUpRemoved(): void {
    this.success('Eliminado', 'El seguimiento se eliminó.');
  }
}
