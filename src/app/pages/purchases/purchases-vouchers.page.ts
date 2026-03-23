import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { PurchasesVouchersApiService } from '../../shared/services/purchases-vouchers-api.service';
import { PurchaseVoucher } from '../../shared/interfaces/purchase.interface';

@Component({
  selector: 'app-purchases-vouchers',
  standalone: true,
  imports: [CommonModule, ButtonModule, TableModule, TagModule, ToastModule],
  templateUrl: './purchases-vouchers.page.html',
})
export class PurchasesVouchersPage implements OnInit {
  private readonly vouchersApi = inject(PurchasesVouchersApiService);

  vouchers = signal<PurchaseVoucher[]>([]);
  loading = signal(false);

  ngOnInit(): void {
    this.loadVouchers();
  }

  loadVouchers(): void {
    this.loading.set(true);
    this.vouchersApi.list().subscribe({
      next: (list) => this.vouchers.set(list),
      complete: () => this.loading.set(false),
    });
  }

  providerName(v: PurchaseVoucher): string {
    const p = v.providerId;
    return typeof p === 'object' && p?.name ? p.name : '-';
  }

  comprobanteLabel(v: PurchaseVoucher): string {
    return `${v.tipoComprobante} ${v.serie}-${v.numero}`;
  }
}
