import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
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
import { PurchasesRequirementsApiService } from '../../../shared/services/purchases-requirements-api.service';
import { PurchasesQuotesApiService } from '../../../shared/services/purchases-quotes-api.service';
import { ProvidersService } from '../../../shared/services/providers.service';
import { UploadService } from '../../../shared/services/upload.service';
import { TenantService } from '../../../core/services/tenant.service';
import {
  PurchaseRequirement,
  PurchaseRequirementItem,
  RegisterQuoteRequest,
} from '../../../shared/interfaces/purchase.interface';

interface QuoteLine {
  requirementItemIndex: number;
  unitPrice: number;
  quantity: number;
  includesIgv: boolean;
  brandOrModel: string;
}

/**
 * Vista "Ingresar cotización del proveedor" del flujo de logística.
 * Permite al usuario de logística seleccionar la solicitud de cotización
 * e ingresar todos los datos de la cotización que envió el proveedor
 * (proveedor, montos por ítem, plazos, condiciones y archivos adjuntos).
 */
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
  private readonly requirementsApi = inject(PurchasesRequirementsApiService);
  private readonly quotesApi = inject(PurchasesQuotesApiService);
  private readonly providersService = inject(ProvidersService);
  private readonly uploadService = inject(UploadService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly tenantService = inject(TenantService);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  loadingRequirements = signal(true);
  loadingRequirement = signal(false);

  requirementOptions = signal<{ label: string; value: string }[]>([]);
  selectedRequirementId: string | null = null;
  requirement = signal<PurchaseRequirement | null>(null);
  existingQuotes = signal<{ providerId: unknown; totalAmount: number; _id: string }[]>([]);
  providers = signal<{ label: string; value: string }[]>([]);

  // ── Campos del formulario ──────────────────────────────────────────────────
  providerId: string | null = null;
  totalAmount = 0;
  deliveryDays: number | null = null;
  validUntil: Date | null = null;
  paymentTerms = '';
  warranty = '';
  notes = '';
  lines: QuoteLine[] = [];
  pendingFiles: File[] = [];

  // ── Estado ────────────────────────────────────────────────────────────────
  saving = signal(false);
  uploadingFiles = signal(false);
  readonly today = new Date();

  requirementItems = computed<PurchaseRequirementItem[]>(() => this.requirement()?.items ?? []);

  needMoreQuotes = computed(() => Math.max(0, 2 - this.existingQuotes().length));

  ngOnInit(): void {
    this.loadRequirements();
    this.loadProviders();
  }

  // ── Carga de datos ─────────────────────────────────────────────────────────

  private loadRequirements(): void {
    if (!this.tenantService.tenantId()) {
      this.loadingRequirements.set(false);
      this.messageService.add({
        severity: 'warn',
        summary: 'Empresa no seleccionada',
        detail: 'Seleccione una empresa para continuar.',
      });
      return;
    }
    this.loadingRequirements.set(true);
    // Cargamos todos y filtramos localmente porque el back solo admite un
    // status a la vez. Se muestran 'borrador' y 'cotizaciones_pendientes':
    // - 'borrador': solicitud creada/enviada a proveedor pero aún sin cotización ingresada
    // - 'cotizaciones_pendientes': ya tiene al menos una cotización pero puede recibir más
    this.requirementsApi.list({ sortBy: 'createdAt', sortOrder: 'desc' }).subscribe({
      next: (list) => {
        const eligible = list.filter(
          (r) => r.status === 'borrador' || r.status === 'cotizaciones_pendientes',
        );
        this.requirementOptions.set(
          eligible.map((r) => ({
            label: r.title,
            value: r._id,
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
      complete: () => this.loadingRequirements.set(false),
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

  onRequirementChange(id: string | null): void {
    this.selectedRequirementId = id;
    this.requirement.set(null);
    this.lines = [];
    this.existingQuotes.set([]);
    if (!id) return;

    this.loadingRequirement.set(true);
    this.requirementsApi.getById(id).subscribe({
      next: (r) => {
        this.requirement.set(r);
        this.lines = (r.items ?? []).map((item, i) => ({
          requirementItemIndex: i,
          unitPrice: 0,
          quantity: item.quantity,
          includesIgv: true,
          brandOrModel: '',
        }));
      },
      complete: () => this.loadingRequirement.set(false),
    });

    this.quotesApi.listByRequirement(id).subscribe({
      next: (list) => this.existingQuotes.set(list as any),
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
          this.uploadService.upload('quotes', quoteId, file).subscribe({
            next: () => resolve(),
            error: () => resolve(),
          });
        }),
    );
    await Promise.all(uploads);
    this.uploadingFiles.set(false);
  }

  // ── Envío del formulario ───────────────────────────────────────────────────

  getProviderName(q: { providerId: unknown }): string {
    const p = q?.providerId;
    if (p && typeof p === 'object' && (p as { name?: string }).name)
      return (p as { name: string }).name;
    return '-';
  }

  isFormValid(): boolean {
    return !!(this.selectedRequirementId && this.providerId && this.totalAmount > 0);
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

    const payload: RegisterQuoteRequest = {
      providerId: this.providerId!,
      lines: this.lines.map((l) => ({
        requirementItemIndex: l.requirementItemIndex,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
        includesIgv: l.includesIgv,
        brandOrModel: l.brandOrModel || undefined,
      })),
      totalAmount: this.totalAmount,
      deliveryDays: this.deliveryDays ?? undefined,
      validUntil: this.validUntil ? this.validUntil.toISOString().split('T')[0] : undefined,
      notes: this.notes || undefined,
      paymentTerms: this.paymentTerms || undefined,
      warranty: this.warranty || undefined,
    };

    this.saving.set(true);
    this.quotesApi.register(this.selectedRequirementId!, payload).subscribe({
      next: async (quote) => {
        await this.uploadFiles(quote._id);
        this.messageService.add({
          severity: 'success',
          summary: 'Cotización registrada',
          detail: 'La cotización fue ingresada correctamente. Puede ingresar más o ir a comparar.',
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
