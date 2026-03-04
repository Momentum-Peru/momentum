import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { PurchasesReceiptsApiService } from '../../shared/services/purchases-receipts-api.service';
import { GoodsReceipt } from '../../shared/interfaces/purchase.interface';

@Component({
  selector: 'app-purchases-receipts',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, TableModule, TagModule, ToastModule],
  templateUrl: './purchases-receipts.page.html',
})
export class PurchasesReceiptsPage implements OnInit {
  private readonly receiptsApi = inject(PurchasesReceiptsApiService);

  receipts = signal<GoodsReceipt[]>([]);
  loading = signal(false);

  ngOnInit(): void {
    this.loadReceipts();
  }

  loadReceipts(): void {
    this.loading.set(true);
    this.receiptsApi.list().subscribe({
      next: (list) => this.receipts.set(list),
      complete: () => this.loading.set(false),
    });
  }

  providerName(r: GoodsReceipt): string {
    const p = r.providerId;
    return typeof p === 'object' && p?.name ? p.name : '-';
  }

  getStatusSeverity(status: string): any {
    switch (status) {
      case 'recibida':
        return 'success';
      case 'borrador':
        return 'info';
      case 'anulada':
        return 'danger';
      default:
        return 'info';
    }
  }
}
