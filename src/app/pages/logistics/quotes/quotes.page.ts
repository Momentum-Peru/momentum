import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { RfqsService, Rfq } from '../../../shared/services/rfqs.service';

@Component({
  selector: 'app-quotes-page',
  standalone: true,
  imports: [
    CommonModule, CardModule, TableModule, ButtonModule, InputTextModule, TagModule, TooltipModule,
    IconFieldModule, InputIconModule
  ],
  templateUrl: './quotes.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotesPage implements OnInit {
  private readonly rfqsService = inject(RfqsService);
  private readonly router = inject(Router);

  rfqs = signal<Rfq[]>([]);
  loading = signal<boolean>(false);

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
      error: () => {
        this.loading.set(false);
      }
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

  getStatusSeverity(status: string): 'info' | 'success' | 'warn' | 'secondary' | 'danger' {
    switch (status) {
      case 'Borrador': return 'secondary';
      case 'Publicada': return 'info';
      case 'Cerrada': return 'success';
      case 'Cancelada': return 'danger';
      default: return 'info';
    }
  }
}
