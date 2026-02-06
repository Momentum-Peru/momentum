import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { FileUploadModule, FileSelectEvent } from 'primeng/fileupload';
import { DatePicker } from 'primeng/datepicker';
import { MessageService, ConfirmationService } from 'primeng/api';
import { EmployeesApiService } from '../../shared/services/employees-api.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import { AreasApiService } from '../../shared/services/areas-api.service';
import { MenuService } from '../../shared/services/menu.service';
import { ApisPeruApiService } from '../../shared/services/apisperu-api.service';
import { WorkShiftsApiService } from '../../shared/services/work-shifts-api.service';
import { UserOption } from '../../shared/interfaces/menu-permission.interface';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { Subject, of } from 'rxjs';
import {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  AreaInfo,
} from '../../shared/interfaces/employee.interface';
import { Area } from '../../shared/interfaces/area.interface';
import { WorkShift } from '../../shared/interfaces/work-shift.interface';
import { BANKS, getBankCode } from '../../shared/constants/banks.constants';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    DialogModule,
    SelectModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    FileUploadModule,
    DatePicker,
  ],
  templateUrl: './employees.html',
  styleUrl: './employees.scss',
  providers: [MessageService, ConfirmationService],
})
export class EmployeesPage implements OnInit {
  private readonly employeesApi = inject(EmployeesApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly areasApi = inject(AreasApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly workShiftsApi = inject(WorkShiftsApiService);
  private readonly menuService = inject(MenuService);
  private readonly apisPeruService = inject(ApisPeruApiService);
  private readonly router = inject(Router);

  // Subject para manejar la autocompletación de DNI y RUC
  private readonly dniSubject = new Subject<string>();
  private readonly rucSubject = new Subject<string>();

  // Verificar si el usuario tiene permiso de edición para este módulo
  readonly canEdit = computed(() => this.menuService.canEdit('/employees'));

  items = signal<Employee[]>([]);
  users = signal<UserOption[]>([]);
  areas = signal<Area[]>([]);
  workShifts = signal<WorkShift[]>([]);
  query = signal('');
  showDialog = signal(false);
  showViewDialog = signal(false);
  editing = signal<Employee | null>(null);
  viewing = signal<Employee | null>(null);
  loading = signal(false);

  // Archivos seleccionados para subir
  selectedContratos = signal<File[]>([]);
  selectedAntecedentes = signal<File[]>([]);
  selectedConstancia = signal<File[]>([]);
  selectedFotoPerfil = signal<File | null>(null);

  // Estados de drag and drop
  isDraggingContratos = signal(false);
  isDraggingAntecedentes = signal(false);
  isDraggingConstancia = signal(false);

  // Constante de bancos reutilizable
  readonly banks = BANKS;

  // Estado de expansión para vista móvil
  private expandedRowKeys = signal<Set<string>>(new Set());

  // Filtrado simple por texto
  filteredItems = computed(() => {
    const searchQuery = this.query().toLowerCase().trim();
    const list = this.items()
      .slice()
      .sort((a, b) => {
        const aDate = new Date(a.createdAt || 0).getTime();
        const bDate = new Date(b.createdAt || 0).getTime();
        return bDate - aDate; // DESC
      });

    if (!searchQuery) return list;
    return list.filter((item) => {
      const nombreMatch = item.nombre?.toLowerCase().includes(searchQuery) ?? false;
      const apellidoMatch = item.apellido?.toLowerCase().includes(searchQuery) ?? false;
      const dniMatch = item.dni?.toLowerCase().includes(searchQuery) ?? false;
      const correoMatch = item.correo?.toLowerCase().includes(searchQuery) ?? false;
      const cargoMatch = item.cargo?.toLowerCase().includes(searchQuery) ?? false;
      return nombreMatch || apellidoMatch || dniMatch || correoMatch || cargoMatch;
    });
  });

  ngOnInit() {
    this.load();
    this.loadUsers();
    this.loadAreas();
    this.loadWorkShifts();
    this.setupDniAutocomplete();
    this.setupRucAutocomplete();
  }

  load() {
    this.loading.set(true);
    this.employeesApi.list({ q: this.query() || undefined }).subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.toastError('Error al cargar empleados');
        this.loading.set(false);
      },
    });
  }

  loadUsers() {
    this.usersApi.list().subscribe({
      next: (data) => {
        this.users.set(data);
      },
      error: () => {
        this.toastError('Error al cargar usuarios');
      },
    });
  }

  loadAreas() {
    this.areasApi.list({ isActive: true }).subscribe({
      next: (data) => {
        this.areas.set(data);
      },
      error: () => {
        this.toastError('Error al cargar áreas');
      },
    });
  }

  loadWorkShifts() {
    this.workShiftsApi.list({ isActive: true }).subscribe({
      next: (data) => {
        this.workShifts.set(data);
      },
      error: () => {
        this.toastError('Error al cargar turnos');
      },
    });
  }

  // Helpers de accordion móvil
  buildRowKey(item: Employee, index: number): string {
    return item._id ? String(item._id) : `${item.dni}#${index}`;
  }

  isRowExpandedByKey(key: string): boolean {
    return this.expandedRowKeys().has(key);
  }

  toggleRowByKey(key: string): void {
    const set = new Set(this.expandedRowKeys());
    if (set.has(key)) set.delete(key);
    else set.add(key);
    this.expandedRowKeys.set(set);
  }

  setQuery(value: string) {
    this.query.set(value);
    this.load();
  }

  newItem() {
    this.editing.set({
      nombre: '',
      apellido: '',
      tipoDocumento: 'DNI',
      dni: '',
      fotoPerfil: undefined,
      correo: '',
      correoCorporativo: '',
      telefono: '',
      direccion: '',
      geoReferencia: undefined,
      conyugeConcubino: undefined,
      hijos: [],
      cargo: '',
      tipoEmpleado: 'Planilla',
      userId: undefined,
      areaId: undefined,
      workShiftId: undefined,
      accountNumber: '',
      bank: '',
      bankCode: '',
      cci: '',
      accountType: undefined,
      tipoContrato: undefined,
      fechaInicioLabores: undefined,
      fechaFinContrato: undefined,
      sistemaPensionario: undefined,
      afp: undefined,
      tipoComision: undefined,
      cuspp: '',
      centroCostos: '',
      proyectoObra: '',
      ruc: '',
      fechaVencimientoSuspension: undefined,
      contratos: [],
      constanciaSuspensionRenta: [],
    });
    this.selectedContratos.set([]);
    this.selectedAntecedentes.set([]);
    this.selectedConstancia.set([]);
    this.showDialog.set(true);
  }

  editItem(item: Employee) {
    const editedItem = { ...item };

    // Si userId es un objeto (populado), extraer el _id
    if (
      editedItem.userId &&
      typeof editedItem.userId === 'object' &&
      '_id' in editedItem.userId &&
      editedItem.userId._id
    ) {
      editedItem.userId = editedItem.userId._id;
    }

    // Si areaId es un objeto (populado), extraer el _id
    if (
      editedItem.areaId &&
      typeof editedItem.areaId === 'object' &&
      '_id' in editedItem.areaId &&
      editedItem.areaId._id
    ) {
      editedItem.areaId = editedItem.areaId._id;
    }

    // Si workShiftId es un objeto (populado), extraer el _id
    if (
      editedItem.workShiftId &&
      typeof editedItem.workShiftId === 'object' &&
      '_id' in (editedItem.workShiftId as any) &&
      (editedItem.workShiftId as any)._id
    ) {
      editedItem.workShiftId = (editedItem.workShiftId as any)._id;
    }

    // Convertir fechas a objetos Date para p-datepicker
    if (editedItem.fechaInicioLabores) {
      editedItem.fechaInicioLabores = new Date(editedItem.fechaInicioLabores);
    }
    if (editedItem.fechaFinContrato) {
      editedItem.fechaFinContrato = new Date(editedItem.fechaFinContrato);
    }
    if (editedItem.fechaVencimientoSuspension) {
      editedItem.fechaVencimientoSuspension = new Date(editedItem.fechaVencimientoSuspension);
    }
    if (editedItem.hijos && editedItem.hijos.length > 0) {
      editedItem.hijos = editedItem.hijos.map(h => ({
        ...h,
        fechaNacimiento: h.fechaNacimiento ? new Date(h.fechaNacimiento) : ''
      }));
    }

    this.editing.set(editedItem);
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
    this.editing.set(null);
    this.selectedContratos.set([]);
    this.selectedAntecedentes.set([]);
    this.selectedConstancia.set([]);
    this.selectedFotoPerfil.set(null);
    this.isDraggingContratos.set(false);
    this.isDraggingAntecedentes.set(false);
    this.isDraggingConstancia.set(false);
  }

  viewItem(item: Employee) {
    this.viewing.set(item);
    this.showViewDialog.set(true);
  }

  closeViewDialog() {
    this.showViewDialog.set(false);
  }

  navigateToSummary(employee: Employee) {
    if (employee._id) {
      this.router.navigate(['/employees', employee._id]);
    }
  }

  onEditChange(field: keyof Employee, value: Employee[keyof Employee]) {
    const current = this.editing();
    if (current) {
      this.editing.set({ ...current, [field]: value });
    }

    // Si se cambió el DNI, disparar la autocompletación
    if (field === 'dni' && typeof value === 'string') {
      this.dniSubject.next(value);
    }

    // Si se cambió el RUC, disparar la validación
    if (field === 'ruc' && typeof value === 'string') {
      this.rucSubject.next(value);
    }
  }

  /**
   * Configura la autocompletación cuando se ingresa un DNI
   */
  private setupDniAutocomplete(): void {
    this.dniSubject
      .pipe(
        debounceTime(800),
        distinctUntilChanged(),
        switchMap((dni) => {
          if (!dni || dni.length !== 8 || !/^\d{8}$/.test(dni)) {
            return of(null);
          }

          return this.apisPeruService.consultDni(dni).pipe(
            catchError((error) => {
              console.warn('No se pudo autocompletar DNI desde APIsPERU:', error);
              return of(null);
            }),
          );
        }),
      )
      .subscribe((response) => {
        if (!response) return;

        const current = this.editing();
        if (!current) return;

        // Construir nombre completo
        const nombreCompleto =
          response.nombreCompleto ||
          `${response.nombres} ${response.apellidoPaterno} ${response.apellidoMaterno}`.trim();

        // Separar nombre y apellido
        const partesNombre = nombreCompleto.split(' ');
        const nombre = response.nombres || partesNombre[0] || '';
        const apellido =
          `${response.apellidoPaterno} ${response.apellidoMaterno}`.trim() ||
          partesNombre.slice(1).join(' ') ||
          '';

        // Siempre rellenar con nueva consulta
        this.editing.set({
          ...current,
          nombre,
          apellido,
        });
      });
  }

  /**
   * Configura la validación de RUC (Activo y Habido)
   */
  private setupRucAutocomplete(): void {
    this.rucSubject
      .pipe(
        debounceTime(800),
        distinctUntilChanged(),
        switchMap((ruc) => {
          if (!ruc || ruc.length !== 11 || !/^\d{11}$/.test(ruc)) {
            return of(null);
          }

          return this.apisPeruService.consultRuc(ruc).pipe(
            catchError((error) => {
              console.warn('No se pudo validar RUC desde APIsPERU:', error);
              return of(null);
            }),
          );
        }),
      )
      .subscribe((response) => {
        if (!response) return;

        const isActive = response.estado === 'ACTIVO';
        const isHabido = response.condicion === 'HABIDO';

        if (!isActive || !isHabido) {
          this.toastError(
            `Alerta: El RUC se encuentra en estado ${response.estado} y condición ${response.condicion}. Se requiere ACTIVO y HABIDO.`,
          );
        } else {
            this.toastSuccess('RUC validado: ACTIVO y HABIDO');
        }
      });
  }

  onBankChange(bankName: string) {
    const current = this.editing();
    if (current) {
      const bankCode = getBankCode(bankName);
      this.editing.set({
        ...current,
        bank: bankName || undefined,
        bankCode: bankCode || undefined,
      });
    }
  }

  getUserName(userId: string | { name?: string; email?: string } | null | undefined): string {
    if (!userId) return 'Sin usuario';
    if (typeof userId === 'object' && 'name' in userId) {
      return userId.name || '';
    }
    const user = this.users().find((u) => u._id === userId);
    return user?.name || 'Usuario no encontrado';
  }

  getUserEmail(userId: string | { email?: string } | null | undefined): string {
    if (!userId) return '';
    if (typeof userId === 'object' && 'email' in userId) {
      return userId.email ?? '';
    }
    const user = this.users().find((u) => u._id === userId);
    return user?.email || '';
  }

  getUserIdForSelect(employee: Employee): string {
    if (!employee.userId) return '';
    if (typeof employee.userId === 'string') {
      return employee.userId;
    }
    return employee.userId._id || '';
  }

  getAreaIdForSelect(employee: Employee): string {
    if (!employee.areaId) return '';
    if (typeof employee.areaId === 'string') {
      return employee.areaId;
    }
    return employee.areaId._id || '';
  }

  getAreaName(areaId: string | AreaInfo | undefined): string {
    if (!areaId) return 'Sin área';
    if (typeof areaId === 'object' && 'nombre' in areaId) {
      return areaId.nombre;
    }
    const area = this.areas().find((a) => a._id === areaId);
    return area?.nombre || 'Área no encontrada';
  }

  getWorkShiftName(workShiftId: string | WorkShift | undefined): string {
    if (!workShiftId) return 'Sin turno';
    if (typeof workShiftId === 'object' && 'name' in workShiftId) {
      return workShiftId.name;
    }
    const ws = this.workShifts().find((w) => w._id === workShiftId);
    return ws?.name || 'Turno no encontrado';
  }

  save() {
    const item = this.editing();
    if (!item) return;

    const errors = this.validateForm(item);
    if (errors.length) {
      errors.forEach((e) => this.toastError(e));
      return;
    }

    this.loading.set(true);

    if (item._id) {
      // Actualizar
      const updateData: UpdateEmployeeRequest = {
        nombre: item.nombre,
        apellido: item.apellido,
        tipoDocumento: item.tipoDocumento || undefined,
        dni: item.dni,
        // fotoPerfil se maneja por separado
        correo: item.correo || undefined,
        correoCorporativo: item.correoCorporativo || undefined,
        telefono: item.telefono || undefined,
        direccion: item.direccion || undefined,
        geoReferencia: item.geoReferencia || undefined,
        conyugeConcubino: item.conyugeConcubino || undefined,
        hijos: item.hijos
          ? item.hijos.map((hijo) => ({
              ...hijo,
              fechaNacimiento:
                typeof hijo.fechaNacimiento === 'string'
                  ? hijo.fechaNacimiento
                  : hijo.fechaNacimiento instanceof Date
                    ? hijo.fechaNacimiento.toISOString()
                    : '',
            }))
          : undefined,
        cargo: item.cargo || undefined,
        tipoEmpleado: item.tipoEmpleado || undefined,
        userId:
          typeof item.userId === 'string' && item.userId.trim() !== '' ? item.userId : undefined,
        accountNumber: item.accountNumber || undefined,
        bank: item.bank || undefined,
        bankCode: item.bankCode || undefined,
        cci: item.cci || undefined,
        accountType: item.accountType || undefined,
        tipoContrato: item.tipoContrato || undefined,
        fechaInicioLabores: item.fechaInicioLabores
          ? typeof item.fechaInicioLabores === 'string'
            ? item.fechaInicioLabores
            : (item.fechaInicioLabores as Date).toISOString()
          : undefined,
        fechaFinContrato: item.fechaFinContrato
          ? typeof item.fechaFinContrato === 'string'
            ? item.fechaFinContrato
            : (item.fechaFinContrato as Date).toISOString()
          : undefined,
        sistemaPensionario: item.sistemaPensionario || undefined,
        afp: item.afp || undefined,
        tipoComision: item.tipoComision || undefined,
        cuspp: item.cuspp || undefined,
        centroCostos: item.centroCostos || undefined,
        proyectoObra: item.proyectoObra || undefined,
        ruc: item.ruc || undefined,
        fechaVencimientoSuspension: item.fechaVencimientoSuspension
          ? typeof item.fechaVencimientoSuspension === 'string'
            ? item.fechaVencimientoSuspension
            : (item.fechaVencimientoSuspension as Date).toISOString()
          : undefined,
      };

      // Manejar areaId: solo incluir si tiene un valor válido
      const areaIdValue =
        typeof item.areaId === 'string' && item.areaId.trim() !== ''
          ? item.areaId
          : typeof item.areaId === 'object' && item.areaId && '_id' in item.areaId
            ? item.areaId._id
            : '';

      // Si hay un valor válido, incluirlo; si es cadena vacía, enviar cadena vacía para limpiar
      if (areaIdValue) {
        updateData.areaId = areaIdValue;
      } else {
        // Enviar cadena vacía para indicar que se debe limpiar el área
        updateData.areaId = '';
      }

      // Manejar workShiftId
      const workShiftIdValue =
        typeof item.workShiftId === 'string' && item.workShiftId.trim() !== ''
          ? item.workShiftId
          : typeof item.workShiftId === 'object' && item.workShiftId && '_id' in (item.workShiftId as any)
            ? (item.workShiftId as any)._id
            : '';

      if (workShiftIdValue) {
        updateData.workShiftId = workShiftIdValue;
      } else {
        updateData.workShiftId = '';
      }

      const contratosFiles = this.selectedContratos();
      const antecedentesFiles = this.selectedAntecedentes();
      const constanciaFiles = this.selectedConstancia();
      const fotoPerfilFile = this.selectedFotoPerfil();
      const hasFilesToUpload =
        contratosFiles.length > 0 ||
        antecedentesFiles.length > 0 ||
        constanciaFiles.length > 0 ||
        fotoPerfilFile !== null;

      if (!item._id) {
        this.toastError('Error: No se pudo obtener el ID del empleado');
        this.loading.set(false);
        return;
      }

      const employeeId: string = item._id; // Guardar en una constante con tipo explícito

      this.employeesApi.update(employeeId, updateData).subscribe({
        next: () => {
          if (!hasFilesToUpload) {
            this.toastSuccess('Empleado actualizado exitosamente');
            this.loading.set(false);
            this.closeDialog();
            this.load();
            return;
          }

          // Flags de existencia para determinar el último upload
          const hasContratos = contratosFiles.length > 0;
          const hasAntecedentes = antecedentesFiles.length > 0;
          const hasConstancia = constanciaFiles.length > 0;

          // Subir foto de perfil: es Last si no hay contratos, ni antecedentes, ni constancia
          if (fotoPerfilFile) {
            this.uploadFotoPerfilFile(
              employeeId,
              fotoPerfilFile,
              !hasContratos && !hasAntecedentes && !hasConstancia,
            );
          }

          // Subir contratos: es Last si no hay antecedentes ni constancia
          if (hasContratos) {
            this.uploadContratosFiles(
              employeeId,
              contratosFiles,
              !hasAntecedentes && !hasConstancia,
            );
          }

          // Subir antecedentes: es Last si no hay constancia
          if (hasAntecedentes) {
            this.uploadAntecedentesFiles(
              employeeId,
              antecedentesFiles,
              !hasConstancia,
            );
          }

          // Subir constancia: siempre es Last si existe (porque es el último en la cadena)
          if (hasConstancia) {
            this.uploadConstanciaFiles(
              employeeId,
              constanciaFiles,
              true,
            );
          }
        },
        error: (err) => {
          const message = err.error?.message || 'Error al actualizar el empleado';
          this.toastError(message);
          this.loading.set(false);
        },
      });
    } else {
      // Crear
      const createData: CreateEmployeeRequest = {
        nombre: item.nombre,
        apellido: item.apellido,
        tipoDocumento: item.tipoDocumento || 'DNI',
        dni: item.dni,
        // fotoPerfil se maneja por separado
        correo: item.correo || undefined,
        correoCorporativo: item.correoCorporativo || undefined,
        telefono: item.telefono || undefined,
        direccion: item.direccion || undefined,
        geoReferencia: item.geoReferencia || undefined,
        conyugeConcubino: item.conyugeConcubino || undefined,
        hijos: item.hijos
          ? item.hijos.map((hijo) => ({
              ...hijo,
              fechaNacimiento:
                typeof hijo.fechaNacimiento === 'string'
                  ? hijo.fechaNacimiento
                  : hijo.fechaNacimiento instanceof Date
                    ? hijo.fechaNacimiento.toISOString()
                    : '',
            }))
          : undefined,
        cargo: item.cargo || undefined,
        tipoEmpleado: item.tipoEmpleado || 'Planilla',
        userId: typeof item.userId === 'string' && item.userId ? item.userId : undefined,
        areaId: typeof item.areaId === 'string' && item.areaId ? item.areaId : undefined,
        workShiftId: typeof item.workShiftId === 'string' && item.workShiftId ? item.workShiftId : undefined,
        accountNumber: item.accountNumber || undefined,
        bank: item.bank || undefined,
        bankCode: item.bankCode || undefined,
        cci: item.cci || undefined,
        accountType: item.accountType || undefined,
        tipoContrato: item.tipoContrato || undefined,
        fechaInicioLabores: item.fechaInicioLabores
          ? typeof item.fechaInicioLabores === 'string'
            ? item.fechaInicioLabores
            : (item.fechaInicioLabores as Date).toISOString()
          : undefined,
        fechaFinContrato: item.fechaFinContrato
          ? typeof item.fechaFinContrato === 'string'
            ? item.fechaFinContrato
            : (item.fechaFinContrato as Date).toISOString()
          : undefined,
        sistemaPensionario: item.sistemaPensionario || undefined,
        afp: item.afp || undefined,
        tipoComision: item.tipoComision || undefined,
        cuspp: item.cuspp || undefined,
        centroCostos: item.centroCostos || undefined,
        proyectoObra: item.proyectoObra || undefined,
        ruc: item.ruc || undefined,
        fechaVencimientoSuspension: item.fechaVencimientoSuspension
          ? typeof item.fechaVencimientoSuspension === 'string'
            ? item.fechaVencimientoSuspension
            : (item.fechaVencimientoSuspension as Date).toISOString()
          : undefined,
      };

      const contratosFiles = this.selectedContratos();
      const antecedentesFiles = this.selectedAntecedentes();
      const constanciaFiles = this.selectedConstancia();
      const fotoPerfilFile = this.selectedFotoPerfil();
      const hasFilesToUpload =
        contratosFiles.length > 0 ||
        antecedentesFiles.length > 0 ||
        constanciaFiles.length > 0 ||
        fotoPerfilFile !== null;

      this.employeesApi.create(createData).subscribe({
        next: (createdEmployee) => {
          if (!createdEmployee._id) {
            this.toastError('Error: No se pudo obtener el ID del empleado creado');
            this.loading.set(false);
            return;
          }

          if (!hasFilesToUpload) {
            this.toastSuccess('Empleado creado exitosamente');
            this.loading.set(false);
            this.closeDialog();
            this.load();
            return;
          }

          const employeeId = createdEmployee._id;
          const hasContratos = contratosFiles.length > 0;
          const hasAntecedentes = antecedentesFiles.length > 0;
          const hasConstancia = constanciaFiles.length > 0;

          // Subir foto de perfil
          if (fotoPerfilFile) {
            this.uploadFotoPerfilFile(
              employeeId,
              fotoPerfilFile,
              !hasContratos && !hasAntecedentes && !hasConstancia,
            );
          }

          // Subir contratos
          if (hasContratos) {
            this.uploadContratosFiles(
              employeeId,
              contratosFiles,
              !hasAntecedentes && !hasConstancia,
            );
          }

          // Subir antecedentes
          if (hasAntecedentes) {
            this.uploadAntecedentesFiles(
              employeeId,
              antecedentesFiles,
              !hasConstancia,
            );
          }

           // Subir constancia
          if (hasConstancia) {
            this.uploadConstanciaFiles(
              employeeId,
              constanciaFiles,
              true,
            );
          }
        },
        error: (err) => {
          const message = err.error?.message || 'Error al crear el empleado';
          this.toastError(message);
          this.loading.set(false);
        },
      });
    }
  }

  remove(item: Employee) {
    if (!item._id) return;

    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar al empleado ${item.nombre} ${item.apellido}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.loading.set(true);
        this.employeesApi.delete(item._id!).subscribe({
          next: () => {
            this.toastSuccess('Empleado eliminado exitosamente');
            this.load();
          },
          error: (err) => {
            const message = err.error?.message || 'Error al eliminar el empleado';
            this.toastError(message);
            this.loading.set(false);
          },
        });
      },
    });
  }

  validateForm(item: Employee): string[] {
    const errors: string[] = [];

    if (!item.nombre || item.nombre.trim().length < 2) {
      errors.push('El nombre debe tener al menos 2 caracteres');
    }

    if (!item.apellido || item.apellido.trim().length < 2) {
      errors.push('El apellido debe tener al menos 2 caracteres');
    }

    // Validación condicional según tipo de documento
    const tipoDoc = item.tipoDocumento || 'DNI';
    if (tipoDoc === 'DNI') {
      if (!item.dni || !/^\d{8}$/.test(item.dni)) {
        errors.push('El DNI debe tener exactamente 8 dígitos numéricos');
      }
    } else if (tipoDoc === 'Carné de Extranjería' || tipoDoc === 'PTP') {
      if (!item.dni || !/^\w{8,15}$/.test(item.dni)) {
        errors.push(`El ${tipoDoc} debe tener entre 8 y 15 caracteres`);
      }
    } else {
      // Pasaporte u otros
      if (!item.dni || item.dni.length < 6 || item.dni.length > 20) {
        errors.push(`El documento debe tener entre 6 y 20 caracteres`);
      }
    }


    if (
      item.correo &&
      item.correo.trim().length > 0 &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.correo)
    ) {
      errors.push('El correo electrónico no es válido');
    }

    return errors;
  }

  toastSuccess(message: string) {
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: message,
    });
  }

  toastError(message: string) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
    });
  }

  // Métodos para manejar archivos de contratos
  onContratosSelect(event: FileSelectEvent) {
    const files = Array.from(event.files || []) as File[];
    this.selectedContratos.set([...this.selectedContratos(), ...files]);
  }

  removeContratoFile(file: File) {
    const current = this.selectedContratos();
    this.selectedContratos.set(current.filter((f) => f !== file));
  }

  uploadContratosFiles(employeeId: string, files: File[], isLastUpload = false) {
    let uploadedCount = 0;
    let errorCount = 0;
    const totalFiles = files.length;

    files.forEach((file) => {
      this.employeesApi.uploadContrato(employeeId, file).subscribe({
        next: () => {
          uploadedCount++;
          if (uploadedCount + errorCount === totalFiles) {
            if (errorCount === 0) {
              this.toastSuccess('Archivos de contratos subidos exitosamente');
            }
            this.selectedContratos.set([]);
            this.load();
            if (isLastUpload) {
              this.loading.set(false);
              this.closeDialog();
            }
          }
        },
        error: (err) => {
          errorCount++;
          const message = err.error?.message || `Error al subir ${file.name}`;
          this.toastError(message);
          if (uploadedCount + errorCount === totalFiles) {
            if (isLastUpload) {
              this.loading.set(false);
              this.closeDialog();
            }
          }
        },
      });
    });
  }

  // Métodos para manejar archivos de antecedentes policiales
  onAntecedentesSelect(event: FileSelectEvent) {
    const files = Array.from(event.files || []) as File[];
    this.selectedAntecedentes.set([...this.selectedAntecedentes(), ...files]);
  }

  removeAntecedenteFile(file: File) {
    const current = this.selectedAntecedentes();
    this.selectedAntecedentes.set(current.filter((f) => f !== file));
  }

  uploadAntecedentesFiles(employeeId: string, files: File[], isLastUpload = false) {
    let uploadedCount = 0;
    let errorCount = 0;
    const totalFiles = files.length;

    files.forEach((file) => {
      this.employeesApi.uploadAntecedentePolicial(employeeId, file).subscribe({
        next: () => {
          uploadedCount++;
          if (uploadedCount + errorCount === totalFiles) {
            if (errorCount === 0) {
              this.toastSuccess('Archivos de antecedentes policiales subidos exitosamente');
            }
            this.selectedAntecedentes.set([]);
            this.load();
            if (isLastUpload) {
              this.loading.set(false);
              this.closeDialog();
            }
          }
        },
        error: (err) => {
          errorCount++;
          const message = err.error?.message || `Error al subir ${file.name}`;
          this.toastError(message);
          if (uploadedCount + errorCount === totalFiles) {
            if (isLastUpload) {
              this.loading.set(false);
              this.closeDialog();
            }
          }
        },
      });
    });
  }

  // Métodos para manejar archivos de constancia de suspensión
  onConstanciaSelect(event: FileSelectEvent) {
    const files = Array.from(event.files || []) as File[];
    this.selectedConstancia.set([...this.selectedConstancia(), ...files]);
  }

  removeConstanciaFile(file: File) {
    const current = this.selectedConstancia();
    this.selectedConstancia.set(current.filter((f) => f !== file));
  }

  uploadConstanciaFiles(employeeId: string, files: File[], isLastUpload = false) {
    let uploadedCount = 0;
    let errorCount = 0;
    const totalFiles = files.length;

    files.forEach((file) => {
      this.employeesApi.uploadConstanciaSuspension(employeeId, file).subscribe({
        next: () => {
          uploadedCount++;
          if (uploadedCount + errorCount === totalFiles) {
            if (errorCount === 0) {
              this.toastSuccess('Archivos de constancia subidos exitosamente');
            }
            this.selectedConstancia.set([]);
            this.load();
            if (isLastUpload) {
              this.loading.set(false);
              this.closeDialog();
            }
          }
        },
        error: (err) => {
          errorCount++;
          const message = err.error?.message || `Error al subir ${file.name}`;
          this.toastError(message);
          if (uploadedCount + errorCount === totalFiles) {
            if (isLastUpload) {
              this.loading.set(false);
              this.closeDialog();
            }
          }
        },
      });
    });
  }

  // Métodos para eliminar archivos existentes
  removeContratoUrl(employeeId: string, url: string) {
    this.confirmationService.confirm({
      message: '¿Está seguro de que desea eliminar este archivo de contrato?',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.employeesApi.removeContrato(employeeId, url).subscribe({
          next: () => {
            this.toastSuccess('Archivo de contrato eliminado exitosamente');
            this.load();
            // Actualizar el empleado en vista si está abierto
            const current = this.viewing();
            if (current && current._id === employeeId) {
              this.employeesApi.getById(employeeId).subscribe({
                next: (updated) => {
                  this.viewing.set(updated);
                },
              });
            }
          },
          error: (err) => {
            const message = err.error?.message || 'Error al eliminar el archivo';
            this.toastError(message);
          },
        });
      },
    });
  }

  removeAntecedenteUrl(employeeId: string, url: string) {
    this.confirmationService.confirm({
      message: '¿Está seguro de que desea eliminar este archivo de antecedentes policiales?',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.employeesApi.removeAntecedentePolicial(employeeId, url).subscribe({
          next: () => {
            this.toastSuccess('Archivo de antecedentes policiales eliminado exitosamente');
            this.load();
            // Actualizar el empleado en vista si está abierto
            const current = this.viewing();
            if (current && current._id === employeeId) {
              this.employeesApi.getById(employeeId).subscribe({
                next: (updated) => {
                  this.viewing.set(updated);
                },
              });
            }
          },
          error: (err) => {
            const message = err.error?.message || 'Error al eliminar el archivo';
            this.toastError(message);
          },
        });
      },
    });
  }

  removeConstanciaUrl(employeeId: string, url: string) {
    this.confirmationService.confirm({
      message: '¿Está seguro de que desea eliminar este archivo de constancia?',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.employeesApi.removeConstanciaSuspension(employeeId, url).subscribe({
          next: () => {
            this.toastSuccess('Archivo de constancia eliminado exitosamente');
            this.load();
            // Actualizar el empleado en vista si está abierto
            const current = this.viewing();
            if (current && current._id === employeeId) {
              this.employeesApi.getById(employeeId).subscribe({
                next: (updated) => {
                  this.viewing.set(updated);
                },
              });
            }
          },
          error: (err) => {
            const message = err.error?.message || 'Error al eliminar el archivo';
            this.toastError(message);
          },
        });
      },
    });
  }

  // Métodos auxiliares para formatear tamaño de archivo
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // Método para descargar archivo
  downloadFile(url: string) {
    window.open(url, '_blank');
  }

  // Método para verificar si un archivo es una imagen
  isImageFile(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some((ext) => lowerUrl.includes(ext));
  }

  // Métodos para drag and drop de contratos
  onDragOverContratos(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingContratos.set(true);
  }

  onDragLeaveContratos(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingContratos.set(false);
  }

  onDropContratos(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingContratos.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files) as File[];
      // Filtrar solo archivos válidos según el accept
      const validFiles = fileArray.filter((file) => {
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        return ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'].includes(extension);
      });
      if (validFiles.length > 0) {
        this.selectedContratos.set([...this.selectedContratos(), ...validFiles]);
      } else {
        this.toastError(
          'Tipo de archivo no válido. Solo se permiten: PDF, DOC, DOCX, JPG, JPEG, PNG',
        );
      }
    }
  }

  // Métodos para drag and drop de antecedentes policiales
  onDragOverAntecedentes(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingAntecedentes.set(true);
  }

  onDragLeaveAntecedentes(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingAntecedentes.set(false);
  }

  onDropAntecedentes(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingAntecedentes.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files) as File[];
      // Filtrar solo archivos válidos según el accept
      const validFiles = fileArray.filter((file) => {
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        return ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'].includes(extension);
      });
      if (validFiles.length > 0) {
        this.selectedAntecedentes.set([...this.selectedAntecedentes(), ...validFiles]);
      } else {
        this.toastError(
          'Tipo de archivo no válido. Solo se permiten: PDF, DOC, DOCX, JPG, JPEG, PNG',
        );
      }
    }
  }

  // Métodos para drag and drop de constancia
  onDragOverConstancia(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingConstancia.set(true);
  }

  onDragLeaveConstancia(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingConstancia.set(false);
  }

  onDropConstancia(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingConstancia.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files) as File[];
      // Filtrar solo archivos válidos según el accept
      const validFiles = fileArray.filter((file) => {
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        return ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'].includes(extension);
      });
      if (validFiles.length > 0) {
        this.selectedConstancia.set([...this.selectedConstancia(), ...validFiles]);
      } else {
        this.toastError(
          'Tipo de archivo no válido. Solo se permiten: PDF, DOC, DOCX, JPG, JPEG, PNG',
        );
      }
    }
  }

  // Métodos para manejar foto de perfil
  onFotoPerfilSelect(event: FileSelectEvent) {
    const file = event.files?.[0];
    if (file) {
      this.selectedFotoPerfil.set(file);
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const current = this.editing();
        if (current) {
          this.editing.set({ ...current, fotoPerfil: e.target.result });
        }
      };
      reader.readAsDataURL(file);
    }
  }

  // Métodos para manejar cónyuge/concubino
  onConyugeChange(field: string, value: string) {
    const current = this.editing();
    if (current) {
      const conyuge = current.conyugeConcubino || {
        nombre: '',
        tipoDocumento: '',
        numeroDocumento: '',
      };
      this.editing.set({
        ...current,
        conyugeConcubino: { ...conyuge, [field]: value },
      });
    }
  }

  // Métodos para manejar hijos
  addHijo() {
    const current = this.editing();
    if (current) {
      const hijos = current.hijos || [];
      this.editing.set({
        ...current,
        hijos: [
          ...hijos,
          {
            nombre: '',
            fechaNacimiento: '',
            tipoDocumento: 'DNI',
            numeroDocumento: '',
          },
        ],
      });
    }
  }

  removeHijo(index: number) {
    const current = this.editing();
    if (current && current.hijos) {
      const hijos = [...current.hijos];
      hijos.splice(index, 1);
      this.editing.set({ ...current, hijos });
    }
  }

  onHijoChange(index: number, field: string, value: string) {
    const current = this.editing();
    if (current && current.hijos) {
      const hijos = [...current.hijos];
      hijos[index] = { ...hijos[index], [field]: value };
      this.editing.set({ ...current, hijos });
    }
  }

  // Método para subir foto de perfil
  uploadFotoPerfilFile(employeeId: string, file: File, isLastUpload = false) {
    this.employeesApi.uploadFotoPerfil(employeeId, file).subscribe({
      next: () => {
        this.toastSuccess('Foto de perfil subida exitosamente');
        this.selectedFotoPerfil.set(null);
        this.load();
        if (isLastUpload) {
          this.loading.set(false);
          this.closeDialog();
        }
      },
      error: (err) => {
        const message = err.error?.message || `Error al subir ${file.name}`;
        this.toastError(message);
        if (isLastUpload) {
          this.loading.set(false);
          this.closeDialog();
        }
      },
    });
  }

  // Métodos helper para convertir fechas a Date para p-calendar
  getDateValue(date: string | Date | undefined): Date | null {
    if (!date) return null;
    if (date instanceof Date) {
      return date;
    }
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }

  onDateChange(field: string, value: Date | null) {
    if (value && value instanceof Date) {
      // Mantener como objeto Date en el estado 'editing' para que el datepicker no falle
      this.onEditChange(field as keyof Employee, value);
    } else {
      this.onEditChange(field as keyof Employee, undefined);
    }
  }

  onHijoDateChange(index: number, value: Date | null) {
    const current = this.editing();
    if (current && current.hijos) {
      const hijos = [...current.hijos];
      // Mantener como Date en el estado
      hijos[index] = { ...hijos[index], fechaNacimiento: value || '' };
      this.editing.set({ ...current, hijos });
    }
  }
}
