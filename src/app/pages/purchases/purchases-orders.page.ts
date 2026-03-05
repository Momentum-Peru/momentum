import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { PurchasesOrdersApiService } from '../../shared/services/purchases-orders-api.service';
import { PurchaseOrder } from '../../shared/interfaces/purchase.interface';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-purchases-orders',
  standalone: true,
  imports: [CommonModule, ButtonModule, TableModule, TagModule, ToastModule, TooltipModule],
  templateUrl: './purchases-orders.page.html',
})
export class PurchasesOrdersPage implements OnInit {
  private readonly ordersApi = inject(PurchasesOrdersApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly tenantService = inject(TenantService);

  orders = signal<PurchaseOrder[]>([]);
  loading = signal(false);
  readonly hasTenant = computed(() => !!this.tenantService.tenantId());

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    if (!this.tenantService.tenantId()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Empresa no seleccionada',
        detail: 'Seleccione una empresa en el menú para ver las órdenes de compra.',
      });
      this.orders.set([]);
      return;
    }
    this.loading.set(true);
    this.ordersApi.list().subscribe({
      next: (list) => this.orders.set(Array.isArray(list) ? list : []),
      error: (err) => {
        this.loading.set(false);
        this.orders.set([]);
        const msg = err?.error?.message || err?.message || 'Error al cargar órdenes de compra.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
      },
      complete: () => this.loading.set(false),
    });
  }

  /** Ir al listado de proyectos (requerimientos). Las órdenes se generan al adjudicar desde ahí. */
  goToRequirements(): void {
    this.router.navigate(['/purchases/requirements']);
  }

  /** Ir a crear un nuevo proyecto/requerimiento. Tras cotizar y adjudicar se generarán órdenes que aparecerán aquí. */
  goToNewProject(): void {
    this.router.navigate(['/purchases/requirements/new']);
  }

  goToReceive(orderId: string): void {
    this.router.navigate(['/purchases/receipts/new'], { queryParams: { orderId } });
  }

  providerName(o: PurchaseOrder): string {
    const p = o.providerId;
    return typeof p === 'object' && p?.name ? p.name : '-';
  }
}
