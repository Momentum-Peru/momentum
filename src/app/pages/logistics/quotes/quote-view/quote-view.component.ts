import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { RfqsService, Rfq, SupplierQuote } from '../../../../shared/services/rfqs.service';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-quote-view',
    standalone: true,
    imports: [
        CommonModule, CardModule, ButtonModule, TableModule, TagModule, DividerModule, RouterModule
    ],
    templateUrl: './quote-view.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteViewComponent implements OnInit {
    private readonly rfqsService = inject(RfqsService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    rfq = signal<Rfq | null>(null);
    loading = signal<boolean>(true);

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.loadRfq(id);
            } else {
                this.goBack();
            }
        });
    }

    loadRfq(id: string) {
        this.loading.set(true);
        this.rfqsService.getRfq(id).subscribe({
            next: (data) => {
                this.rfq.set(data);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.goBack();
            }
        });
    }

    goBack() {
        this.router.navigate(['/logistics/quotes']);
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

    getQuoteStatusSeverity(status: string): 'info' | 'success' | 'warn' | 'secondary' | 'danger' {
        switch (status) {
            case 'Pendiente': return 'warn';
            case 'Aprobada': return 'success';
            case 'Rechazada': return 'danger';
            default: return 'info';
        }
    }

    getTotalReferencePrice(): number {
        const data = this.rfq();
        if (!data) return 0;
        return data.items.reduce((acc, current) => {
            const price = typeof current.productId === 'object' && current.productId !== null ? (current.productId as any).basePrice || 0 : 0;
            return acc + (price * current.quantity);
        }, 0);
    }

    approveQuote(quote: SupplierQuote) {
        // Implement approve logic (change quote status, generate purchase order)
        console.log('Approve quote', quote);
    }
}
