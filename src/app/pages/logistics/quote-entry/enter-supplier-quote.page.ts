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
import { ProductsService, Product } from '../../../shared/services/products.service';
import { ProjectsApiService } from '../../../shared/services/projects-api.service';
import { Project } from '../../../shared/interfaces/project.interface';
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
  private readonly productsService = inject(ProductsService);
  private readonly projectsService = inject(ProjectsApiService);
  private readonly uploadService = inject(UploadService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  private readonly tenantService = inject(TenantService);

  // ── Modo edición ───────────────────────────────────────────────────────────
  editId = signal<string | null>(null);
  editMode = computed(() => !!this.editId());

  // ── Carga inicial ──────────────────────────────────────────────────────────
  loadingRfqs = signal(true);
  loadingRfq = signal(false);
  loadingEdit = signal(false);

  rfqOptions = signal<{ label: string; value: string }[]>([]);
  selectedRfqId: string | null = null;
  rfq = signal<Rfq | null>(null);
  existingQuotes = signal<SupplierQuote[]>([]);
  providers = signal<{ label: string; value: string }[]>([]);
  productList = signal<Product[]>([]);
  projects = signal<Project[]>([]);
  productOptions = computed(() =>
    this.productList().map((p) => ({
      label: `${p.name}${p.code ? ' [' + p.code + ']' : ''} (${p.unitOfMeasure})`,
      value: p._id!,
      unit: p.unitOfMeasure,
      basePrice: p.basePrice ?? null,
    })),
  );

  currencyOptions = [
    { label: 'Soles (PEN)', value: 'PEN' },
    { label: 'Dólares (USD)', value: 'USD' },
  ];

  // ── Campos del formulario ──────────────────────────────────────────────────
  providerId: string | null = null;
  projectId: string | null = null;
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
  isManualMode = computed(() => !this.rfq());

  ngOnInit(): void {
    this.loadProviders();
    this.loadProducts();
    this.loadProjects();

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId) {
      this.editId.set(routeId);
      this.loadExistingQuote(routeId);
    } else {
      // Modo nuevo
      this.loadRfqs();
      this.route.queryParamMap.subscribe((params) => {
        const rfqId = params.get('rfqId');
        if (rfqId) {
          this.selectedRfqId = rfqId;
          this.onRfqChange(rfqId);
        }
      });
    }
  }

  // ── Carga de datos ─────────────────────────────────────────────────────────

  private loadExistingQuote(id: string): void {
    this.loadingEdit.set(true);
    this.quotesApi.getById(id).subscribe({
      next: (quote) => {
        this.providerId =
          typeof quote.providerId === 'string' ? quote.providerId : (quote.providerId as any)._id;

        // Centro de costo
        this.projectId = typeof quote.projectId === 'string' ? quote.projectId : (quote.projectId as any)?._id || null;

        // Moneda y totales
        this.currency = quote.currency ?? 'PEN';
        this.subtotal = quote.subtotal ?? 0;
        this.igv = quote.igv ?? 0;
        this.totalCost = quote.totalCost ?? 0;

        // Condiciones
        this.deliveryTime = quote.deliveryTime ?? '';
        this.validityDays = quote.validityDays ?? null;
        this.paymentTerms = quote.paymentTerms ?? '';
        this.notes = quote.notes ?? '';

        // RFQ vinculado
        if (quote.rfqId) {
          const rfqId =
            typeof quote.rfqId === 'string' ? quote.rfqId : (quote.rfqId as any)._id;
          this.selectedRfqId = rfqId;
          this.loadRfqs(this.projectId || undefined); // Load RFQs filtered by project if available
          this.onRfqChange(rfqId);
        } else if (this.projectId) { // If no RFQ but project is set, load RFQs for that project
          this.loadRfqs(this.projectId);
        }
        else {
          // Manual: cargar ítems
          this.lines = (quote.items ?? []).map((item) => ({
            productId: typeof item.productId === 'string' ? item.productId : (item.productId as any)?._id ?? '',
            description: item.description ?? (item.productId as any)?.name ?? '',
            unit: (item.productId as any)?.unitOfMeasure ?? 'und',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            includesIgv: item.includesIgv ?? true,
            brandOrModel: item.brandOrModel ?? '',
          }));
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la cotización.',
        });
      },
      complete: () => this.loadingEdit.set(false),
    });
  }

  private loadRfqs(projectId?: string): void {
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
    this.rfqsService.getRfqs(projectId).subscribe({
      next: (list) => {
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

  onProjectChange(projectId: string | null): void {
    this.projectId = projectId;
    this.selectedRfqId = null;
    this.rfq.set(null);
    this.loadRfqs(projectId || undefined);
  }

  private loadProviders(): void {
    this.providersService.getProviders({ isActive: true }).subscribe({
      next: (list) =>
        this.providers.set(
          list.map((p) => ({ label: p.name + (p.taxId ? ` (${p.taxId})` : ''), value: p._id! })),
        ),
    });
  }

  private loadProducts(): void {
    this.productsService.getProducts({ isActive: true }).subscribe({
      next: (list) => this.productList.set(list),
    });
  }
  
  private loadProjects(): void {
    this.projectsService.listActive().subscribe({
      next: (list) => this.projects.set(list),
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
        // En modo edición los ítems ya vienen con precios; en modo nuevo se inicializan en 0
        if (!this.editMode()) {
          this.lines = (r.items ?? []).map((item) => {
            const prod: any = item.productId || {};
            return {
              productId: prod._id || '',
              description: prod.name || item.notes || 'Ítem',
              unit: prod.unitOfMeasure || 'und',
              quantity: item.quantity,
              unitPrice: 0,
              totalPrice: 0,
              includesIgv: true,
              brandOrModel: '',
            };
          });
        }
        
        // Auto-fill projectId from RFQ
        if (r.projectId) {
          this.projectId = typeof r.projectId === 'string' ? r.projectId : (r.projectId as any)._id;
        }
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
    return !!(this.providerId && this.projectId && this.totalCost > 0);
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail: 'Seleccione el proveedor e ingrese el monto total.',
      });
      return;
    }

    const payload: Partial<SupplierQuote> = {
      projectId: this.projectId ?? undefined,
      providerId: this.providerId!,
      rfqId: this.selectedRfqId ?? undefined,
      items: this.lines.map((l) => ({
        productId: l.productId || undefined,
        description: l.description || undefined,
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
    };

    this.saving.set(true);

    if (this.editMode()) {
      this.quotesApi.update(this.editId()!, payload).subscribe({
        next: async (quote) => {
          if (quote._id) await this.uploadFiles(quote._id);
          this.messageService.add({
            severity: 'success',
            summary: 'Cotización actualizada',
            detail: 'Los cambios fueron guardados correctamente.',
          });
          setTimeout(() => this.router.navigate(['/logistics/quote-entry']), 1500);
        },
        error: (err) => {
          const msg = err?.error?.message || 'Error al actualizar la cotización.';
          this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
          this.saving.set(false);
        },
      });
    } else {
      payload.status = 'Pendiente';
      this.quotesApi.create(payload).subscribe({
        next: async (quote) => {
          if (quote._id) await this.uploadFiles(quote._id);
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
  }

  onProductSelect(line: QuoteLine, productId: string | null): void {
    if (!productId) {
      line.productId = '';
      line.description = '';
      line.unit = 'und';
      this.lines = [...this.lines];
      return;
    }
    const product = this.productList().find((p) => p._id === productId);
    if (product) {
      line.productId = productId;
      line.description = product.name;
      line.unit = product.unitOfMeasure || 'und';
      if (product.basePrice && line.unitPrice === 0) {
        line.unitPrice = product.basePrice;
        this.onLinePriceChange(line);
      }
    }
    this.lines = [...this.lines];
  }

  addLine(): void {
    this.lines = [
      ...this.lines,
      {
        productId: '',
        description: '',
        unit: 'und',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        includesIgv: true,
        brandOrModel: '',
      },
    ];
  }

  removeLine(index: number): void {
    this.lines = this.lines.filter((_, i) => i !== index);
    if (this.autoCalculateTotal) this.calculateTotalsForm();
  }

  onCancel(): void {
    this.router.navigate(['/logistics/quote-entry']);
  }
}
