import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ListboxModule } from 'primeng/listbox';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { RfqsService, Rfq, SupplierQuote, RfqItem } from '../../../../shared/services/rfqs.service';
import { SupplierQuotesApiService } from '../../../../shared/services/supplier-quotes-api.service';
import { ProvidersService, Provider } from '../../../../shared/services/providers.service';
import { RouterModule } from '@angular/router';

/** Fila editable de ítem en el diálogo de ingreso de precios */
interface PriceLineEntry {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

@Component({
  selector: 'app-quote-view',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    DividerModule,
    RouterModule,
    ToastModule,
    DialogModule,
    ListboxModule,
    FormsModule,
    InputNumberModule,
    DatePickerModule,
    TextareaModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './quote-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteViewComponent implements OnInit {
  private readonly rfqsService = inject(RfqsService);
  private readonly supplierQuotesApi = inject(SupplierQuotesApiService);
  private readonly providersService = inject(ProvidersService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  rfq = signal<Rfq | null>(null);
  loading = signal<boolean>(true);
  approvingQuoteId = signal<string | null>(null);
  mode = signal<'detail' | 'compare'>('detail');

  // ── Publicar / Enviar a proveedores ──────────────────────────────────────
  publishing = signal<boolean>(false);
  sendDialogVisible = signal<boolean>(false);
  allProviders = signal<Provider[]>([]);
  selectedSendProviders: Provider[] = [];
  loadingProviders = signal<boolean>(false);

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadRfq(id);
      } else {
        this.goBack();
      }
    });

    this.route.queryParamMap.subscribe((params) => {
      const m = params.get('mode');
      this.mode.set(m === 'compare' ? 'compare' : 'detail');
    });
  }

  loadRfq(id: string) {
    this.loading.set(true);
    this.rfqsService.getRfq(id).subscribe({
      next: (data) => {
        this.rfq.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.goBack();
      },
    });
  }

  goBack() {
    this.router.navigate(['/logistics/quotes']);
  }

  // ── Aprobar RFQ (Borrador → Publicada) ────────────────────────────────────

  approveRfq(): void {
    const rfq = this.rfq();
    if (!rfq?._id) return;
    this.publishing.set(true);
    this.rfqsService.approveRfq(rfq._id).subscribe({
      next: (updated) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Solicitud enviada',
          detail: 'La solicitud se aprobó y se enviaron los correos a los proveedores.',
        });
        this.publishing.set(false);
        setTimeout(() => this.goBack(), 1500); // Redirect back
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'No se pudo aprobar la solicitud.',
        });
        this.publishing.set(false);
      },
    });
  }

  // ── Ingresar precios de cotización del proveedor ─────────────────────────

  priceDialogVisible = signal<boolean>(false);
  savingPrices = signal<boolean>(false);
  editingQuote = signal<SupplierQuote | null>(null);
  priceLines = signal<PriceLineEntry[]>([]);
  priceDeadline: Date | null = null;
  priceNotes = '';
  readonly today = new Date();

  openPriceDialog(quote: SupplierQuote): void {
    const rfq = this.rfq();
    if (!rfq) return;
    this.editingQuote.set(quote);
    // Inicializar líneas con los ítems del RFQ; si ya tiene precios, precargarlos
    this.priceLines.set(
      rfq.items.map((item: RfqItem, i: number) => {
        const name = typeof item.productId === 'object' ? (item.productId as any).name : 'Ítem';
        const existing = quote.items?.[i];
        return {
          productName: name,
          quantity: item.quantity,
          unitPrice: existing?.unitPrice ?? 0,
          totalPrice: existing?.totalPrice ?? 0,
        };
      }),
    );
    this.priceDeadline = quote.deadline ? new Date(quote.deadline) : null;
    this.priceNotes = quote.notes ?? '';
    this.priceDialogVisible.set(true);
  }

  closePriceDialog(): void {
    this.priceDialogVisible.set(false);
    this.editingQuote.set(null);
    this.priceLines.set([]);
    this.priceDeadline = null;
    this.priceNotes = '';
  }

  onUnitPriceChange(line: PriceLineEntry): void {
    line.totalPrice = +(line.unitPrice * line.quantity).toFixed(2);
  }

  get priceTotalCost(): number {
    return this.priceLines().reduce((sum, l) => sum + (l.totalPrice || 0), 0);
  }

  savePrices(): void {
    const quote = this.editingQuote();
    const rfqId = this.rfq()?._id;
    if (!quote?._id || !rfqId) return;
    this.savingPrices.set(true);
    const payload = {
      items: this.priceLines().map((l) => ({
        productId: undefined as any, // el back no requiere productId al actualizar
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        totalPrice: l.totalPrice,
      })),
      totalCost: this.priceTotalCost,
      deadline: this.priceDeadline ? this.priceDeadline.toISOString() : undefined,
      notes: this.priceNotes || undefined,
    };
    this.supplierQuotesApi.update(quote._id, payload as any).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Cotización ingresada',
          detail: 'Los precios del proveedor fueron guardados correctamente.',
        });
        this.closePriceDialog();
        this.loadRfq(rfqId);
        this.savingPrices.set(false);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'No se pudo guardar la cotización.',
        });
        this.savingPrices.set(false);
      },
    });
  }

  // ── Aprobar cotización de proveedor ──────────────────────────────────────

  approveQuote(quote: SupplierQuote) {
    if (!quote._id) return;

    this.confirmationService.confirm({
      message: `
          <div class="space-y-2 text-slate-700">
            <p>Se aprobará la cotización de <strong>${this.getProviderName(quote)}</strong>.</p>
            <ul class="list-disc pl-5 text-sm text-slate-600">
               <li>Se generará automáticamente la <strong>Orden de Compra/Servicio</strong>.</li>
               <li>Se enviará un correo al proveedor con la OC adjunta en PDF.</li>
               <li>Si el proveedor no tiene usuario, se creará uno y se enviarán las credenciales.</li>
            </ul>
            <p class="font-bold mt-2">¿Desea continuar?</p>
          </div>
      `,
      header: 'Confirmar Aprobación y Generación de OC',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, Aprobar y Generar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.executeApproveOrder(quote._id!);
      }
    });
  }

  executeApproveOrder(quoteId: string) {
    const rfqId = this.rfq()?._id;
    if (!rfqId) return;
    this.approvingQuoteId.set(quoteId);

    this.supplierQuotesApi.approveAndGenerateOrder(quoteId).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Orden Generada',
          detail: `La Orden ${res.orderNumber || ''} fue generada y enviada correctamente.`,
          life: 5000,
        });
        this.loadRfq(rfqId);
        this.approvingQuoteId.set(null);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'No se pudo aprobar y generar la orden.',
        });
        this.approvingQuoteId.set(null);
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getStatusSeverity(status: string): 'info' | 'success' | 'warn' | 'secondary' | 'danger' {
    switch (status) {
      case 'Borrador':
        return 'secondary';
      case 'Publicada':
        return 'info';
      case 'Cerrada':
        return 'success';
      case 'Cancelada':
        return 'danger';
      default:
        return 'info';
    }
  }

  getQuoteStatusSeverity(status: string): 'info' | 'success' | 'warn' | 'secondary' | 'danger' {
    switch (status) {
      case 'Pendiente':
        return 'warn';
      case 'Aprobada':
        return 'success';
      case 'Rechazada':
        return 'danger';
      default:
        return 'info';
    }
  }

  getTotalReferencePrice(): number {
    const data = this.rfq();
    if (!data) return 0;
    return data.items.reduce((acc, current) => {
      const price =
        typeof current.productId === 'object' && current.productId !== null
          ? (current.productId as any).basePrice || 0
          : 0;
      return acc + price * current.quantity;
    }, 0);
  }

  getProviderName(quote: SupplierQuote): string {
    const p = quote.providerId;
    if (typeof p === 'object' && p !== null) {
      return (p as any).name || (p as any).businessName || 'Proveedor';
    }
    return 'Proveedor';
  }

  get rfqType(): 'bien' | 'servicio' {
    const rfq = this.rfq();
    if (!rfq?.items?.length) return 'bien';
    // Se asume que productId está poblado con { name, type, ... }
    return (rfq.items[0].productId as any)?.type || 'bien';
  }

  get hasPricedQuotes(): boolean {
    const quotes = this.rfq()?.supplierQuotes;
    return !!quotes?.some(q => (q.totalCost ?? 0) > 0);
  }
}
