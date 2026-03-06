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
import { MessageService } from 'primeng/api';
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
  ],
  providers: [MessageService],
  templateUrl: './quote-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteViewComponent implements OnInit {
  private readonly rfqsService = inject(RfqsService);
  private readonly supplierQuotesApi = inject(SupplierQuotesApiService);
  private readonly providersService = inject(ProvidersService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  rfq = signal<Rfq | null>(null);
  loading = signal<boolean>(true);
  approvingQuoteId = signal<string | null>(null);

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

  // ── Aprobar RFQ (Borrador → Aprobada) ────────────────────────────────────

  approveRfq(): void {
    const rfq = this.rfq();
    if (!rfq?._id) return;
    this.publishing.set(true);
    this.rfqsService.approveRfq(rfq._id).subscribe({
      next: (updated) => {
        this.rfq.set(updated);
        this.messageService.add({
          severity: 'success',
          summary: 'Solicitud aprobada',
          detail:
            'La solicitud pasó a "Aprobada" y ya aparece en "Solicitar cotización a proveedor".',
        });
        this.publishing.set(false);
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

  // ── Publicar RFQ (Aprobada → Publicada, al enviar correos) ───────────────

  publishRfq(): void {
    const rfq = this.rfq();
    if (!rfq?._id) return;
    this.rfqsService.publishRfq(rfq._id).subscribe({
      next: (updated) => this.rfq.set(updated),
    });
  }

  // ── Enviar solicitud a proveedores por correo ────────────────────────────

  openSendDialog(): void {
    this.selectedSendProviders = [];
    this.loadingProviders.set(true);
    this.sendDialogVisible.set(true);
    this.providersService.getProviders({ isActive: true }).subscribe({
      next: (list) => {
        this.allProviders.set(list);
        // Preselect providers that already have supplier quotes
        const rfq = this.rfq();
        if (rfq?.supplierQuotes?.length) {
          const linkedIds = new Set(
            rfq.supplierQuotes.map((sq) => {
              const p = sq.providerId;
              return typeof p === 'object' ? ((p as any)._id ?? '') : String(p);
            }),
          );
          this.selectedSendProviders = list.filter((p) => p._id && linkedIds.has(p._id));
        }
        this.loadingProviders.set(false);
      },
      error: () => this.loadingProviders.set(false),
    });
  }

  closeSendDialog(): void {
    this.sendDialogVisible.set(false);
    this.selectedSendProviders = [];
  }

  sendToProviders(): void {
    const rfq = this.rfq();
    const providers = this.selectedSendProviders;

    if (!rfq || providers.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin proveedores',
        detail: 'Seleccione al menos un proveedor para enviar la solicitud.',
      });
      return;
    }

    const items = (rfq.items ?? [])
      .map((it, i) => {
        const name = typeof it.productId === 'object' ? (it.productId as any).name : 'Ítem';
        return `${i + 1}. ${name} — Cantidad: ${it.quantity}${it.notes ? ' (${it.notes})' : ''}`;
      })
      .join('\n');

    const body = encodeURIComponent(
      `Solicitud de cotización: ${rfq.title}\n\n` +
        (rfq.description ? `${rfq.description}\n\n` : '') +
        'Ítems solicitados:\n' +
        items +
        (rfq.deadline
          ? `\n\nFecha límite para recepción: ${new Date(rfq.deadline).toLocaleDateString('es-PE')}`
          : '') +
        (rfq.termsAndConditions ? `\n\nTérminos y condiciones:\n${rfq.termsAndConditions}` : '') +
        '\n\nPor favor, envíe su cotización respondiendo este correo o ingrese al sistema Momentum.',
    );
    const subject = encodeURIComponent(`Solicitud de cotización: ${rfq.code} — ${rfq.title}`);

    const emails: string[] = [];
    providers.forEach((p) => {
      const contact = p.contacts?.find((c) => c.email);
      if (contact?.email) emails.push(contact.email);
    });

    if (emails.length > 0) {
      window.location.href = `mailto:${emails.join(',')}?subject=${subject}&body=${body}`;
      this.messageService.add({
        severity: 'success',
        summary: 'Correo preparado',
        detail: `Cliente de correo abierto con ${emails.length} destinatario(s).`,
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin correo de contacto',
        detail:
          'Los proveedores seleccionados no tienen email registrado. Agregue el contacto en la ficha del proveedor.',
      });
    }

    // Si el RFQ aún está en borrador, publicarlo
    if (rfq.status === 'Borrador' && rfq._id) {
      this.rfqsService.publishRfq(rfq._id).subscribe({
        next: (updated) => this.rfq.set(updated),
      });
    }

    this.closeSendDialog();
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
    const rfqId = this.rfq()?._id;
    if (!rfqId) return;
    this.approvingQuoteId.set(quote._id);
    this.supplierQuotesApi.update(quote._id, { status: 'Aprobada' }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Cotización aprobada',
          detail: 'La cotización del proveedor ha sido aprobada.',
        });
        this.loadRfq(rfqId);
        this.approvingQuoteId.set(null);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'No se pudo aprobar la cotización.',
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
}
