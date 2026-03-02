import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { PurchaseRequirement } from '../../../../shared/interfaces/purchase.interface';

/**
 * Presenta una tarjeta de requerimiento de compra.
 * SRP: solo presentación y emisión de eventos (ver, comparar, cotizar, editar).
 */
@Component({
  selector: 'app-purchase-requirement-card',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule, CardModule],
  templateUrl: './purchase-requirement-card.component.html',
})
export class PurchaseRequirementCardComponent {
  readonly requirement = input.required<PurchaseRequirement>();
  readonly quotesCount = input<number>(0);

  readonly view = output<PurchaseRequirement>();
  readonly compare = output<PurchaseRequirement>();
  readonly registerQuote = output<PurchaseRequirement>();
  readonly edit = output<PurchaseRequirement>();
  readonly approve = output<PurchaseRequirement>();
  readonly reject = output<PurchaseRequirement>();

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      borrador: 'Borrador',
      cotizaciones_pendientes: 'Cotizaciones pendientes',
      listo_para_comparar: 'Listo para comparar',
      adjudicado: 'Adjudicado',
      cerrado: 'Cerrado',
    };
    return labels[status] ?? status;
  }

  statusSeverity(
    status: string,
  ): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    const map: Record<string, 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'> = {
      borrador: 'secondary',
      cotizaciones_pendientes: 'warn',
      listo_para_comparar: 'info',
      adjudicado: 'success',
      cerrado: 'danger',
    };
    return map[status] ?? 'secondary';
  }

  priorityLabel(p: string): string {
    const labels: Record<string, string> = {
      baja: 'Baja',
      media: 'Media',
      alta: 'Alta',
      urgente: 'Urgente',
    };
    return labels[p] ?? p;
  }

  daysUntilDue(dueDate: string | undefined): string {
    if (!dueDate) return '—';
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Cerrado';
    if (diff === 0) return 'Hoy';
    if (diff === 1) return '1 día';
    return `${diff} días`;
  }
}
