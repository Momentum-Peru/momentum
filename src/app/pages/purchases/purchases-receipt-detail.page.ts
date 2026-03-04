import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { PurchasesReceiptsApiService } from '../../shared/services/purchases-receipts-api.service';
import { GoodsReceipt } from '../../shared/interfaces/purchase.interface';

@Component({
  selector: 'app-purchases-receipt-detail',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, TableModule, TagModule],
  template: `
    @if (receipt(); as r) {
      <div class="p-4 max-w-4xl mx-auto">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold">Recepción {{ r.number }}</h2>
          <div class="flex gap-2">
            <button pButton label="Volver" icon="pi pi-arrow-left" class="p-button-secondary p-button-outlined" (click)="back()"></button>
            @if (r.status !== 'anulada') {
              <button pButton label="Anular" icon="pi pi-times" class="p-button-danger" (click)="annul(r)"></button>
            }
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="card p-4 border rounded shadow-sm bg-white">
            <h3 class="font-bold text-lg mb-2">Información General</h3>
            <p><strong>Fecha:</strong> {{ r.receiptDate | date:'dd/MM/yyyy' }}</p>
            <p><strong>Guía Remisión:</strong> {{ r.guideNumber || '-' }}</p>
            <p><strong>Estado:</strong> <p-tag [value]="r.status" [severity]="getStatusSeverity(r.status)"></p-tag></p>
          </div>
          <div class="card p-4 border rounded shadow-sm bg-white">
            <h3 class="font-bold text-lg mb-2">Proveedor</h3>
            <p><strong>Nombre:</strong> {{ providerName(r) }}</p>
            <p><strong>OC:</strong> {{ getOrderNumber(r) }}</p>
          </div>
        </div>

        <div class="card bg-white border rounded shadow-sm overflow-hidden">
          <p-table [value]="r.lines" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th class="text-right">Cantidad</th>
                <th class="text-center">Unidad</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-line>
              <tr>
                <td>{{ line.productCode || '-' }}</td>
                <td>{{ line.description }}</td>
                <td class="text-right font-bold">{{ line.quantityReceived }}</td>
                <td class="text-center">{{ line.unit }}</td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      </div>
    } @else {
      <div class="flex justify-center p-12">
        <i class="pi pi-spin pi-spinner text-4xl"></i>
      </div>
    }
  `
})
export class PurchasesReceiptDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(PurchasesReceiptsApiService);

  receipt = signal<GoodsReceipt | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.api.getById(id).subscribe(r => this.receipt.set(r));
    }
  }

  back() {
    this.router.navigate(['/purchases/receipts']);
  }

  annul(r: GoodsReceipt) {
    if (!confirm('¿Seguro que desea anular esta recepción?')) return;
    
    // TODO: Get real user ID from auth service
    const userId = 'current-user-id'; 
    
    this.api.annul(r._id, userId).subscribe({
      next: (updated) => {
        this.receipt.set(updated);
        alert('Recepción anulada correctamente');
      },
      error: (e) => alert('Error al anular: ' + (e.error?.message || e.message))
    });
  }

  providerName(r: GoodsReceipt): string {
    const p = r.providerId;
    // @ts-ignore
    return typeof p === 'object' && p?.name ? p.name : '-';
  }

  getOrderNumber(r: GoodsReceipt): string {
    const o = r.purchaseOrderId;
    // @ts-ignore
    return typeof o === 'object' && o?.number ? o.number : 'OC';
  }

  getStatusSeverity(status: string): any {
    return status === 'recibida' ? 'success' : status === 'anulada' ? 'danger' : 'info';
  }
}
