import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';
import { RfqsService, Rfq } from '../../../shared/services/rfqs.service';

@Component({
  selector: 'app-quotes-page',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    TooltipModule,
    ToastModule,
    IconFieldModule,
    InputIconModule,
  ],
  providers: [MessageService],
  templateUrl: './quotes.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotesPage implements OnInit {
  private readonly rfqsService = inject(RfqsService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  rfqs = signal<Rfq[]>([]);
  loading = signal<boolean>(false);
  approvingId = signal<string | null>(null);

  ngOnInit() {
    this.loadRfqs();
  }

  loadRfqs() {
    this.loading.set(true);
    this.rfqsService.getRfqs().subscribe({
      next: (data) => {
        this.rfqs.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  newItem() {
    this.router.navigate(['/logistics/quotes/new']);
  }

  viewItem(item: Rfq) {
    this.router.navigate(['/logistics/quotes/view', item._id]);
  }

  editItem(item: Rfq) {
    this.router.navigate(['/logistics/quotes/edit', item._id]);
  }

  approveItem(item: Rfq) {
    if (!item._id) return;
    this.approvingId.set(item._id);
    this.rfqsService.approveRfq(item._id).subscribe({
      next: (updated) => {
        this.rfqs.update((list) => list.map((r) => (r._id === updated._id ? updated : r)));
        this.messageService.add({
          severity: 'success',
          summary: 'Solicitud aprobada',
          detail: `"${updated.title}" fue aprobada y ya puede ser enviada a proveedores.`,
        });
        this.approvingId.set(null);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message || 'No se pudo aprobar la solicitud.',
        });
        this.approvingId.set(null);
      },
    });
  }

  getStatusSeverity(status: string): 'info' | 'success' | 'warn' | 'secondary' | 'danger' {
    switch (status) {
      case 'Borrador':
        return 'secondary';
      case 'Aprobada':
        return 'warn';
      case 'Publicada':
        return 'info';
      case 'Cerrada':
        return 'success';
      case 'Cancelada':
        return 'danger';
      default:
        return 'info';
    }
  }
}
