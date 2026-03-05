import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { PurchasesOrdersApiService } from '../../../shared/services/purchases-orders-api.service';
import { TenantService } from '../../../core/services/tenant.service';
import { PurchaseOrder } from '../../../shared/interfaces/purchase.interface';

@Component({
  selector: 'app-deliveries-page',
  standalone: true,
  imports: [CommonModule, ButtonModule, TableModule, TagModule, ToastModule, TooltipModule],
  providers: [MessageService],
  templateUrl: './deliveries.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveriesPage implements OnInit {
  private readonly ordersApi = inject(PurchasesOrdersApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly tenantService = inject(TenantService);

  /** Órdenes de compra pendientes de recibir (emitida o parcialmente_recibida) */
  orders = signal<PurchaseOrder[]>([]);
  loading = signal<boolean>(true);
  readonly hasTenant = computed(() => !!this.tenantService.tenantId());

  ngOnInit(): void {
    this.loadPendingOrders();
  }

  loadPendingOrders(): void {
    if (!this.tenantService.tenantId()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Empresa no seleccionada',
        detail: 'Seleccione una empresa en el menú para ver las entregas pendientes.',
      });
      this.orders.set([]);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    forkJoin({
      emitida: this.ordersApi.list({ status: 'emitida' }),
      parcial: this.ordersApi.list({ status: 'parcialmente_recibida' }),
    }).subscribe({
      next: ({ emitida, parcial }) => {
        const list = [
          ...(Array.isArray(emitida) ? emitida : []),
          ...(Array.isArray(parcial) ? parcial : []),
        ];
        this.orders.set(list);
      },
      error: (err) => {
        this.orders.set([]);
        const msg = err?.error?.message || err?.message || 'Error al cargar entregas pendientes.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
      },
      complete: () => this.loading.set(false),
    });
  }

  providerName(order: PurchaseOrder): string {
    const p = order.providerId;
    return typeof p === 'object' && p?.name ? p.name : '-';
  }

  expectedDate(order: PurchaseOrder): string | Date | null {
    return order.dueDate ?? order.issueDate ?? null;
  }

  statusLabel(order: PurchaseOrder): string {
    if (order.status === 'parcialmente_recibida') return 'Parcial';
    if (order.status === 'emitida') return 'Pendiente';
    return order.status;
  }

  statusSeverity(order: PurchaseOrder): 'success' | 'warn' | 'info' {
    if (order.status === 'parcialmente_recibida') return 'warn';
    return 'info';
  }

  /** Navega al formulario de registro de recepción (misma lógica que Órdenes de compra). */
  goToReceive(orderId: string): void {
    this.router.navigate(['/purchases/receipts/new'], { queryParams: { orderId } });
  }
}
