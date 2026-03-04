import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PurchasesOrdersApiService } from '../../shared/services/purchases-orders-api.service';
import { PurchasesReceiptsApiService } from '../../shared/services/purchases-receipts-api.service';
import { PurchaseOrder } from '../../shared/interfaces/purchase.interface';

@Component({
  selector: 'app-purchases-receipt-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DatePickerModule,
    TableModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './purchases-receipt-register.page.html',
})
export class PurchasesReceiptRegisterPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ordersApi = inject(PurchasesOrdersApiService);
  private readonly receiptsApi = inject(PurchasesReceiptsApiService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  form: FormGroup;
  order = signal<PurchaseOrder | null>(null);
  loading = signal(false);

  constructor() {
    this.form = this.fb.group({
      purchaseOrderId: ['', Validators.required],
      providerId: ['', Validators.required],
      guideNumber: [''],
      receiptDate: [new Date(), Validators.required],
      notes: [''],
      lines: this.fb.array([]),
    });
  }

  get linesArray() {
    return this.form.get('lines') as FormArray;
  }

  ngOnInit(): void {
    const orderId = this.route.snapshot.queryParamMap.get('orderId');
    if (orderId) {
      this.loadOrder(orderId);
    } else {
      this.router.navigate(['/purchases/orders']);
    }
  }

  loadOrder(id: string): void {
    this.loading.set(true);
    this.ordersApi.getById(id).subscribe({
      next: (po) => {
        this.order.set(po);
        this.initForm(po);
        this.loading.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la orden' });
        this.loading.set(false);
      },
    });
  }

  initForm(po: PurchaseOrder): void {
    const providerId = typeof po.providerId === 'object' ? po.providerId._id : po.providerId;
    
    this.form.patchValue({
      purchaseOrderId: po._id,
      providerId: providerId,
    });

    this.linesArray.clear();
    po.lines.forEach((line, index) => {
      // Calculate pending quantity if possible (backend support needed for robust calc)
      // For now, default to full quantity or remaining if partially received logic was here
      this.linesArray.push(
        this.fb.group({
          purchaseOrderLineIndex: [index],
          productCode: [line.productCode],
          description: [line.description],
          quantityReceived: [line.quantity, [Validators.required, Validators.min(0)]],
          maxQuantity: [line.quantity], // For UI validation if needed
          unit: [line.unit],
          centerCostId: [line.centerCostId],
        })
      );
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    
    // Filter out lines with 0 received if desired, or send all
    const lines = val.lines
      .filter((l: any) => l.quantityReceived > 0)
      .map((l: any) => ({
        purchaseOrderLineIndex: l.purchaseOrderLineIndex,
        productCode: l.productCode,
        description: l.description,
        quantityReceived: l.quantityReceived,
        unit: l.unit,
        centerCostId: l.centerCostId
      }));

    if (lines.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Debe recibir al menos un ítem' });
      return;
    }

    const payload = {
      ...val,
      lines,
      receiptDate: val.receiptDate.toISOString(),
    };

    this.loading.set(true);
    this.receiptsApi.create(payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Recepción registrada' });
        setTimeout(() => {
          this.router.navigate(['/purchases/orders']);
        }, 1500);
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo registrar la recepción' });
        this.loading.set(false);
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/purchases/orders']);
  }
}
