import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { FileUploadModule } from 'primeng/fileupload';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { PurchasesRequirementsApiService } from '../../shared/services/purchases-requirements-api.service';
import { PurchasesQuotesApiService } from '../../shared/services/purchases-quotes-api.service';
import { ProvidersService } from '../../shared/services/providers.service';
import { RegisterQuoteRequest } from '../../shared/interfaces/purchase.interface';
import { PurchaseRequirement } from '../../shared/interfaces/purchase.interface';

@Component({
  selector: 'app-purchases-quote-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    InputTextModule,
    InputNumberModule,
    ButtonModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
    CardModule,
    ToastModule,
    FileUploadModule,
    TagModule,
  ],
  providers: [MessageService],
  templateUrl: './purchases-quote-register.page.html',
})
export class PurchasesQuoteRegisterPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly requirementsApi = inject(PurchasesRequirementsApiService);
  private readonly quotesApi = inject(PurchasesQuotesApiService);
  private readonly providersService = inject(ProvidersService);
  private readonly messageService = inject(MessageService);

  requirementId = computed(() => this.route.snapshot.paramMap.get('id'));
  requirement = signal<PurchaseRequirement | null>(null);
  existingQuotes = signal<any[]>([]);
  providers = signal<{ label: string; value: string }[]>([]);
  loading = signal(true);
  saving = signal(false);

  providerId: string | null = null;
  totalAmount = 0;
  deliveryDays: number | null = null;
  validUntil: string | null = null;
  notes = '';
  paymentTerms = '';
  warranty = '';
  lines: {
    requirementItemIndex: number;
    unitPrice: number;
    quantity: number;
    includesIgv: boolean;
  }[] = [];

  ngOnInit(): void {
    const id = this.requirementId();
    if (!id) {
      this.router.navigate(['/purchases/requirements']);
      return;
    }
    this.requirementsApi.getById(id).subscribe({
      next: (r) => {
        this.requirement.set(r);
        this.lines = (r.items ?? []).map((_, i) => ({
          requirementItemIndex: i,
          unitPrice: 0,
          quantity: _.quantity,
          includesIgv: true,
        }));
      },
      error: () => this.router.navigate(['/purchases/requirements']),
    });
    this.quotesApi.listByRequirement(id).subscribe({
      next: (list) => this.existingQuotes.set(list),
    });
    this.providersService.getProviders({ isActive: true }).subscribe({
      next: (list) =>
        this.providers.set(
          list.map((p) => ({ label: p.name + (p.taxId ? ` (${p.taxId})` : ''), value: p._id! })),
        ),
    });
    this.loading.set(false);
  }

  get requirementItems() {
    return this.requirement()?.items ?? [];
  }

  needMoreQuotes(): number {
    const have = this.existingQuotes().length;
    return Math.max(0, 2 - have);
  }

  getProviderName(q: any): string {
    const p = q?.providerId;
    if (p && typeof p === 'object' && p.name) return p.name;
    return q?._id ? String(q._id).slice(-6) : '-';
  }

  onSubmit(): void {
    if (!this.providerId || this.totalAmount <= 0) return;
    const id = this.requirementId();
    if (!id) return;
    const payload: RegisterQuoteRequest = {
      providerId: this.providerId,
      lines: this.lines,
      totalAmount: this.totalAmount,
      deliveryDays: this.deliveryDays ?? undefined,
      validUntil: this.validUntil ?? undefined,
      notes: this.notes || undefined,
      paymentTerms: this.paymentTerms || undefined,
      warranty: this.warranty || undefined,
    };
    this.saving.set(true);
    this.quotesApi.register(id, payload).subscribe({
      next: () => {
        this.router.navigate(['/purchases/requirements', id, 'compare']);
      },
      error: () => this.saving.set(false),
      complete: () => this.saving.set(false),
    });
  }

  onCancel(): void {
    const id = this.requirementId();
    this.router.navigate(id ? ['/purchases/requirements', id] : ['/purchases/requirements']);
  }

  onSaveDraft(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Borrador',
      detail: 'Guardar borrador estará disponible en una próxima versión.',
    });
  }
}
