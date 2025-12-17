import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  signal,
  inject,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import {
  CreatePayrollCalculationRequest,
  UpdatePayrollCalculationRequest,
  PayrollCalculation,
} from '../../../../shared/interfaces/payroll-calculation.interface';
import { Employee } from '../../../../shared/interfaces/employee.interface';

/**
 * Componente de Diálogo de Formulario para Cálculo de Planilla
 * Principio de Responsabilidad Única: Solo maneja el formulario de creación/edición
 */
@Component({
  selector: 'app-payroll-calculation-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    SelectModule,
    DatePickerModule,
    InputNumberModule,
    TextareaModule,
  ],
  templateUrl: './payroll-calculation-form-dialog.html',
  styleUrl: './payroll-calculation-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollCalculationFormDialogComponent implements OnInit {
  @Input({ required: true }) visible = false;
  @Input() editingItem: PayrollCalculation | null = null;
  @Input({ required: true }) employees: Employee[] = [];
  @Output() closeDialog = new EventEmitter<void>();
  @Output() formSubmit = new EventEmitter<
    CreatePayrollCalculationRequest | UpdatePayrollCalculationRequest
  >();

  private readonly fb = inject(FormBuilder);

  form: FormGroup;
  employeeOptions = signal<{ label: string; value: string }[]>([]);
  isEditMode = signal(false);

  constructor() {
    // Inicializar formulario inmediatamente en el constructor
    this.form = this.fb.group({
      employeeId: ['', Validators.required],
      date: ['', Validators.required],
      entryTime: [''],
      exitTime: [''],
      workedHours: [null, [Validators.min(0), Validators.max(24)]],
      notes: [''],
    });

    // Efecto para actualizar el formulario cuando cambia editingItem
    effect(() => {
      if (this.editingItem) {
        this.isEditMode.set(true);
        this.populateForm();
      } else {
        this.isEditMode.set(false);
      }
    });
  }

  ngOnInit(): void {
    this.loadEmployeeOptions();
  }

  /**
   * Poblar formulario con datos de edición
   */
  private populateForm(): void {
    if (this.editingItem) {
      const employeeId =
        typeof this.editingItem.employeeId === 'string'
          ? this.editingItem.employeeId
          : this.editingItem.employeeId._id;

      this.form.patchValue({
        employeeId: employeeId,
        date: this.editingItem.date ? new Date(this.editingItem.date) : '',
        entryTime: this.editingItem.entryTime ? new Date(this.editingItem.entryTime) : '',
        exitTime: this.editingItem.exitTime ? new Date(this.editingItem.exitTime) : '',
        workedHours: this.editingItem.workedHours || null,
        notes: this.editingItem.notes || '',
      });
    }
  }

  /**
   * Cargar opciones de empleados
   */
  private loadEmployeeOptions(): void {
    const options: { label: string; value: string }[] = [];
    this.employees.forEach((employee) => {
      options.push({
        label: `${employee.nombre} ${employee.apellido} (${employee.dni})`,
        value: employee._id || '',
      });
    });
    this.employeeOptions.set(options);
  }

  /**
   * Enviar formulario
   */
  onSubmit(): void {
    if (this.form.valid) {
      const formValue = this.form.value;

      if (this.isEditMode()) {
        const request: UpdatePayrollCalculationRequest = {};

        if (formValue.entryTime) {
          request.entryTime =
            formValue.entryTime instanceof Date
              ? formValue.entryTime.toISOString()
              : formValue.entryTime;
        }

        if (formValue.exitTime) {
          request.exitTime =
            formValue.exitTime instanceof Date
              ? formValue.exitTime.toISOString()
              : formValue.exitTime;
        }

        if (formValue.workedHours !== null && formValue.workedHours !== undefined) {
          request.workedHours = formValue.workedHours;
        }

        if (formValue.notes !== undefined) {
          request.notes = formValue.notes;
        }

        this.formSubmit.emit(request);
      } else {
        const request: CreatePayrollCalculationRequest = {
          employeeId: formValue.employeeId,
          date:
            formValue.date instanceof Date
              ? formValue.date.toISOString().split('T')[0]
              : formValue.date,
          entryTime: formValue.entryTime
            ? formValue.entryTime instanceof Date
              ? formValue.entryTime.toISOString()
              : formValue.entryTime
            : undefined,
          exitTime: formValue.exitTime
            ? formValue.exitTime instanceof Date
              ? formValue.exitTime.toISOString()
              : formValue.exitTime
            : undefined,
          workedHours: formValue.workedHours || undefined,
          notes: formValue.notes || undefined,
        };

        this.formSubmit.emit(request);
      }
    }
  }

  /**
   * Cerrar diálogo
   */
  onClose(): void {
    this.form.reset();
    this.isEditMode.set(false);
    this.closeDialog.emit();
  }
}
