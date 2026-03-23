import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { FileUploadModule, FileSelectEvent } from 'primeng/fileupload';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { SupplierQuotesApiService } from '../../../shared/services/supplier-quotes-api.service';
import { RfqsService, Rfq, RfqItem } from '../../../shared/services/rfqs.service';
import { ProvidersService } from '../../../shared/services/providers.service';
import { UploadService } from '../../../shared/services/upload.service';
import { TenantService } from '../../../core/services/tenant.service';
import {
  SupplierQuote,
  SupplierQuoteItem,
} from '../../../shared/interfaces/supplier-quote.interface';

interface QuoteLine {
  productId: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  includesIgv: boolean;
  brandOrModel: string;
}

@Component({
  selector: 'app-enter-supplier-quote-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ButtonModule,
    CardModule,
    SelectModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    DatePickerModule,
    FileUploadModule,
    TagModule,
    ToastModule,
    DividerModule,
  ],
  providers: [MessageService],
  templateUrl: './enter-supplier-quote.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnterSupplierQuotePage implements OnInit {
  private readonly rfqsService = inject(RfqsService);
  private readonly quotesApi = inject(SupplierQuotesApiService);
  private readonly providersService = inject(ProvidersService);
  private readonly uploadService = inject(UploadService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  private readonly tenantService = inject(TenantService);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  loadingRfqs = signal(true);
  loadingRfq = signal(false);

  rfqOptions = signal<{ label: string; value: string }[]>([]);
  selectedRfqId: string | null = null;
  rfq = signal<Rfq | null>(null);
  existingQuotes = signal<SupplierQuote[]>([]);
  providers = signal<{ label: string; value: string }[]>([]);

  currencyOptions = [
    { label: 'Soles (PEN)', value: 'PEN' },
    { label: 'Dólares (USD)', value: 'USD' },
  ];

  // ── Campos del formulario ──────────────────────────────────────────────────
  providerId: string | null = null;
  currency = 'PEN';
  subtotal = 0;
  igv = 0;
  totalCost = 0;
  deliveryTime = '';
  validityDays: number | null = null;
  paymentTerms = '';
  notes = '';
  lines: QuoteLine[] = [];
  pendingFiles: File[] = [];

  // Configuración de cálculos
  autoCalculateTotal = true;

  // ── Estado ────────────────────────────────────────────────────────────────
  saving = signal(false);
  uploadingFiles = signal(false);

  rfqItems = computed<RfqItem[]>(() => this.rfq()?.items ?? []);
  needMoreQuotes = computed(() => Math.max(0, 2 - this.existingQuotes().length));

  ngOnInit(): void {
    this.loadRfqs();
    this.loadProviders();

    // Ver si venimos con un RFQ desde la URL
    this.route.queryParamMap.subscribe((params) => {
      const rfqId = params.get('rfqId');
      if (rfqId) {
        this.selectedRfqId = rfqId;
        this.onRfqChange(rfqId);
      }
    });
  }

  // ── Carga de datos ─────────────────────────────────────────────────────────

  private loadRfqs(): void {
    if (!this.tenantService.tenantId()) {
      this.loadingRfqs.set(false);
      this.messageService.add({
        severity: 'warn',
        summary: 'Empresa no seleccionada',
        detail: 'Seleccione una empresa para continuar.',
      });
      return;
    }
    this.loadingRfqs.set(true);
    this.rfqsService.getRfqs().subscribe({
      next: (list) => {
        // Mostrar solo RFQs enviadas a proveedores (Publicada)
        const eligible = list.filter((r) => r.status === 'Publicada');
        this.rfqOptions.set(
          eligible.map((r) => ({
            label: `[${r.code}] ${r.title}`,
            value: r._id!,
          })),
        );
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las solicitudes de cotización.',
        });
      },
      complete: () => this.loadingRfqs.set(false),
    });
  }

  private loadProviders(): void {
    this.providersService.getProviders({ isActive: true }).subscribe({
      next: (list) =>
        this.providers.set(
          list.map((p) => ({ label: p.name + (p.taxId ? ` (${p.taxId})` : ''), value: p._id! })),
        ),
    });
  }

  onRfqChange(id: string | null): void {
    this.selectedRfqId = id;
    this.rfq.set(null);
    this.lines = [];
    this.existingQuotes.set([]);
    if (!id) return;

    this.loadingRfq.set(true);
    this.rfqsService.getRfq(id).subscribe({
      next: (r) => {
        this.rfq.set(r);
        this.lines = (r.items ?? []).map((item) => {
          const prod: any = item.productId || {};
          return {
            productId: prod._id || '',
            description: prod.name || item.notes || 'Ítem',
            unit: prod.unitOfMeasure || 'und',
            quantity: item.quantity,
            unitPrice: 0,
            totalPrice: 0,
            includesIgv: true, // Default in Peru
            brandOrModel: '',
          };
        });
      },
      complete: () => this.loadingRfq.set(false),
    });

    this.quotesApi.list(undefined, id).subscribe({
      next: (list) => this.existingQuotes.set(list),
    });
  }

  // ── Archivos ───────────────────────────────────────────────────────────────

  onFilesSelected(event: FileSelectEvent): void {
    this.pendingFiles = event.currentFiles ?? [];
  }

  private async uploadFiles(quoteId: string): Promise<void> {
    if (this.pendingFiles.length === 0) return;
    this.uploadingFiles.set(true);
    const uploads = this.pendingFiles.map(
      (file) =>
        new Promise<void>((resolve) => {
          this.uploadService.upload('supplier-quotes', quoteId, file).subscribe({
            next: () => resolve(),
            error: () => resolve(),
          });
        }),
    );
    await Promise.all(uploads);
    this.uploadingFiles.set(false);
  }

  // ── Cálculos ────────────────────────────────────────────────────────────────

  onLinePriceChange(line: QuoteLine) {
    line.totalPrice = line.unitPrice * line.quantity;
    if (this.autoCalculateTotal) {
      this.calculateTotalsForm();
    }
  }

  calculateTotalsForm() {
    // Suma de líneas
    const sum = this.lines.reduce((acc, l) => acc + (l.totalPrice || 0), 0);

    // Si todos incluyen IGV, subtotal = sum / 1.18
    // Si ninguno incluye IGV, subtotal = sum
    // Dado que puede ser mixto, un acercamiento simplificado:
    let totalIgv = 0;
    let totalSinIgv = 0;

    for (const line of this.lines) {
      if (line.includesIgv) {
        totalSinIgv += line.totalPrice / 1.18;
        totalIgv += line.totalPrice - line.totalPrice / 1.18;
      } else {
        totalSinIgv += line.totalPrice;
        totalIgv += line.totalPrice * 0.18;
      }
    }

    this.subtotal = parseFloat(totalSinIgv.toFixed(2));
    this.igv = parseFloat(totalIgv.toFixed(2));
    this.totalCost = parseFloat((totalSinIgv + totalIgv).toFixed(2));
  }

  // ── Envío del formulario ───────────────────────────────────────────────────

  getProviderName(q: SupplierQuote): string {
    const p = q.providerId;
    if (p && typeof p === 'object') return (p as any).businessName || (p as any).name || '-';
    return '-';
  }

  isFormValid(): boolean {
    return !!(this.selectedRfqId && this.providerId && this.totalCost > 0);
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail: 'Seleccione la solicitud de cotización, el proveedor y el monto total.',
      });
      return;
    }

    const currentRfq = this.rfq();
    if (!currentRfq) return;

    let projectId: string | undefined;
    if (currentRfq.projectId) {
      projectId =
        typeof currentRfq.projectId === 'string' ? currentRfq.projectId : currentRfq.projectId._id;
    }

    const payload: Partial<SupplierQuote> = {
      projectId,
      providerId: this.providerId!,
      rfqId: this.selectedRfqId!,
      items: this.lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        totalPrice: l.totalPrice,
        includesIgv: l.includesIgv,
        brandOrModel: l.brandOrModel || undefined,
      })),
      currency: this.currency,
      subtotal: this.subtotal,
      igv: this.igv,
      totalCost: this.totalCost,
      deliveryTime: this.deliveryTime || undefined,
      validityDays: this.validityDays ?? undefined,
      paymentTerms: this.paymentTerms || undefined,
      notes: this.notes || undefined,
      status: 'Pendiente',
    };

    this.saving.set(true);
    this.quotesApi.create(payload).subscribe({
      next: async (quote) => {
        if (quote._id) {
          await this.uploadFiles(quote._id);
        }
        this.messageService.add({
          severity: 'success',
          summary: 'Cotización registrada',
          detail: 'La cotización fue ingresada correctamente.',
        });
        setTimeout(() => this.router.navigate(['/logistics/quote-entry']), 1500);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al registrar la cotización.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
        this.saving.set(false);
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/logistics/quote-entry']);
  }
}
