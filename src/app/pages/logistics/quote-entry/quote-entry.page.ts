import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { SupplierQuotesApiService } from '../../../shared/services/supplier-quotes-api.service';
import { SupplierQuote } from '../../../shared/interfaces/supplier-quote.interface';
import { TenantService } from '../../../core/services/tenant.service';

@Component({
  selector: 'app-quote-entry-page',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TableModule,
    ToastModule,
    TooltipModule,
    CardModule,
    DialogModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './quote-entry.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteEntryPage implements OnInit {
  private readonly supplierQuotesApi = inject(SupplierQuotesApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly tenantService = inject(TenantService);

  quotes = signal<SupplierQuote[]>([]);
  loading = signal<boolean>(true);

  viewDialogVisible = false;
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

  goToEnterQuotePage(): void {
    this.router.navigate(['/logistics/quote-entry/new']);
  }

  openViewDialog(quote: SupplierQuote): void {
    this.selectedQuote.set(quote);
    this.viewDialogVisible = true;
  }

  editQuote(quote: SupplierQuote): void {
    this.router.navigate(['/logistics/quote-entry/edit', quote._id]);
  }

  confirmDelete(quote: SupplierQuote): void {
    this.confirmationService.confirm({
      message: `¿Eliminar la cotización del proveedor <strong>${
        (quote.providerId as any)?.name || (quote.providerId as any)?.businessName || 'seleccionado'
      }</strong>? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteQuote(quote),
    });
  }

  private deleteQuote(quote: SupplierQuote): void {
    this.supplierQuotesApi.delete(quote._id!).subscribe({
      next: () => {
        this.quotes.update((list) => list.filter((q) => q._id !== quote._id));
        this.messageService.add({
          severity: 'success',
          summary: 'Eliminada',
          detail: 'La cotización fue eliminada correctamente.',
        });
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al eliminar la cotización.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
      },
    });
  }
}
