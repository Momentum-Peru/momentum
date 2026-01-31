import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule, TablePageEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PettyCashApiService } from '../../shared/services/petty-cash-api.service';
import { AuthService } from '../login/services/auth.service';
import {
  PettyCashBalance,
  PettyCashMovement,
  PettyCashPaginatedMovements,
  PettyCashCategoryStat,
  CreateExpenseRequest,
  CreateRechargeRequest,
  MovementQueryParams,
  EXPENSE_CATEGORIES,
} from '../../shared/interfaces/petty-cash.interface';
import { ExpenseDialogComponent } from './components/expense-dialog/expense-dialog';
import { RechargeDialogComponent } from './components/recharge-dialog/recharge-dialog';

/**
 * Página de Registro de Caja Chica (Administración).
 * Responsabilidad única: orquestar datos, vistas (Vista Administrador / Vista Contador) y diálogos.
 */
@Component({
  selector: 'app-petty-cash',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    InputTextModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    SelectModule,
    DatePickerModule,
    ExpenseDialogComponent,
    RechargeDialogComponent,
  ],
  templateUrl: './petty-cash.html',
  styleUrl: './petty-cash.scss',
  providers: [MessageService, ConfirmationService],
})
export class PettyCashPage implements OnInit {
  private readonly api = inject(PettyCashApiService);
  private readonly auth = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  balance = signal<PettyCashBalance | null>(null);
  movementsResult = signal<PettyCashPaginatedMovements | null>(null);
  categoryStats = signal<PettyCashCategoryStat[]>([]);
  loadingBalance = signal(false);
  loadingMovements = signal(false);
  loadingStats = signal(false);

  showExpenseDialog = signal(false);
  showRechargeDialog = signal(false);

  filterQ = signal('');
  filterType = signal<'ingreso' | 'egreso' | null>(null);
  filterCategory = signal<string | null>(null);
  filterDateFrom = signal<string | null>(null);
  filterDateTo = signal<string | null>(null);
  filterIncludeVoided = signal(false);
  movementsPage = signal(1);
  movementsLimit = signal(20);

  private filterQDebounceId: ReturnType<typeof setTimeout> | null = null;
  private readonly FILTER_DEBOUNCE_MS = 400;

  movements = computed(() => this.movementsResult()?.data ?? []);
  totalMovements = computed(() => this.movementsResult()?.total ?? 0);

  /** Valor Date para el datepicker "desde" (derivado del string) */
  filterDateFromDate = computed(() => this.stringToDate(this.filterDateFrom()));
  /** Valor Date para el datepicker "hasta" (derivado del string) */
  filterDateToDate = computed(() => this.stringToDate(this.filterDateTo()));

  readonly typeOptions = [
    { label: 'Todos', value: null },
    { label: 'Ingreso', value: 'ingreso' },
    { label: 'Egreso', value: 'egreso' },
  ];

  readonly categoryFilterOptions = [
    { label: 'Todas las categorías', value: null },
    ...EXPENSE_CATEGORIES.map((c) => ({ label: c, value: c })),
  ];

  ngOnInit(): void {
    this.loadBalance();
    this.loadMovements();
    this.loadCategoryStats();
  }

  loadBalance(): void {
    this.loadingBalance.set(true);
    this.api.getBalance().subscribe({
      next: (res) => {
        this.balance.set(res);
        this.loadingBalance.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el saldo',
        });
        this.loadingBalance.set(false);
      },
    });
  }

  loadMovements(): void {
    this.loadingMovements.set(true);
    const params: MovementQueryParams = {
      page: this.movementsPage(),
      limit: this.movementsLimit(),
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    if (this.filterQ()) params.q = this.filterQ();
    if (this.filterType()) params.type = this.filterType()!;
    if (this.filterCategory()) params.category = this.filterCategory()!;
    if (this.filterDateFrom()) params.dateFrom = this.filterDateFrom()!;
    if (this.filterDateTo()) params.dateTo = this.filterDateTo()!;
    if (this.filterIncludeVoided()) params.includeVoided = true;

    this.api.getMovements(params).subscribe({
      next: (res) => {
        this.movementsResult.set(res);
        this.loadingMovements.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los movimientos',
        });
        this.loadingMovements.set(false);
      },
    });
  }

  loadCategoryStats(): void {
    this.loadingStats.set(true);
    const from = this.filterDateFrom();
    const to = this.filterDateTo();
    this.api.getStatsByCategory(from ?? undefined, to ?? undefined).subscribe({
      next: (res) => {
        this.categoryStats.set(res);
        this.loadingStats.set(false);
      },
      error: () => this.loadingStats.set(false),
    });
  }

  openExpenseDialog(): void {
    this.showExpenseDialog.set(true);
  }

  openRechargeDialog(): void {
    this.showRechargeDialog.set(true);
  }

  closeExpenseDialog(): void {
    this.showExpenseDialog.set(false);
  }

  closeRechargeDialog(): void {
    this.showRechargeDialog.set(false);
  }

  onExpenseSubmit(payload: CreateExpenseRequest): void {
    const userId = this.auth.getCurrentUser()?.id;
    if (!userId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Usuario no identificado',
      });
      return;
    }
    this.api.createExpense(payload, userId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Gasto registrado',
        });
        this.closeExpenseDialog();
        this.loadBalance();
        this.loadMovements();
        this.loadCategoryStats();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message ?? 'No se pudo registrar el gasto',
        });
      },
    });
  }

  onRechargeSubmit(payload: CreateRechargeRequest): void {
    const userId = this.auth.getCurrentUser()?.id;
    if (!userId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Usuario no identificado',
      });
      return;
    }
    this.api.createRecharge(payload, userId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Recarga registrada',
        });
        this.closeRechargeDialog();
        this.loadBalance();
        this.loadMovements();
        this.loadCategoryStats();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message ?? 'No se pudo registrar la recarga',
        });
      },
    });
  }

  confirmVoid(m: PettyCashMovement): void {
    if (m.status !== 'active') return;
    const isRecarga = m.type === 'ingreso';
    this.confirmationService.confirm({
      message: isRecarga
        ? '¿Anular esta recarga? El monto volverá a descontarse del saldo.'
        : '¿Anular este gasto? El monto volverá a sumarse al saldo.',
      header: isRecarga ? 'Anular recarga' : 'Anular gasto',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, anular',
      rejectLabel: 'Cancelar',
      accept: () => this.voidMovement(m._id),
    });
  }

  voidMovement(id: string): void {
    const userId = this.auth.getCurrentUser()?.id;
    if (!userId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Usuario no identificado',
      });
      return;
    }
    this.api.voidMovement(id, userId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Movimiento anulado',
        });
        this.loadBalance();
        this.loadMovements();
        this.loadCategoryStats();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message ?? 'No se pudo anular el movimiento',
        });
      },
    });
  }

  applyFilters(): void {
    this.movementsPage.set(1);
    this.loadMovements();
    this.loadCategoryStats();
  }

  clearFilters(): void {
    this.filterQ.set('');
    this.filterType.set(null);
    this.filterCategory.set(null);
    this.filterDateFrom.set(null);
    this.filterDateTo.set(null);
    this.filterIncludeVoided.set(false);
    this.movementsPage.set(1);
    this.loadMovements();
    this.loadCategoryStats();
  }

  exportReport(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Exportar',
      detail: 'Funcionalidad de exporte en desarrollo',
    });
  }

  formatDate(d: string | undefined): string {
    if (!d) return '-';
    const date = /^\d{4}-\d{2}-\d{2}$/.test(d) ? this.stringToDate(d) : new Date(d);
    if (!date || isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  /**
   * Parsea "YYYY-MM-DD" como fecha local (medianoche en zona horaria del usuario).
   * Evita que new Date("YYYY-MM-DD") se interprete como UTC y muestre el día anterior.
   */
  private stringToDate(s: string | null): Date | null {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y, m, d] = s.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Formatea Date a "YYYY-MM-DD" usando la fecha local (no UTC).
   * Así la fecha seleccionada en el calendario coincide con la enviada al API.
   */
  private dateToLocalISOString(value: Date): string {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  onFilterDateFromChange(value: Date | null): void {
    this.filterDateFrom.set(value ? this.dateToLocalISOString(value) : null);
    this.applyFilters();
  }

  onFilterDateToChange(value: Date | null): void {
    this.filterDateTo.set(value ? this.dateToLocalISOString(value) : null);
    this.applyFilters();
  }

  /** Aplica filtros con debounce al cambiar el texto de búsqueda */
  onFilterQChange(): void {
    if (this.filterQDebounceId != null) {
      clearTimeout(this.filterQDebounceId);
    }
    this.filterQDebounceId = setTimeout(() => {
      this.filterQDebounceId = null;
      this.applyFilters();
    }, this.FILTER_DEBOUNCE_MS);
  }

  formatAmount(type: string, amount: number): string {
    const sign = type === 'ingreso' ? '+' : '-';
    return `${sign} S/ ${amount.toFixed(2)}`;
  }

  createdByName(m: PettyCashMovement): string {
    const by = m.createdBy;
    if (typeof by === 'object' && by?.name) return by.name;
    return 'Admin';
  }

  /** Clase CSS para el punto de color en Gastos por categoría (Vista Contador) */
  getStatDotClass(category: string): string {
    const n =
      category
        ?.toLowerCase()
        .normalize('NFD')
        .replace(/\u0308/g, '')
        .replace(/[\u0300-\u036f]/g, '') ?? '';
    if (n === 'transporte') return 'transporte';
    if (n === 'utiles') return 'utiles';
    if (n === 'alimentacion') return 'alimentacion';
    if (n === 'otros') return 'otros';
    return 'otros';
  }

  onMovementsPageChange(event: TablePageEvent): void {
    this.movementsPage.set(Math.floor(event.first / event.rows) + 1);
    this.movementsLimit.set(event.rows);
    this.loadMovements();
  }
}
