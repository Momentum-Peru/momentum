import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PurchasesRequirementsApiService } from '../../shared/services/purchases-requirements-api.service';
import { PurchasesQuotesApiService } from '../../shared/services/purchases-quotes-api.service';
import { MenuService } from '../../shared/services/menu.service';
import { AuthService } from '../login/services/auth.service';
import { PurchaseRequirement } from '../../shared/interfaces/purchase.interface';
import { PurchaseRequirementCardComponent } from './components/purchase-requirement-card/purchase-requirement-card.component';

/**
 * Página listado de requerimientos de compra (Proyectos Activos / ProCure).
 * Orquesta datos y navegación; delega presentación en purchase-requirement-card.
 */
@Component({
  selector: 'app-purchases-requirements',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    SelectModule,
    CardModule,
    ToastModule,
    ConfirmDialogModule,
    PurchaseRequirementCardComponent,
  ],
  templateUrl: './purchases-requirements.page.html',
  styleUrl: './purchases-requirements.page.scss',
  providers: [MessageService, ConfirmationService],
})
export class PurchasesRequirementsPage implements OnInit {
  private readonly requirementsApi = inject(PurchasesRequirementsApiService);
  private readonly quotesApi = inject(PurchasesQuotesApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly menuService = inject(MenuService);
  private readonly authService = inject(AuthService);

  readonly canEdit = computed(() => this.menuService.canEdit('/purchases/requirements'));

  requirements = signal<PurchaseRequirement[]>([]);
  quotesCountByRequirement = signal<Record<string, number>>({});
  loading = signal(false);
  query = signal('');
  statusFilter = signal<string | null>(null);
  sortBy = signal('createdAt');
  sortOrder = signal<'asc' | 'desc'>('desc');

  statusOptions = [
    { label: 'Todos', value: null },
    { label: 'Borrador', value: 'borrador' },
    { label: 'Cotizaciones pendientes', value: 'cotizaciones_pendientes' },
    { label: 'Listo para comparar', value: 'listo_para_comparar' },
    { label: 'Adjudicado', value: 'adjudicado' },
    { label: 'Cerrado', value: 'cerrado' },
  ];

  ngOnInit(): void {
    this.loadRequirements();
  }

  loadRequirements(): void {
    this.loading.set(true);
    this.requirementsApi
      .list({
        q: this.query() || undefined,
        status: this.statusFilter() ?? undefined,
        sortBy: this.sortBy(),
        sortOrder: this.sortOrder(),
      })
      .subscribe({
        next: (list) => {
          this.requirements.set(list);
          this.loadQuotesCounts(list.map((r) => r._id));
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los requerimientos.',
          });
          this.loading.set(false);
        },
        complete: () => this.loading.set(false),
      });
  }

  private loadQuotesCounts(ids: string[]): void {
    const counts: Record<string, number> = {};
    if (ids.length === 0) {
      this.quotesCountByRequirement.set(counts);
      return;
    }
    let done = 0;
    ids.forEach((id) => {
      this.quotesApi.listByRequirement(id).subscribe({
        next: (quotes) => {
          counts[id] = quotes.length;
          done++;
          if (done === ids.length) this.quotesCountByRequirement.set(counts);
        },
      });
    });
  }

  onSearch(): void {
    this.loadRequirements();
  }

  clearFilters(): void {
    this.query.set('');
    this.statusFilter.set(null);
    this.sortBy.set('createdAt');
    this.sortOrder.set('desc');
    this.loadRequirements();
  }

  newRequirement(): void {
    this.router.navigate(['/purchases/requirements/new']);
  }

  onView(req: PurchaseRequirement): void {
    this.router.navigate(['/purchases/requirements', req._id]);
  }

  onCompare(req: PurchaseRequirement): void {
    this.router.navigate(['/purchases/requirements', req._id, 'compare']);
  }

  onRegisterQuote(req: PurchaseRequirement): void {
    this.router.navigate(['/purchases/requirements', req._id, 'quote']);
  }

  onEdit(req: PurchaseRequirement): void {
    this.router.navigate(['/purchases/requirements', req._id, 'edit']);
  }

  onApprove(req: PurchaseRequirement): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Usuario',
        detail: 'No se pudo obtener el usuario.',
      });
      return;
    }
    this.requirementsApi.approve(req._id, userId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Aprobado',
          detail: 'Requerimiento aprobado.',
        });
        this.loadRequirements();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo aprobar.',
        });
      },
    });
  }

  onReject(req: PurchaseRequirement): void {
    this.confirmationService.confirm({
      message: '¿Rechazar este requerimiento? Puede indicar el motivo.',
      header: 'Rechazar',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const userId = this.authService.getCurrentUser()?.id;
        if (!userId) return;
        this.requirementsApi.reject(req._id, userId, 'Rechazado por el usuario').subscribe({
          next: () => {
            this.messageService.add({
              severity: 'info',
              summary: 'Rechazado',
              detail: 'Requerimiento rechazado.',
            });
            this.loadRequirements();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo rechazar.',
            });
          },
        });
      },
    });
  }

  getQuotesCount(id: string): number {
    return this.quotesCountByRequirement()[id] ?? 0;
  }

  countByStatus(status: string): number {
    return this.requirements().filter((r) => r.status === status).length;
  }
}
