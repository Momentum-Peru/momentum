import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';

import { ServiceOrderService } from '../services/service-order.service';
import { ServiceOrder } from '../interfaces/service-order.interface';

@Component({
  selector: 'app-operations-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, TagModule, CardModule, TooltipModule],
  templateUrl: './operations-dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationsDashboardPage implements OnInit {
  private readonly serviceOrderApi = inject(ServiceOrderService);

  orders = signal<ServiceOrder[]>([]);
  loading = signal(false);

  readonly stats = computed(() => {
    const all = this.orders();
    return {
      total: all.length,
      pendiente: all.filter(o => o.status === 'PENDIENTE').length,
      en_proceso: all.filter(o => o.status === 'EN_PROCESO').length,
      completado: all.filter(o => o.status === 'COMPLETADO').length,
      cancelado: all.filter(o => o.status === 'CANCELADO').length,
    };
  });

  readonly recent = computed(() =>
    [...this.orders()]
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      .slice(0, 8)
  );

  ngOnInit() {
    this.loading.set(true);
    this.serviceOrderApi.list().subscribe({
      next: (data) => { this.orders.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'PENDIENTE': return 'warn';
      case 'EN_PROCESO': return 'info';
      case 'COMPLETADO': return 'success';
      case 'CANCELADO': return 'danger';
      default: return 'secondary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'Pendiente';
      case 'EN_PROCESO': return 'En Proceso';
      case 'COMPLETADO': return 'Completado';
      case 'CANCELADO': return 'Cancelado';
      default: return status;
    }
  }
}
