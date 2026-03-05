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
import { TenantService } from '../../../core/services/tenant.service';
import { PurchaseRequirement } from '../../../shared/interfaces/purchase.interface';

/**
 * Vista "Comparar cotizaciones" del flujo de logística.
 * Lista requerimientos de compra que tienen cotizaciones y están listos para comparar.
 * Cada fila permite ir a la vista existente de comparación por requerimiento.
 */
@Component({
  selector: 'app-compare-quotes-page',
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
  templateUrl: './compare-quotes.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompareQuotesPage implements OnInit {
  private readonly requirementsApi = inject(PurchasesRequirementsApiService);
  private readonly quotesApi = inject(PurchasesQuotesApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly tenantService = inject(TenantService);

  requirements = signal<PurchaseRequirement[]>([]);
  quotesCountByRequirement = signal<Record<string, number>>({});
  loading = signal<boolean>(true);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (!this.tenantService.tenantId()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Empresa no seleccionada',
        detail: 'Seleccione una empresa para ver los requerimientos listos para comparar.',
      });
      this.requirements.set([]);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
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
        complete: () => this.loading.set(false),
      });
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

  goToCompare(requirementId: string): void {
    this.router.navigate(['/purchases/requirements', requirementId, 'compare']);
  }
}
