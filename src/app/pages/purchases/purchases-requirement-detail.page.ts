import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { PurchasesRequirementsApiService } from '../../shared/services/purchases-requirements-api.service';
import { PurchaseRequirement } from '../../shared/interfaces/purchase.interface';

@Component({
  selector: 'app-purchases-requirement-detail',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, TagModule, ToastModule],
  templateUrl: './purchases-requirement-detail.page.html',
})
export class PurchasesRequirementDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly requirementsApi = inject(PurchasesRequirementsApiService);

  requirement = signal<PurchaseRequirement | null>(null);
  loading = signal(true);

  id = computed(() => this.route.snapshot.paramMap.get('id'));

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      borrador: 'Borrador',
      cotizaciones_pendientes: 'Cotizaciones pendientes',
      listo_para_comparar: 'Listo para comparar',
      adjudicado: 'Adjudicado',
      cerrado: 'Cerrado',
    };
    return labels[status] ?? status;
  }

  ngOnInit(): void {
    const id = this.id();
    if (!id) {
      this.router.navigate(['/purchases/requirements']);
      return;
    }
    this.requirementsApi.getById(id).subscribe({
      next: (r) => this.requirement.set(r),
      error: () => this.router.navigate(['/purchases/requirements']),
      complete: () => this.loading.set(false),
    });
  }

  goBack(): void {
    this.router.navigate(['/purchases/requirements']);
  }

  goCompare(): void {
    const id = this.requirement()?._id;
    if (id) this.router.navigate(['/purchases/requirements', id, 'compare']);
  }

  goQuote(): void {
    const id = this.requirement()?._id;
    if (id) this.router.navigate(['/purchases/requirements', id, 'quote']);
  }

  goEdit(): void {
    const id = this.requirement()?._id;
    if (id) this.router.navigate(['/purchases/requirements', id, 'edit']);
  }

  requestedByName(): string {
    const r = this.requirement()?.requestedBy;
    if (!r) return '-';
    return typeof r === 'object' && r?.name ? r.name : '-';
  }

  projectName(): string {
    const p = this.requirement()?.projectId;
    if (!p) return '-';
    return typeof p === 'object' && p?.name ? p.name : '-';
  }
}
