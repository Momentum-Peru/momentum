import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PurchasesRequirementsApiService } from '../../shared/services/purchases-requirements-api.service';
import { PurchaseRequirement } from '../../shared/interfaces/purchase.interface';
import { PurchaseRequirementFormComponent } from './components/purchase-requirement-form/purchase-requirement-form.component';

@Component({
  selector: 'app-purchases-requirement-edit',
  standalone: true,
  imports: [CommonModule, ButtonModule, ToastModule, PurchaseRequirementFormComponent],
  templateUrl: './purchases-requirement-edit.page.html',
  providers: [MessageService],
})
export class PurchasesRequirementEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly requirementsApi = inject(PurchasesRequirementsApiService);
  private readonly messageService = inject(MessageService);

  initial = signal<PurchaseRequirement | null>(null);
  loading = signal(true);
  id = computed(() => this.route.snapshot.paramMap.get('id'));

  ngOnInit(): void {
    const id = this.id();
    if (!id) {
      this.router.navigate(['/purchases/requirements']);
      return;
    }
    this.requirementsApi.getById(id).subscribe({
      next: (r) => {
        this.initial.set(r);
      },
      error: () => this.router.navigate(['/purchases/requirements']),
      complete: () => this.loading.set(false),
    });
  }

  onSave(payload: any): void {
    const id = this.id();
    if (!id) return;
    this.requirementsApi.update(id, payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Guardado',
          detail: 'Requerimiento actualizado.',
        });
        this.router.navigate(['/purchases/requirements', id]);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar.',
        });
      },
    });
  }

  onCancel(): void {
    const id = this.id();
    this.router.navigate(id ? ['/purchases/requirements', id] : ['/purchases/requirements']);
  }
}
