import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { PayrollCalculationQueryParams } from '../../../../shared/interfaces/payroll-calculation.interface';
import { User } from '../../../../shared/services/users-api.service';

/**
 * Componente de Filtros para Cálculo de Planilla
 * Principio de Responsabilidad Única: Solo maneja los filtros de búsqueda
 */
@Component({
  selector: 'app-payroll-calculation-filters',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    SelectModule,
    DatePickerModule,
    CardModule,
    CheckboxModule,
  ],
  templateUrl: './payroll-calculation-filters.html',
  styleUrl: './payroll-calculation-filters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollCalculationFiltersComponent implements OnInit {
  @Input({ required: true }) loading = false;
  @Input({ required: true }) users: User[] = [];
  @Output() filtersApplied = new EventEmitter<PayrollCalculationQueryParams>();

  private readonly fb = inject(FormBuilder);

  filtersForm: FormGroup;
  showAdvancedFilters = signal(false);

  userOptions = signal<{ label: string; value: string }[]>([]);

  constructor() {
    // Inicializar formulario inmediatamente en el constructor
    this.filtersForm = this.fb.group({
      employeeId: [''],
      startDate: [''],
      endDate: [''],
      isAbsent: [null],
    });
  }

  ngOnInit(): void {
    this.loadUserOptions();
  }

  /**
   * Cargar opciones de usuarios
   */
  private loadUserOptions(): void {
    const options = [{ label: 'Todos los usuarios', value: '' }];
    this.users.forEach((user) => {
      options.push({
        label: `${user.name} (${user.email})`,
        value: user._id || user.id || '',
      });
    });
    this.userOptions.set(options);
  }

  /**
   * Aplicar filtros
   */
  applyFilters(): void {
    const formValue = this.filtersForm.value;
    const filters: PayrollCalculationQueryParams = {};

    if (formValue.employeeId) {
      filters.employeeId = formValue.employeeId;
    }

    if (formValue.startDate) {
      const date =
        formValue.startDate instanceof Date ? formValue.startDate : new Date(formValue.startDate);
      filters.startDate = date.toISOString().split('T')[0];
    }

    if (formValue.endDate) {
      const date =
        formValue.endDate instanceof Date ? formValue.endDate : new Date(formValue.endDate);
      filters.endDate = date.toISOString().split('T')[0];
    }

    if (formValue.isAbsent !== null && formValue.isAbsent !== undefined) {
      filters.isAbsent = formValue.isAbsent;
    }

    this.filtersApplied.emit(filters);
  }

  /**
   * Limpiar filtros
   */
  clearFilters(): void {
    this.filtersForm.reset();
    this.showAdvancedFilters.set(false);
    this.filtersApplied.emit({});
  }

  /**
   * Alternar filtros avanzados
   */
  toggleAdvancedFilters(): void {
    this.showAdvancedFilters.update((show) => !show);
  }

  /**
   * Verificar si hay filtros aplicados
   */
  hasActiveFilters(): boolean {
    const formValue = this.filtersForm.value;
    return !!(
      formValue.employeeId ||
      formValue.startDate ||
      formValue.endDate ||
      (formValue.isAbsent !== null && formValue.isAbsent !== undefined)
    );
  }
}
