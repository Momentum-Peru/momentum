import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageService } from 'primeng/api';
import { PurchasesOrdersApiService } from '../../../shared/services/purchases-orders-api.service';
import { ProvidersService, Provider } from '../../../shared/services/providers.service';
import {
  CreatePurchaseOrderRequest,
  PurchaseOrderLine,
} from '../../../shared/interfaces/purchase.interface';
import { AuthService } from '../../login/services/auth.service';

@Component({
  selector: 'app-purchases-order-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    Select,
    CheckboxModule,
    CardModule,
    ToastModule,
    TooltipModule,
    DatePickerModule,
    InputNumberModule,
  ],
  templateUrl: './purchases-order-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchasesOrderFormComponent implements OnInit {
  private readonly ordersApi = inject(PurchasesOrdersApiService);
  private readonly providersService = inject(ProvidersService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  isEditMode = signal<boolean>(false);
  providers = signal<Provider[]>([]);
  selectedProvider = signal<Provider | null>(null);

  orderForm = signal<any>({
    providerId: '',
    providerName: '',
    providerRuc: '',
    providerAddress: '',
    currency: 'PEN',
    issueDate: new Date(),
    dueDate: null,
    paymentTerms: '',
    lines: [],
    subtotal: 0,
    igvAmount: 0,
    totalAmount: 0,
  });

  currencies = signal<any[]>([
    { label: 'Soles (PEN)', value: 'PEN' },
    { label: 'Dólares (USD)', value: 'USD' },
  ]);

  ngOnInit() {
    this.loadProviders();
    // Check for edit mode
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.isEditMode.set(true);
        // Implementation for edit mode would go here, fetching the order and hydrating the form
        // Currently focused on creation
      }
    });
  }

  loadProviders() {
    this.providersService.getProviders({}).subscribe({
      next: (data) => this.providers.set(data),
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los proveedores',
        }),
    });
  }

  onProviderSelect(provider: Provider) {
    this.selectedProvider.set(provider);
    const cur = this.orderForm();
    this.orderForm.set({
      ...cur,
      providerId: provider._id,
      providerName: provider.name,
      providerRuc: provider.taxId || '',
      providerAddress: provider.ubicacion?.direccion || '',
    });
  }

  onEditChange(key: string, value: any) {
    const cur = this.orderForm();
    this.orderForm.set({ ...cur, [key]: value });
  }

  addLine() {
    const cur = this.orderForm();
    this.orderForm.set({
      ...cur,
      lines: [
        ...cur.lines,
        {
          requirementItemIndex: cur.lines.length,
          description: '',
          quantity: 1,
          unit: 'UND',
          unitPrice: 0,
          includesIgv: true,
          discount: 0,
        },
      ],
    });
    this.calculateTotals();
  }

  removeLine(index: number) {
    const cur = this.orderForm();
    const lines = [...cur.lines];
    lines.splice(index, 1);
    this.orderForm.set({ ...cur, lines });
    this.calculateTotals();
  }

  updateLine(index: number, field: keyof PurchaseOrderLine, value: any) {
    const cur = this.orderForm();
    const lines = [...cur.lines];
    lines[index] = { ...lines[index], [field]: value };
    this.orderForm.set({ ...cur, lines });

    if (field === 'quantity' || field === 'unitPrice' || field === 'includesIgv') {
      this.calculateTotals();
    }
  }

  calculateTotals() {
    const cur = this.orderForm();
    let subtotal = 0;
    let igv = 0;

    cur.lines.forEach((line: PurchaseOrderLine) => {
      const q = line.quantity || 0;
      const p = line.unitPrice || 0;
      const lineTotal = q * p;

      if (line.includesIgv) {
        const lineSubtotal = lineTotal / 1.18;
        subtotal += lineSubtotal;
        igv += lineTotal - lineSubtotal;
      } else {
        subtotal += lineTotal;
        igv += lineTotal * 0.18;
      }
    });

    this.orderForm.set({
      ...cur,
      subtotal: Number(subtotal.toFixed(2)),
      igvAmount: Number(igv.toFixed(2)),
      totalAmount: Number((subtotal + igv).toFixed(2)),
    });
  }

  validateForm(form: any): string[] {
    const errors: string[] = [];
    if (!form.providerId) errors.push('Debe seleccionar un proveedor');
    if (!form.issueDate) errors.push('La fecha de emisión es requerida');
    if (!form.lines || form.lines.length === 0) errors.push('Debe agregar al menos un artículo');

    form.lines.forEach((line: any, i: number) => {
      if (!line.description) errors.push(`El artículo ${i + 1} requiere una descripción`);
      if (line.quantity <= 0) errors.push(`La cantidad del artículo ${i + 1} debe ser mayor a 0`);
    });

    return errors;
  }

  save() {
    const form = this.orderForm();
    const validationErrors = this.validateForm(form);

    if (validationErrors.length > 0) {
      validationErrors.forEach((error) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error });
      });
      return;
    }

    const currentUser = this.authService.getCurrentUser();

    const payload: CreatePurchaseOrderRequest = {
      providerId: form.providerId,
      createdBy: currentUser?.id,
      providerName: form.providerName,
      providerRuc: form.providerRuc,
      providerAddress: form.providerAddress,
      lines: form.lines,
      subtotal: form.subtotal,
      igvAmount: form.igvAmount,
      totalAmount: form.totalAmount,
      currency: form.currency,
      issueDate: form.issueDate.toISOString(),
      dueDate: form.dueDate ? form.dueDate.toISOString() : undefined,
      paymentTerms: form.paymentTerms,
    };

    if (this.isEditMode()) {
      // Edit logic here
    } else {
      this.ordersApi.create(payload).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Orden de compra generada',
          });
          setTimeout(() => this.goBack(), 1500);
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.message || 'Error al generar la orden',
          });
        },
      });
    }
  }

  goBack() {
    this.router.navigate(['/purchases/orders']);
  }
}
