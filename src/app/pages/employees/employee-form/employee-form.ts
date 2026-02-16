import { Component, OnInit, signal, inject, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';

import { EmployeesApiService } from '../../../shared/services/employees-api.service';
import { UsersApiService } from '../../../shared/services/users-api.service';
import { AreasApiService } from '../../../shared/services/areas-api.service';
import { WorkShiftsApiService } from '../../../shared/services/work-shifts-api.service';
import {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
} from '../../../shared/interfaces/employee.interface';
import { Area } from '../../../shared/interfaces/area.interface';
import { WorkShift } from '../../../shared/interfaces/work-shift.interface';
import { UserOption } from '../../../shared/interfaces/menu-permission.interface';
import { BANKS } from '../../../shared/constants/banks.constants';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Pipe({
  name: 'fileName',
  standalone: true,
})
export class FileNamePipe implements PipeTransform {
  transform(value: string | undefined): string {
    if (!value) return '';
    return value.split('/').pop() || value;
  }
}

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    DatePickerModule,
    FileUploadModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    CheckboxModule,
    FileNamePipe,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './employee-form.html',
  styleUrls: ['./employee-form.scss'],
})
export class EmployeeFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly employeesApi = inject(EmployeesApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly areasApi = inject(AreasApiService);
  private readonly workShiftsApi = inject(WorkShiftsApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  employeeId = signal<string | null>(null);
  activeTab = signal<string>('personal');

  sections = [
    { id: 'personal', label: 'Información Personal', icon: 'pi pi-user' },
    { id: 'family', label: 'Carga Familiar', icon: 'pi pi-users' },
    { id: 'employment', label: 'Datos Laborales', icon: 'pi pi-briefcase' },
    { id: 'banking', label: 'Información Bancaria', icon: 'pi pi-wallet' },
    { id: 'documents', label: 'Documentación', icon: 'pi pi-file' },
    { id: 'field_personnel', label: 'Personal de Campo', icon: 'pi pi-id-card' },
  ];

  e = signal<any>({
    nombre: '',
    apellido: '',
    dni: '',
    tipoEmpleado: 'Planilla',
    hijos: [],
    contratos: [],
    antecedentesPoliciales: [],
    constanciaSuspensionRenta: [],
    examenMedico: {},
    sctr: {},
    contactoEmergencia: {},
    licenciaConducir: {},
    antecedentes: {},
    isActive: true,
  });

  loading = signal(false);
  users = signal<UserOption[]>([]);
  areas = signal<Area[]>([]);
  workShifts = signal<WorkShift[]>([]);

  docTypes = [
    { label: 'DNI', value: 'DNI' },
    { label: 'Carné de Extranjería', value: 'Carné de Extranjería' },
    { label: 'PTP', value: 'PTP' },
    { label: 'Pasaporte', value: 'Pasaporte' },
  ];

  employeeTypes = [
    { label: 'Planilla (Régimen Privado)', value: 'Planilla' },
    { label: 'Locador (RxH)', value: 'Locador' },
  ];

  banks = BANKS.map((b) => ({ label: b.label, value: b.label, code: b.code }));

  accountTypes = [
    { label: 'Ahorro', value: 'Ahorro' },
    { label: 'Corriente', value: 'Corriente' },
    { label: 'Sueldo', value: 'Sueldo' },
  ];

  contractTypes = [
    { label: 'A Plazo Indeterminado', value: 'A Plazo Indeterminado' },
    {
      label: 'Sujeto a Modalidad: Inicio de Actividad',
      value: 'Sujeto a Modalidad: Inicio de Actividad',
    },
    {
      label: 'Sujeto a Modalidad: Necesidad de Mercado',
      value: 'Sujeto a Modalidad: Necesidad de Mercado',
    },
    {
      label: 'Sujeto a Modalidad: Obra determinada',
      value: 'Sujeto a Modalidad: Obra determinada',
    },
  ];

  pensionSystems = [
    { label: 'SNP/ONP', value: 'SNP/ONP' },
    { label: 'SPP/AFP', value: 'SPP/AFP' },
  ];

  afps = [
    { label: 'Integra', value: 'Integra' },
    { label: 'Prima', value: 'Prima' },
    { label: 'Hábitat', value: 'Hábitat' },
    { label: 'Profuturo', value: 'Profuturo' },
  ];

  commissionTypes = [
    { label: 'Flujo', value: 'Flujo' },
    { label: 'Mixta', value: 'Mixta' },
  ];

  shoeSizes = Array.from({ length: 10 }, (_, i) => ({
    label: (36 + i).toString(),
    value: (36 + i).toString(),
  }));
  clothingSizes = ['S', 'M', 'L', 'XL', 'XXL'].map((s) => ({ label: s, value: s }));
  helmetSizes = ['S', 'M', 'L'].map((s) => ({ label: s, value: s }));
  gloveSizes = ['7', '8', '9', 'XS', 'S', 'M', 'L'].map((s) => ({ label: s, value: s }));
  respiratorSizes = ['S', 'M', 'L'].map((s) => ({ label: s, value: s }));
  bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((s) => ({
    label: s,
    value: s,
  }));

  selectedFiles: Record<string, File[]> = {
    contratos: [],
    antecedentesPoliciales: [],
    constanciaSuspensionRenta: [],
  };

  selectedFotoPerfil = signal<File | null>(null);

  ngOnInit() {
    this.employeeId.set(this.route.snapshot.paramMap.get('id'));
    this.loadInitialData();
    if (this.employeeId()) {
      this.loadEmployee();
    }
  }

  loadInitialData() {
    forkJoin({
      users: this.usersApi.list().pipe(catchError(() => of([]))),
      areas: this.areasApi.list({ isActive: true }).pipe(catchError(() => of([]))),
      workShifts: this.workShiftsApi.list({ isActive: true }).pipe(catchError(() => of([]))),
    }).subscribe((res) => {
      this.users.set(res.users);
      this.areas.set(res.areas);
      this.workShifts.set(res.workShifts);
    });
  }

  loadEmployee() {
    this.loading.set(true);
    this.employeesApi.getById(this.employeeId()!).subscribe({
      next: (data) => {
        const mapped = {
          ...data,
          userId: typeof data.userId === 'string' ? data.userId : (data.userId as any)?._id,
          areaId: typeof data.areaId === 'string' ? data.areaId : (data.areaId as any)?._id,
          workShiftId:
            typeof data.workShiftId === 'string'
              ? data.workShiftId
              : (data.workShiftId as any)?._id,
          fechaInicioLabores: data.fechaInicioLabores ? new Date(data.fechaInicioLabores) : null,
          fechaFinContrato: data.fechaFinContrato ? new Date(data.fechaFinContrato) : null,
          fechaVencimientoSuspension: data.fechaVencimientoSuspension
            ? new Date(data.fechaVencimientoSuspension)
            : null,
          examenMedico: {
            ...(data.examenMedico || {}),
            fechaVencimiento: data.examenMedico?.fechaVencimiento
              ? new Date(data.examenMedico.fechaVencimiento)
              : null,
          },
          sctr: {
            ...(data.sctr || {}),
            fechaVencimiento: data.sctr?.fechaVencimiento
              ? new Date(data.sctr.fechaVencimiento)
              : null,
          },
          licenciaConducir: {
            ...(data.licenciaConducir || {}),
            fechaVencimiento: data.licenciaConducir?.fechaVencimiento
              ? new Date(data.licenciaConducir.fechaVencimiento)
              : null,
          },
          antecedentes: {
            ...(data.antecedentes || {}),
            fechaEmision: data.antecedentes?.fechaEmision
              ? new Date(data.antecedentes.fechaEmision)
              : null,
          },
          contactoEmergencia: data.contactoEmergencia || {},
        };

        if (mapped.hijos) {
          mapped.hijos = mapped.hijos.map((h: any) => ({
            ...h,
            fechaNacimiento: h.fechaNacimiento ? new Date(h.fechaNacimiento) : null,
          }));
        }

        this.e.set(mapped);
        this.loading.set(false);
        console.log('Employee loaded:', mapped);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el empleado',
        });
        this.router.navigate(['/employees']);
      },
    });
  }

  conyuge() {
    if (!this.e().conyugeConcubino) {
      this.e().conyugeConcubino = { nombre: '', tipoDocumento: 'DNI', numeroDocumento: '' };
    }
    return this.e().conyugeConcubino;
  }

  isStep1Valid(): boolean {
    const val = this.e();
    return !!(val.nombre && val.apellido && val.dni && val.direccion);
  }

  isStep3Valid(): boolean {
    const val = this.e();
    return !!(
      val.tipoEmpleado &&
      val.cargo &&
      val.sueldoBasico !== undefined &&
      val.sueldoBasico !== null
    );
  }

  addHijo() {
    const current = this.e();
    const hijos = current.hijos || [];
    hijos.push({ nombre: '', fechaNacimiento: null, tipoDocumento: 'DNI', numeroDocumento: '' });
    this.e.set({ ...current, hijos: [...hijos] });
  }

  removeHijo(index: number) {
    const current = this.e();
    current.hijos.splice(index, 1);
    this.e.set({ ...current });
  }

  onFotoPerfilSelect(event: any) {
    const file = event.files[0];
    if (file) {
      this.selectedFotoPerfil.set(file);
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.e.set({ ...this.e(), fotoPerfil: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  }

  onContratosSelect(event: any) {
    const files = event.files || (event.target && event.target.files) || [];
    this.selectedFiles['contratos'] = [
      ...this.selectedFiles['contratos'],
      ...(Array.from(files) as File[]),
    ];
  }

  onAntecedentesSelect(event: any) {
    const files = event.files || (event.target && event.target.files) || [];
    this.selectedFiles['antecedentesPoliciales'] = [
      ...this.selectedFiles['antecedentesPoliciales'],
      ...(Array.from(files) as File[]),
    ];
  }

  onConstanciaSelect(event: any) {
    const files = event.files || (event.target && event.target.files) || [];
    this.selectedFiles['constanciaSuspensionRenta'] = [
      ...this.selectedFiles['constanciaSuspensionRenta'],
      ...(Array.from(files) as File[]),
    ];
  }

  removeSelectedFile(type: string, file: File) {
    this.selectedFiles[type] = this.selectedFiles[type].filter((f) => f !== file);
  }

  removeUrl(field: string, url: string) {
    this.confirmationService.confirm({
      message: '¿Está seguro de eliminar este archivo?',
      accept: () => {
        const current = this.e();
        current[field] = (current[field] || []).filter((u: string) => u !== url);
        this.e.set({ ...current });
        this.messageService.add({
          severity: 'info',
          summary: 'Info',
          detail: 'Archivo marcado para eliminación',
        });
      },
    });
  }

  onBankChange(bank: string) {
    const selectedBank = BANKS.find((b) => b.value === bank);
    if (selectedBank) {
      this.e.update((val) => ({ ...val, bankCode: selectedBank.code }));
    }
  }

  cancel() {
    this.router.navigate(['/employees']);
  }

  save() {
    this.loading.set(true);
    const data = structuredClone(this.e());

    // Format dates to ISO strings
    if (data.fechaInicioLabores instanceof Date)
      data.fechaInicioLabores = data.fechaInicioLabores.toISOString(); // @ts-ignore
    else if (typeof data.fechaInicioLabores === 'string' && data.fechaInicioLabores)
      data.fechaInicioLabores = new Date(data.fechaInicioLabores).toISOString();

    if (data.fechaFinContrato instanceof Date)
      data.fechaFinContrato = data.fechaFinContrato.toISOString(); // @ts-ignore
    else if (typeof data.fechaFinContrato === 'string' && data.fechaFinContrato)
      data.fechaFinContrato = new Date(data.fechaFinContrato).toISOString();

    if (data.fechaVencimientoSuspension instanceof Date)
      data.fechaVencimientoSuspension = data.fechaVencimientoSuspension.toISOString(); // @ts-ignore
    else if (typeof data.fechaVencimientoSuspension === 'string' && data.fechaVencimientoSuspension)
      data.fechaVencimientoSuspension = new Date(data.fechaVencimientoSuspension).toISOString();

    if (data.examenMedico?.fechaVencimiento instanceof Date)
      data.examenMedico.fechaVencimiento = data.examenMedico.fechaVencimiento.toISOString();
    if (data.sctr?.fechaVencimiento instanceof Date)
      data.sctr.fechaVencimiento = data.sctr.fechaVencimiento.toISOString();
    if (data.licenciaConducir?.fechaVencimiento instanceof Date)
      data.licenciaConducir.fechaVencimiento = data.licenciaConducir.fechaVencimiento.toISOString();
    if (data.antecedentes?.fechaEmision instanceof Date)
      data.antecedentes.fechaEmision = data.antecedentes.fechaEmision.toISOString();

    if (data.hijos) {
      data.hijos = data.hijos.map((h: any) => ({
        ...h,
        fechaNacimiento:
          h.fechaNacimiento instanceof Date ? h.fechaNacimiento.toISOString() : h.fechaNacimiento,
      }));
    }

    const id = this.employeeId();
    if (id) {
      // No enviar campos de solo lectura al actualizar (el backend los rechaza)
      delete data._id;
      delete data.tenantId;
      delete data.createdAt;
      delete data.updatedAt;
      // Quitar null de objetos anidados para que pasen la validación
      ['examenMedico', 'sctr', 'contactoEmergencia', 'licenciaConducir', 'antecedentes'].forEach((key) => {
        const obj = data[key];
        if (obj && typeof obj === 'object') {
          Object.keys(obj).forEach((k) => {
            if ((obj as Record<string, unknown>)[k] === null) delete (obj as Record<string, unknown>)[k];
          });
        }
      });
    }
    const action = id
      ? this.employeesApi.update(id, data as UpdateEmployeeRequest)
      : this.employeesApi.create(data as CreateEmployeeRequest);

    action.subscribe({
      next: (res: Employee) => {
        const employeeId = res._id!;
        this.uploadSequentially(employeeId);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al guardar el empleado',
        });
        this.loading.set(false);
      },
    });
  }

  private uploadSequentially(employeeId: string) {
    const tasks: any[] = [];

    if (this.selectedFotoPerfil()) {
      tasks.push(this.employeesApi.uploadFotoPerfil(employeeId, this.selectedFotoPerfil()!));
    }

    this.selectedFiles['contratos'].forEach((file) => {
      tasks.push(this.employeesApi.uploadContrato(employeeId, file));
    });

    this.selectedFiles['antecedentesPoliciales'].forEach((file) => {
      tasks.push(this.employeesApi.uploadAntecedentePolicial(employeeId, file));
    });

    this.selectedFiles['constanciaSuspensionRenta'].forEach((file) => {
      tasks.push(this.employeesApi.uploadConstanciaSuspension(employeeId, file));
    });

    if (tasks.length === 0) {
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Empleado guardado correctamente',
      });
      this.router.navigate(['/employees']);
      return;
    }

    // Since specific API methods don't support batch, we can use forkJoin if order doesn't matter much per file
    forkJoin(tasks).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Empleado y documentos guardados correctamente',
        });
        this.router.navigate(['/employees']);
      },
      error: () => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'Empleado guardado, pero hubo errores al subir algunos documentos',
        });
        this.router.navigate(['/employees']);
      },
    });
  }

  download(url: string) {
    window.open(url, '_blank');
  }

  goBack() {
    this.router.navigate(['/employees']);
  }
}
