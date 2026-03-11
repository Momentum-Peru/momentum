import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { SupplierQuotesApiService } from '../../../shared/services/supplier-quotes-api.service';
import { SupplierQuote } from '../../../shared/interfaces/supplier-quote.interface';
import { TenantService } from '../../../core/services/tenant.service';

/**
 * Vista "Cotizaciones de Proveedores"
 * Muestra las cotizaciones recibidas de proveedores en una tabla centralizada.
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
    DialogModule,
  ],
  providers: [MessageService],
  templateUrl: './quote-entry.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteEntryPage implements OnInit {
  private readonly supplierQuotesApi = inject(SupplierQuotesApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly tenantService = inject(TenantService);

  quotes = signal<SupplierQuote[]>([]);
  loading = signal<boolean>(true);

  // Dialog State
  viewDialogVisible = signal<boolean>(false);
  selectedQuote = signal<SupplierQuote | null>(null);

  ngOnInit(): void {
    this.loadQuotes();
  }

  loadQuotes(): void {
    if (!this.tenantService.tenantId()) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.supplierQuotesApi.list().subscribe({
      next: (list) => {
        const sorted = [...list].sort((a: any, b: any) => {
          const codeA = a.rfqId?.code || '';
          const codeB = b.rfqId?.code || '';
          return codeA.localeCompare(codeB);
        });
        this.quotes.set(sorted);
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Error al cargar cotizaciones.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
      },
      complete: () => this.loading.set(false),
    });
  }

  load(): void {
    this.loadQuotes();
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      Pendiente: 'Pendiente',
      Aprobada: 'Aprobada',
      Rechazada: 'Rechazada',
    };
    return labels[status] ?? status;
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'secondary' | 'danger' {
    if (status === 'Pendiente') return 'warn';
    if (status === 'Aprobada') return 'success';
    if (status === 'Rechazada') return 'danger';
    return 'secondary';
  }

  goToEnterQuotePage(): void {
    this.router.navigate(['/logistics/quote-entry/new']);
  }

  goToViewQuote(quote: SupplierQuote): void {
    this.selectedQuote.set(quote);
    this.viewDialogVisible.set(true);
  }
}

