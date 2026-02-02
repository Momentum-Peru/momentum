import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
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
import { InputTextModule } from 'primeng/inputtext';
import {
  TimeTracking,
  CreateTimeTrackingRequest,
  UpdateTimeTrackingRequest,
  TimeTrackingType,
} from '../../../../shared/interfaces/time-tracking.interface';
import { FaceRecognitionApiService } from '../../../../shared/services/face-recognition-api.service';
import { AttendanceRecord } from '../../../../shared/interfaces/face-recognition.interface';
import { TenantService } from '../../../../core/services/tenant.service';

/**
 * Componente de Diálogo para Agregar/Editar Marcación de Tiempo
 * Principio de Responsabilidad Única: Solo maneja el formulario de marcación
 */
@Component({
  selector: 'app-payroll-calculation-time-tracking-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    SelectModule,
    DatePickerModule,
    InputTextModule,
  ],
  templateUrl: './payroll-calculation-time-tracking-dialog.html',
  styleUrl: './payroll-calculation-time-tracking-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollCalculationTimeTrackingDialogComponent implements OnInit, OnChanges {
  @Input({ required: true }) visible = false;
  @Input() editingItem: TimeTracking | null = null;
  @Input() defaultDate: Date | null = null;
  @Input() defaultType: 'INGRESO' | 'SALIDA' | null = null;
  @Input({ required: true }) userId = '';
  @Output() closeDialog = new EventEmitter<void>();
  @Output() formSubmit = new EventEmitter<CreateTimeTrackingRequest | UpdateTimeTrackingRequest>();

  private readonly fb = inject(FormBuilder);
  private readonly faceRecognitionApi = inject(FaceRecognitionApiService);
  private readonly tenantService = inject(TenantService);

  form: FormGroup;
  isEditMode = signal(false);
  loadingAttendanceRecords = signal(false);
  attendanceRecords = signal<AttendanceRecord[]>([]);
  attendanceRecordOptions = signal<{ label: string; value: string }[]>([]);

  typeOptions = signal<{ label: string; value: TimeTrackingType }[]>([
    { label: 'Ingreso', value: 'INGRESO' },
    { label: 'Salida', value: 'SALIDA' },
  ]);

  constructor() {
    // Inicializar formulario inmediatamente en el constructor
    this.form = this.fb.group({
      date: ['', Validators.required],
      type: ['INGRESO', Validators.required],
      latitude: [null],
      longitude: [null],
      attendanceRecordId: [''], // Opcional - se creará automáticamente si es administrador
    });
  }

  ngOnInit(): void {
    this.initializeDialogState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Detectar cuando el diálogo se hace visible o cuando editingItem cambia
    if (changes['visible']?.currentValue === true || changes['editingItem']) {
      this.initializeDialogState();
    }
  }

  /**
   * Inicializa el estado del diálogo según si es edición o creación
   */
  private initializeDialogState(): void {
    if (this.editingItem) {
      this.isEditMode.set(true);
      this.populateForm();
      // Solo cargar registros de asistencia cuando se está editando
      this.loadAttendanceRecords();
    } else {
      this.isEditMode.set(false);
      this.initializeForm();
      // No cargar registros cuando se está creando - se generará uno nuevo automáticamente
    }
  }

  /**
   * Cargar registros de asistencia del usuario
   */
  private loadAttendanceRecords(): void {
    if (!this.userId) return;

    const tenantId = this.tenantService.tenantId();
    if (!tenantId) {
      this.loadingAttendanceRecords.set(false);
      return;
    }

    this.loadingAttendanceRecords.set(true);

    // Cargar registros de asistencia del usuario
    this.faceRecognitionApi.getAttendanceRecords(tenantId, { userId: this.userId }).subscribe({
      next: (records) => {
        // Ordenar por fecha más reciente primero
        const sortedRecords = records.sort((a, b) => {
          const dateA = new Date(a.timestamp).getTime();
          const dateB = new Date(b.timestamp).getTime();
          return dateB - dateA;
        });
        this.attendanceRecords.set(sortedRecords);
        this.updateAttendanceRecordOptions();
        this.loadingAttendanceRecords.set(false);
      },
      error: (error) => {
        console.error('Error al cargar registros de asistencia:', error);
        this.attendanceRecords.set([]);
        this.attendanceRecordOptions.set([]);
        this.loadingAttendanceRecords.set(false);
      },
    });
  }

  /**
   * Actualizar opciones de attendance records
   */
  private updateAttendanceRecordOptions(): void {
    const options: { label: string; value: string }[] = [
      { label: 'Mantener registro actual', value: '' },
    ];

    const recordOptions = this.attendanceRecords().map((record) => ({
      label: `${this.formatDate(record.timestamp)} - ${record.type}${
        record.location ? ` (${record.location})` : ''
      }`,
      value: record._id || '',
    }));

    options.push(...recordOptions);
    this.attendanceRecordOptions.set(options);
  }

  /**
   * Formatear fecha
   */
  private formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Inicializar formulario para nueva marcación
   */
  private initializeForm(): void {
    const defaultDate = this.defaultDate || new Date();
    const defaultType = this.defaultType || 'INGRESO';
    this.form.patchValue({
      date: defaultDate,
      type: defaultType,
      latitude: null,
      longitude: null,
      attendanceRecordId: '', // Vacío - se creará automáticamente en el backend
    });
  }

  /**
   * Poblar formulario con datos de edición
   */
  private populateForm(): void {
    if (this.editingItem) {
      let attendanceRecordId = '';
      if (this.editingItem.attendanceRecordId) {
        if (typeof this.editingItem.attendanceRecordId === 'string') {
          attendanceRecordId = this.editingItem.attendanceRecordId;
        } else if (this.editingItem.attendanceRecordId._id) {
          attendanceRecordId = this.editingItem.attendanceRecordId._id;
        }
      }

      this.form.patchValue({
        date: this.editingItem.date ? new Date(this.editingItem.date) : '',
        type: this.editingItem.type || 'INGRESO',
        latitude: this.editingItem.location?.latitude || null,
        longitude: this.editingItem.location?.longitude || null,
        attendanceRecordId,
      });
    }
  }

  /**
   * Convertir Date a ISO string preservando la fecha y hora local
   * Esto evita problemas de zona horaria que cambian el día.
   * El problema es que toISOString() convierte a UTC, lo que puede cambiar el día.
   * Esta función construye el string ISO usando los valores locales.
   */
  private dateToISOString(date: Date): string {
    // Obtener los componentes de la fecha en hora local
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

    // Obtener el offset de zona horaria en minutos
    const offsetMinutes = date.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const offsetSign = offsetMinutes <= 0 ? '+' : '-';
    const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(
      offsetMins,
    ).padStart(2, '0')}`;

    // Crear un string ISO usando los valores locales con el offset de zona horaria
    // Esto preserva la fecha y hora que el usuario seleccionó
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${offsetString}`;
  }

  /**
   * Enviar formulario
   */
  onSubmit(): void {
    if (this.form.valid) {
      const formValue = this.form.value;

      if (this.isEditMode()) {
        const request: UpdateTimeTrackingRequest = {};

        if (formValue.date) {
          request.date =
            formValue.date instanceof Date ? this.dateToISOString(formValue.date) : formValue.date;
        }

        if (formValue.type) {
          request.type = formValue.type;
        }

        if (formValue.latitude !== null && formValue.longitude !== null) {
          request.location = {
            latitude: formValue.latitude,
            longitude: formValue.longitude,
          };
        }

        if (formValue.attendanceRecordId) {
          request.attendanceRecordId = formValue.attendanceRecordId;
        }

        this.formSubmit.emit(request);
      } else {
        const request: CreateTimeTrackingRequest = {
          userId: this.userId,
          date:
            formValue.date instanceof Date ? this.dateToISOString(formValue.date) : formValue.date,
          type: formValue.type,
          // attendanceRecordId es opcional - si está vacío, el backend creará uno automáticamente
          attendanceRecordId:
            formValue.attendanceRecordId && formValue.attendanceRecordId.trim() !== ''
              ? formValue.attendanceRecordId
              : undefined,
        };

        if (formValue.latitude !== null && formValue.longitude !== null) {
          request.location = {
            latitude: formValue.latitude,
            longitude: formValue.longitude,
          };
        }

        this.formSubmit.emit(request);
      }
    }
  }

  /**
   * Manejar cuando se muestra el diálogo
   */
  onDialogShow(): void {
    // Prevenir auto-focus en el primer campo
    setTimeout(() => {
      const firstInput = document.querySelector('#date input') as HTMLElement;
      if (firstInput) {
        firstInput.blur();
      }
    }, 0);
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
