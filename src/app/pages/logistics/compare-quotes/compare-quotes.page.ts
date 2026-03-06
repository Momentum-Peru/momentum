import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { PurchasesRequirementsApiService } from '../../../shared/services/purchases-requirements-api.service';
import { PurchasesQuotesApiService } from '../../../shared/services/purchases-quotes-api.service';
import { RfqsService, Rfq } from '../../../shared/services/rfqs.service';
import { TenantService } from '../../../core/services/tenant.service';
import { PurchaseRequirement } from '../../../shared/interfaces/purchase.interface';

/**
 * Vista "Comparar cotizaciones" del flujo de logística.
 * Dos secciones:
 * 1. Solicitudes de cotización (RFQ) enviadas: con al menos una cotización ingresada, para comparar ofertas por proveedor.
 * 2. Requerimientos de compra: listos para comparar (sistema compras) y generar orden.
 */
@Component({
  selector: 'app-compare-quotes-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    CardModule,
  ],
  providers: [MessageService],
  templateUrl: './compare-quotes.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompareQuotesPage implements OnInit {
  private readonly requirementsApi = inject(PurchasesRequirementsApiService);
  private readonly quotesApi = inject(PurchasesQuotesApiService);
  private readonly rfqsService = inject(RfqsService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly tenantService = inject(TenantService);

  // ── Sección 1: RFQs (solicitudes enviadas con cotizaciones para comparar) ──
  rfqs = signal<Rfq[]>([]);
  loadingRfqs = signal<boolean>(true);

  // ── Sección 2: Requerimientos de compra ───────────────────────────────────
  requirements = signal<PurchaseRequirement[]>([]);
  quotesCountByRequirement = signal<Record<string, number>>({});
  loadingRequirements = signal<boolean>(true);

  ngOnInit(): void {
    this.loadRfqs();
    this.loadRequirements();
  }

  loadRfqs(): void {
    this.loadingRfqs.set(true);
    this.rfqsService.getRfqs().subscribe({
      next: (list) => {
        // Mostrar RFQs enviadas (Publicada) o cerradas (Cerrada): desde aquí se abre la vista para comparar cotizaciones
        const forCompare = list.filter((r) => r.status === 'Publicada' || r.status === 'Cerrada');
        this.rfqs.set(forCompare);
      },
      error: () => this.loadingRfqs.set(false),
      complete: () => this.loadingRfqs.set(false),
    });
  }

  goToRfqCompare(rfqId: string): void {
    this.router.navigate(['/logistics/quotes/view', rfqId]);
  }

  loadRequirements(): void {
    if (!this.tenantService.tenantId()) {
      this.requirements.set([]);
      this.loadingRequirements.set(false);
      return;
    }
    this.loadingRequirements.set(true);
    this.requirementsApi
      .list({
        status: 'listo_para_comparar',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      .subscribe({
        next: (list) => {
          this.requirements.set(list);
          this.loadQuotesCounts(list.map((r) => r._id));
        },
        error: (err) => {
          this.requirements.set([]);
          const msg = err?.error?.message || err?.message || 'Error al cargar requerimientos.';
          this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
        },
        complete: () => this.loadingRequirements.set(false),
      });
  }

  load(): void {
    this.loadRfqs();
    this.loadRequirements();
  }

  private loadQuotesCounts(ids: string[]): void {
    const counts: Record<string, number> = {};
    if (ids.length === 0) {
      this.quotesCountByRequirement.set(counts);
      return;
    }
    let done = 0;
    ids.forEach((id) => {
      this.quotesApi.listByRequirement(id).subscribe({
        next: (quotes) => {
          counts[id] = quotes?.length ?? 0;
          done++;
          if (done === ids.length) this.quotesCountByRequirement.set(counts);
        },
        error: () => {
          counts[id] = 0;
          done++;
          if (done === ids.length) this.quotesCountByRequirement.set(counts);
        },
      });
    });
  }

  getQuotesCount(id: string): number {
    return this.quotesCountByRequirement()[id] ?? 0;
  }

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

  statusSeverity(status: string): 'success' | 'info' | 'warn' | 'secondary' {
    if (status === 'listo_para_comparar') return 'info';
    if (status === 'cotizaciones_pendientes') return 'warn';
    if (status === 'borrador') return 'secondary';
    if (status === 'adjudicado' || status === 'cerrado') return 'success';
    return 'info';
  }

  rfqStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'secondary' | 'danger' {
    if (status === 'Publicada') return 'info';
    if (status === 'Cerrada') return 'success';
    if (status === 'Cancelada') return 'danger';
    return 'secondary';
  }

  goToCompare(requirementId: string): void {
    this.router.navigate(['/purchases/requirements', requirementId, 'compare']);
  }
}
