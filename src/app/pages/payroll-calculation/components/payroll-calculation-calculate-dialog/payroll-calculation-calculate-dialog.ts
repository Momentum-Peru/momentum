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
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { CalculatePayrollRequest } from '../../../../shared/interfaces/payroll-calculation.interface';
import { User } from '../../../../shared/services/users-api.service';

/**
 * Componente de Diálogo para Calcular Planilla
 * Principio de Responsabilidad Única: Solo maneja el formulario de cálculo de planilla
 */
@Component({
  selector: 'app-payroll-calculation-calculate-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    SelectModule,
    DatePickerModule,
    CheckboxModule,
  ],
  templateUrl: './payroll-calculation-calculate-dialog.html',
  styleUrl: './payroll-calculation-calculate-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollCalculationCalculateDialogComponent implements OnInit {
  @Input({ required: true }) visible = false;
  @Input({ required: true }) loading = false;
  @Input({ required: true }) users: User[] = [];
  @Output() closeDialog = new EventEmitter<void>();
  @Output() calculate = new EventEmitter<CalculatePayrollRequest>();

  private readonly fb = inject(FormBuilder);

  calculateForm!: FormGroup;
  userOptions = signal<{ label: string; value: string }[]>([]);

  ngOnInit(): void {
    this.initializeForm();
    this.loadUserOptions();
  }

  /**
   * Inicializar formulario
   */
  private initializeForm(): void {
    this.calculateForm = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      userId: [''],
      recalculate: [false],
    });
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
   * Enviar formulario
   */
  onSubmit(): void {
    if (this.calculateForm.valid) {
      const formValue = this.calculateForm.value;
      const request: CalculatePayrollRequest = {
        startDate:
          formValue.startDate instanceof Date
            ? formValue.startDate.toISOString().split('T')[0]
            : formValue.startDate,
        endDate:
          formValue.endDate instanceof Date
            ? formValue.endDate.toISOString().split('T')[0]
            : formValue.endDate,
        userId: formValue.userId || undefined,
        recalculate: formValue.recalculate || false,
      };
      this.calculate.emit(request);
    }
  }

  /**
   * Cerrar diálogo
   */
  onClose(): void {
    this.calculateForm.reset();
    this.calculateForm.patchValue({ recalculate: false });
    this.closeDialog.emit();
  }
}
