import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PurchasesOrdersApiService } from '../../shared/services/purchases-orders-api.service';
import { PurchaseOrder } from '../../shared/interfaces/purchase.interface';
import { TenantService } from '../../core/services/tenant.service';
import { AuthService } from '../login/services/auth.service';

@Component({
  selector: 'app-purchases-orders',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './purchases-orders.page.html',
})
export class PurchasesOrdersPage implements OnInit {
  private readonly ordersApi = inject(PurchasesOrdersApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly tenantService = inject(TenantService);
  private readonly authService = inject(AuthService);

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

  /** Ir a crear una nueva orden de compra */
  goToNewOrder(): void {
    this.router.navigate(['/purchases/orders/new']);
  }

  goToReceive(orderId: string): void {
    this.router.navigate(['/purchases/receipts/new'], { queryParams: { orderId } });
  }

  providerName(o: PurchaseOrder): string {
    const p = o.providerId;
    return typeof p === 'object' && p?.name ? p.name : '-';
  }

  downloadPdf(orderId: string, orderNumber: string): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Generando PDF',
      detail: 'Por favor espere...',
    });
    this.ordersApi.getPdf(orderId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orden-compra-${orderNumber || orderId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo generar el PDF',
        });
      },
    });
  }

  approveOrder(order: PurchaseOrder): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.confirmationService.confirm({
      message: `¿Está seguro de aprobar la orden de compra <strong>${order.number}</strong>? Una vez aprobada se notificará al proveedor.`,
      header: 'Confirmar aprobación',
      icon: 'pi pi-check-circle',
      acceptLabel: 'Sí, aprobar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.messageService.add({
          severity: 'info',
          summary: 'Aprobando',
          detail: 'Por favor espere...',
        });
        const orderId = order._id || (order as any).id || '';
        const userId = user.id || (user as any)._id;
        this.ordersApi.approveOrder(orderId, userId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Aprobada',
              detail: 'La orden ha sido aprobada.',
            });
            this.loadOrders();
          },
          error: (err) => {
            const msg = err?.error?.message || 'Error al aprobar la orden.';
            this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
          },
        });
      },
    });
  }

  /** Órdenes con recepciones suelen estar en estos estados; el backend valida de todas formas. */
  canDeleteOrder(o: PurchaseOrder): boolean {
    return o.status !== 'recibida' && o.status !== 'parcialmente_recibida';
  }

  deleteOrder(order: PurchaseOrder): void {
    const orderId = order._id || (order as { id?: string }).id || '';
    if (!orderId) return;

    this.confirmationService.confirm({
      message: `¿Eliminar la orden de compra <strong>${order.number}</strong>? Esta acción no se puede deshacer. No podrá eliminarla si tiene recepciones o comprobantes asociados.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-trash',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.ordersApi.delete(orderId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Eliminada',
              detail: 'La orden de compra fue eliminada.',
            });
            this.loadOrders();
          },
          error: (err) => {
            const msg =
              err?.error?.message ||
              err?.message ||
              'No se pudo eliminar la orden.';
            this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
          },
        });
      },
    });
  }

  rejectOrder(order: PurchaseOrder): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    this.messageService.add({
      severity: 'info',
      summary: 'Rechazando',
      detail: 'Por favor espere...',
    });
    this.ordersApi
      .rejectOrder(order._id || (order as any).id || '', user.id || (user as any)._id)
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Rechazada',
            detail: 'La orden ha sido rechazada.',
          });
          this.loadOrders();
        },
        error: (err) => {
          const msg = err?.error?.message || 'Error al rechazar la orden.';
          this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
        },
      });
  }
}
