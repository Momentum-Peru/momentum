import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PurchasesRequirementsApiService } from '../../shared/services/purchases-requirements-api.service';
import { CreatePurchaseRequirementRequest } from '../../shared/interfaces/purchase.interface';
import { PurchaseRequirementFormComponent } from './components/purchase-requirement-form/purchase-requirement-form.component';

@Component({
  selector: 'app-purchases-requirement-new',
  standalone: true,
  imports: [CommonModule, ButtonModule, ToastModule, PurchaseRequirementFormComponent],
  templateUrl: './purchases-requirement-new.page.html',
  providers: [MessageService],
})
export class PurchasesRequirementNewPage {
  private readonly requirementsApi = inject(PurchasesRequirementsApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  onSave(payload: CreatePurchaseRequirementRequest): void {
    this.requirementsApi.create(payload).subscribe({
      next: (created) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Creado',
          detail: 'Requerimiento creado.',
        });
        this.router.navigate(['/purchases/requirements', created._id]);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo crear el requerimiento.',
        });
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/purchases/requirements']);
  }
}
