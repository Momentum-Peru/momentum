import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { PurchasesOrdersApiService } from '../../shared/services/purchases-orders-api.service';
import { PurchaseOrder } from '../../shared/interfaces/purchase.interface';

@Component({
  selector: 'app-purchases-orders',
  standalone: true,
  imports: [CommonModule, ButtonModule, TableModule, TagModule, ToastModule],
  templateUrl: './purchases-orders.page.html',
})
export class PurchasesOrdersPage implements OnInit {
  private readonly ordersApi = inject(PurchasesOrdersApiService);
  private readonly router = inject(Router);

  orders = signal<PurchaseOrder[]>([]);
  loading = signal(false);

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.ordersApi.list().subscribe({
      next: (list) => this.orders.set(list),
      complete: () => this.loading.set(false),
    });
  }

  goToRequirements(): void {
    this.router.navigate(['/purchases/requirements']);
  }

  providerName(o: PurchaseOrder): string {
    const p = o.providerId;
    return typeof p === 'object' && p?.name ? p.name : '-';
  }
}
