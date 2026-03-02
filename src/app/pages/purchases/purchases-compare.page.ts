import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { PurchasesComparisonApiService } from '../../shared/services/purchases-comparison-api.service';
import { PurchaseCompareResponse } from '../../shared/interfaces/purchase.interface';

@Component({
  selector: 'app-purchases-compare',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    ToastModule,
  ],
  templateUrl: './purchases-compare.page.html',
})
export class PurchasesComparePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly comparisonApi = inject(PurchasesComparisonApiService);

  data = signal<PurchaseCompareResponse | null>(null);
  loading = signal(true);
  adjudicating = signal(false);
  id = computed(() => this.route.snapshot.paramMap.get('id'));

  ngOnInit(): void {
    const id = this.id();
    if (!id) {
      this.router.navigate(['/purchases/requirements']);
      return;
    }
    this.comparisonApi.getCompare(id).subscribe({
      next: (res) => this.data.set(res),
      error: () => this.router.navigate(['/purchases/requirements']),
      complete: () => this.loading.set(false),
    });
  }

  goBack(): void {
    const id = this.id();
    this.router.navigate(id ? ['/purchases/requirements', id] : ['/purchases/requirements']);
  }

  adjudicateWithRecommended(): void {
    const d = this.data();
    const requirementId = this.id();
    if (!d || !requirementId || !d.summary.recommended) return;
    const rec = d.summary.recommended;
    const quote = d.quotes.find((q) => q.quoteId === rec.quoteId);
    if (!quote) return;
    const selections = d.items
      .map((_, idx) => {
        const line = quote.linesByItemIndex?.[String(idx)] ?? quote.linesByItemIndex?.[idx];
        const item = d.items[idx];
        const unitPrice = line?.unitPrice ?? 0;
        return {
          itemIndex: idx,
          providerId: quote.providerId,
          quantity: item?.quantity ?? 0,
          unitPrice,
          includesIgv: true,
        };
      })
      .filter((s) => s.quantity > 0 && s.unitPrice > 0);
    this.adjudicating.set(true);
    this.comparisonApi.adjudicate(requirementId, { selections }).subscribe({
      next: () => {
        this.router.navigate(['/purchases/orders']);
      },
      error: () => this.adjudicating.set(false),
      complete: () => this.adjudicating.set(false),
    });
  }

  providerName(provider: unknown): string {
    if (provider && typeof provider === 'object' && 'name' in provider)
      return String((provider as any).name);
    return '-';
  }

  getInitials(provider: unknown): string {
    const name = this.providerName(provider);
    if (!name || name === '-') return '—';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  isRecommendedQuote(quoteId: string): boolean {
    return this.data()?.summary.recommended?.quoteId === quoteId;
  }

  isLowestPrice(quoteId: string): boolean {
    return this.data()?.summary.lowestTotalProvider?.quoteId === quoteId;
  }

  isFastestDelivery(quoteId: string): boolean {
    return this.data()?.summary.fastestDeliveryProvider?.quoteId === quoteId;
  }

  adjudicateWithQuote(quoteId: string): void {
    const d = this.data();
    const requirementId = this.id();
    if (!d || !requirementId) return;
    const quote = d.quotes.find((q) => q.quoteId === quoteId);
    if (!quote) return;
    const selections = d.items
      .map((_, idx) => {
        const line = quote.linesByItemIndex?.[String(idx)] ?? quote.linesByItemIndex?.[idx];
        const item = d.items[idx];
        const unitPrice = line?.unitPrice ?? 0;
        return {
          itemIndex: idx,
          providerId: quote.providerId,
          quantity: item?.quantity ?? 0,
          unitPrice,
          includesIgv: true,
        };
      })
      .filter((s) => s.quantity > 0 && s.unitPrice > 0);
    this.adjudicating.set(true);
    this.comparisonApi.adjudicate(requirementId, { selections }).subscribe({
      next: () => this.router.navigate(['/purchases/orders']),
      error: () => this.adjudicating.set(false),
      complete: () => this.adjudicating.set(false),
    });
  }

  exportCompare(): void {
    // Placeholder: podría generar PDF/Excel
  }
}
