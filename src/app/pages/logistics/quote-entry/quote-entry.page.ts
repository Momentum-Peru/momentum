import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
 * Vista "Ingresar cotizaciones" del flujo de logística.
 * Muestra dos secciones:
 * 1. RFQs en estado "Publicada" (solicitudes enviadas a proveedores que esperan respuesta).
 * 2. Requerimientos de compra (sistema Purchases) en borrador o cotizaciones_pendientes.
 */
@Component({
  selector: 'app-quote-entry-page',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    CardModule,
  ],
  providers: [MessageService],
  templateUrl: './quote-entry.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteEntryPage implements OnInit {
  private readonly requirementsApi = inject(PurchasesRequirementsApiService);
  private readonly quotesApi = inject(PurchasesQuotesApiService);
  private readonly rfqsService = inject(RfqsService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly tenantService = inject(TenantService);

  // ── Sección 1: RFQs enviadas ──────────────────────────────────────────────
  rfqs = signal<Rfq[]>([]);
  loadingRfqs = signal<boolean>(true);

  // ── Sección 2: Requerimientos de compra ──────────────────────────────────
  requirements = signal<PurchaseRequirement[]>([]);
  quotesCountByRequirement = signal<Record<string, number>>({});
  loadingRequirements = signal<boolean>(true);

  ngOnInit(): void {
    this.loadRfqs();
    this.loadRequirements();
  }

  // ── Carga de RFQs ─────────────────────────────────────────────────────────

  loadRfqs(): void {
    this.loadingRfqs.set(true);
    this.rfqsService.getRfqs().subscribe({
      next: (list) => {
        // Solo las que ya fueron enviadas a proveedores y esperan respuesta
        this.rfqs.set(list.filter((r) => r.status === 'Publicada'));
      },
      error: () => this.loadingRfqs.set(false),
      complete: () => this.loadingRfqs.set(false),
    });
  }

  goToRfqView(rfqId: string): void {
    this.router.navigate(['/logistics/quotes/view', rfqId]);
  }

  // ── Carga de Requerimientos de compra ─────────────────────────────────────

  loadRequirements(): void {
    if (!this.tenantService.tenantId()) {
      this.loadingRequirements.set(false);
      return;
    }
    this.loadingRequirements.set(true);
    this.requirementsApi.list({ sortBy: 'createdAt', sortOrder: 'desc' }).subscribe({
      next: (list) => {
        const eligible = list.filter(
          (r) => r.status === 'borrador' || r.status === 'cotizaciones_pendientes',
        );
        this.requirements.set(eligible);
        this.loadQuotesCounts(eligible.map((r) => r._id));
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

  rfqItemsLabel(rfq: Rfq): string {
    return `${rfq.items?.length ?? 0} ítem(s)`;
  }

  requirementStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      borrador: 'Borrador',
      cotizaciones_pendientes: 'Cot. pendientes',
      listo_para_comparar: 'Listo para comparar',
      adjudicado: 'Adjudicado',
      cerrado: 'Cerrado',
    };
    return labels[status] ?? status;
  }

  requirementStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'secondary' {
    if (status === 'cotizaciones_pendientes') return 'warn';
    if (status === 'listo_para_comparar') return 'info';
    if (status === 'borrador') return 'secondary';
    return 'success';
  }

  goToEnterQuotePage(): void {
    this.router.navigate(['/logistics/quote-entry/enter']);
  }

  goToEnterQuote(requirementId: string): void {
    this.router.navigate(['/purchases/requirements', requirementId, 'quote']);
  }
}
