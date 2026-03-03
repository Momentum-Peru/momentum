import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { RatingModule } from 'primeng/rating';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-deliveries-page',
  standalone: true,
  imports: [
    CommonModule, ButtonModule, TableModule, TagModule, ToastModule, TooltipModule, DialogModule, RatingModule, FormsModule, RouterModule
  ],
  templateUrl: './deliveries.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveriesPage implements OnInit {
  deliveries = signal<any[]>([
    {
      id: 'DEL-001',
      orderNumber: 'OC-2025-0001',
      providerName: 'Soporte Informática SAC',
      expectedDate: '2025-11-20',
      status: 'Pendiente',
      items: [
        { name: 'Laptops de Desarrollo', quantity: 10, received: 0 }
      ]
    },
    {
      id: 'DEL-002',
      orderNumber: 'OC-2025-0002',
      providerName: 'Equipos Médicos ABC',
      expectedDate: '2025-10-15',
      status: 'Recibido',
      items: [
        { name: 'Monitor Multiparámetro', quantity: 2, received: 2 }
      ]
    }
  ]);
  loading = signal<boolean>(false);

  // Dialog state
  evaluationDialog = signal<boolean>(false);
  selectedDelivery = signal<any>(null);

  ratingMetrics = signal<any>({
    onTime: 0,
    complete: 0,
    internal: 0
  });

  ngOnInit() {
    // In a real scenario, fetch pending deliveries from backend based on unfulfilled orders
  }

  showEvaluationDialog(delivery: any) {
    if (delivery.status === 'Recibido') return; // Cannot re-evaluate mockup
    this.selectedDelivery.set(delivery);
    this.ratingMetrics.set({ onTime: 5, complete: 5, internal: 5 });
    this.evaluationDialog.set(true);
  }

  confirmDelivery() {
    // This connects your new provider "Metrics" request 
    const metrics = this.ratingMetrics();
    console.log('Sending metrics rating to provider:', metrics);

    // Call backend to update provider rating and order status (placeholder)

    this.deliveries.update(list => list.map(d =>
      d.id === this.selectedDelivery().id ? { ...d, status: 'Recibido' } : d
    ));

    this.evaluationDialog.set(false);
  }
}
