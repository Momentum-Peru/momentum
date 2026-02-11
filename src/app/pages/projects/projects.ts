import { Component, OnInit, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProjectsApiService } from '../../shared/services/projects-api.service';
import { ClientsApiService } from '../../shared/services/clients-api.service';
import { MenuService } from '../../shared/services/menu.service';
import { Project } from '../../shared/interfaces/project.interface';
import { ClientOption } from '../../shared/services/clients-api.service';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../login/services/auth.service';
import { TabsModule } from 'primeng/tabs';
import { MultiSelectModule } from 'primeng/multiselect';
import { EmployeesApiService } from '../../shared/services/employees-api.service';
import { TimeTrackingApiService } from '../../shared/services/time-tracking-api.service';
import { Employee } from '../../shared/interfaces/employee.interface';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    DialogModule,
    SelectModule,
    DatePickerModule,
    TooltipModule,
    ToastModule,
    TabsModule,
    MultiSelectModule,
  ],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
})
export class ProjectsPage implements OnInit {
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly messageService = inject(MessageService);
  private readonly menuService = inject(MenuService);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly employeesApi = inject(EmployeesApiService);
  private readonly timeTrackingApi = inject(TimeTrackingApiService);

  // Verificar si el usuario tiene permiso de edición para este módulo
  readonly canEdit = computed(() => this.menuService.canEdit('/projects'));

  items = signal<Project[]>([]);
  filteredItems = signal<Project[]>([]);
  clients = signal<ClientOption[]>([]);
  query = signal('');
  selectedStatus = signal<string | null>(null);
  selectedIsActive = signal<boolean | null>(null);
  showDialog = signal(false);
  showDetailsDialog = signal(false);
  editing = signal<Project | null>(null);
  viewingProject = signal<Project | null>(null);
  
  // Project Employee Management
  projectEmployees = signal<any[]>([]);
  availableEmployees = signal<Employee[]>([]);
  showAssignDialog = signal(false);
  showTeamDialog = signal(false);
  selectedEmployeeId = signal<string | null>(null);
  assigningEmployee = signal(false);

  // Batch Attendance
  showBatchDialog = signal(false);
  batchData = signal({
    startDate: '',
    endDate: '',
    daysOfWeek: [] as number[],
    entryTime: '08:00',
    exitTime: '17:00',
    userIds: [] as string[]
  });
  batchSubmitting = signal(false);
  weekDays = [
      { label: 'Domingo', value: 0 },
      { label: 'Lunes', value: 1 },
      { label: 'Martes', value: 2 },
      { label: 'Miércoles', value: 3 },
      { label: 'Jueves', value: 4 },
      { label: 'Viernes', value: 5 },
      { label: 'Sábado', value: 6 }
  ];

  expandedRowIds = signal<Set<string>>(new Set());
  nextCode = signal<number | null>(null);
  selectedFiles = signal<File[]>([]);
  isDragging = signal<boolean>(false);
  existingAttachments = signal<Project['attachments']>([]);
  attachmentsToDelete = signal<string[]>([]);
  uploadingFiles = signal<boolean>(false);

  statusOptions = [
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'En Cotización', value: 'EN_COTIZACION' },
    { label: 'Aprobado', value: 'APROBADO' },
    { label: 'En Ejecución', value: 'EN_EJECUCION' },
    { label: 'En Observación', value: 'EN_OBSERVACION' },
    { label: 'Terminado', value: 'TERMINADO' },
    { label: 'Cancelado', value: 'CANCELADO' },
  ];

  ngOnInit() {
    // Leer queryParams para filtrar por status e isActive
    this.route.queryParams.subscribe((params) => {
      if (params['status']) {
        this.selectedStatus.set(params['status']);
      } else {
        this.selectedStatus.set(null);
      }
      // El backend usa 'activeOnly', pero el menú puede pasar 'isActive'
      // Si isActive es 'false', significa que queremos proyectos archivados (activeOnly=false)
      // Si no está presente, no aplicamos filtro
      if (params['isActive'] !== undefined) {
        const isActiveValue = params['isActive'];
        // Convertir string 'false' o 'true' a booleano
        if (isActiveValue === 'false' || isActiveValue === false) {
          this.selectedIsActive.set(false); // Proyectos archivados
        } else if (isActiveValue === 'true' || isActiveValue === true) {
          this.selectedIsActive.set(true); // Solo proyectos activos
        } else {
          this.selectedIsActive.set(null);
        }
      } else {
        this.selectedIsActive.set(null);
      }
      this.load();
    });
    this.loadClients();
  }

  constructor() {
    // Efecto para manejar el cierre del diálogo
    effect(() => {
      if (!this.showDialog()) {
        this.editing.set(null);
      }
    });

    // Efecto para manejar el cierre del diálogo de detalles
    effect(() => {
      if (!this.showDetailsDialog()) {
        this.viewingProject.set(null);
      }
    });
  }

  load() {
    const status = this.selectedStatus();
    const isActive = this.selectedIsActive();

    // Si hay filtros desde queryParams, usar listWithFilters
    if (status || isActive !== null) {
      this.projectsApi
        .listWithFilters({
          status: status || undefined,
          activeOnly: isActive !== null ? isActive : undefined,
        })
        .subscribe({
          next: (data) => {
            this.items.set(data);
            this.applyFilters();
          },
          error: (error) => {
            console.error('Error loading projects:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error al cargar los proyectos',
            });
          },
        });
    } else {
      // Sin filtros, cargar todos
      this.projectsApi.list().subscribe({
        next: (data) => {
          this.items.set(data);
          this.applyFilters();
        },
        error: (error) => {
          console.error('Error loading projects:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar los proyectos',
          });
        },
      });
    }
  }

  loadClients() {
    this.clientsApi.list().subscribe({
      next: (data) => this.clients.set(data),
      error: (error) => {
        console.error('Error loading clients:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los clientes',
        });
      },
    });
  }

  setQuery(value: string) {
    this.query.set(value);
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.items()];

    // Filtro por texto (búsqueda en nombre, descripción, código)
    const query = this.query().toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.code.toLowerCase().includes(query)
      );
    }

    // Los filtros por status e isActive ya se aplican en load() mediante listWithFilters
    // pero si hay filtros locales adicionales, se aplican aquí

    this.filteredItems.set(filtered);
  }

  newItem() {
    // Si hay un filtro de estado activo desde queryParams, usarlo como estado predeterminado
    const defaultStatus = (this.selectedStatus() || 'PENDIENTE') as Project['status'];

    this.editing.set({
      name: '',
      description: '',
      code: '',
      clientId: '',
      status: defaultStatus,
      startDate: '',
      endDate: '',
      location: '',
      budget: 0,
      notes: '',
      isActive: true,
    });
    this.nextCode.set(null);
    this.projectsApi.getNextCode().subscribe({
      next: (res) => this.nextCode.set(res.nextCode),
      error: () => this.nextCode.set(null),
    });
    this.showDialog.set(true);
  }

  editItem(item: Project) {
    // Convertir las fechas de string a Date para el datepicker
    // Extraer el clientId si viene como objeto
    let clientId = item.clientId;
    if (typeof clientId === 'object' && clientId !== null && '_id' in clientId) {
      clientId = (clientId as { _id: string })._id;
    }

    const editedItem = {
      ...item,
      clientId: clientId as string,
      startDate: item.startDate ? new Date(item.startDate) : undefined,
      endDate: item.endDate ? new Date(item.endDate) : undefined,
    };

    console.log('Editando proyecto:', editedItem);
    console.log('Clientes disponibles:', this.clients());

    this.editing.set(editedItem);
    this.nextCode.set(null);
    // Cargar archivos existentes
    this.existingAttachments.set(item.attachments || []);
    this.attachmentsToDelete.set([]);
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
    this.selectedFiles.set([]);
    this.isDragging.set(false);
    this.existingAttachments.set([]);
    this.attachmentsToDelete.set([]);
    this.uploadingFiles.set(false);
  }

  viewDetails(project: Project) {
    this.viewingProject.set(project);
    this.showDetailsDialog.set(true);
  }

  openTeamDialog(project: Project) {
    this.viewingProject.set(project);
    this.showTeamDialog.set(true);
    if(project._id) {
        this.loadProjectEmployees(project._id);
    }
  }

  loadProjectEmployees(projectId: string) {
    this.projectsApi.getProjectEmployees(projectId).subscribe({
        next: (employees) => this.projectEmployees.set(employees),
        error: (err) => console.error('Error loading employees', err)
    });
  }

  openAssignDialog() {
    this.employeesApi.list().subscribe({
        next: (employees) => {
            // Filter out already assigned? Or backend handles it?
            // Let's just show all for now, maybe filter in UI
            this.availableEmployees.set(employees);
            this.selectedEmployeeId.set(null);
            this.showAssignDialog.set(true);
        }
    });
  }

  assignEmployee() {
    const projectId = this.viewingProject()?._id;
    const employeeId = this.selectedEmployeeId();
    if (!projectId || !employeeId) return;

    this.assigningEmployee.set(true);
    this.projectsApi.assignEmployee(projectId, employeeId).subscribe({
        next: () => {
            this.messageService.add({ severity: 'success', summary: 'Asignado', detail: 'Empleado asignado correctamente' });
            this.loadProjectEmployees(projectId);
            this.showAssignDialog.set(false);
        },
        error: (err) => {
             this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al asignar empleado' });
        },
        complete: () => this.assigningEmployee.set(false)
    });
  }

  removeAssignment(employeeId: string) {
      const projectId = this.viewingProject()?._id;
      if (!projectId) return;
      
      this.projectsApi.removeAssignment(projectId, employeeId).subscribe({
          next: () => {
               this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Asignación eliminada' });
               this.loadProjectEmployees(projectId);
          },
          error: (err) => {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al eliminar asignación' });
          }
      });
  }

  updateBatchField(field: string, value: any) {
    this.batchData.update((data) => ({ ...data, [field]: value }));
  }

  openBatchDialog() {
      this.batchData.set({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        daysOfWeek: [1, 2, 3, 4, 5],
        entryTime: '08:00',
        exitTime: '17:00',
        userIds: []
      });
      // Pre-select all project employees
      const employeeIds = this.projectEmployees().map(e => e._id);
      this.batchData.update(d => ({ ...d, userIds: employeeIds }));
      this.showBatchDialog.set(true);
  }

  submitBatch() {
       const projectId = this.viewingProject()?._id;
       if (!projectId) return;
       
       const data = this.batchData();
       // Validate
       if (!data.startDate || !data.endDate || data.userIds.length === 0) {
           this.messageService.add({ severity: 'warn', summary: 'Validación', detail: 'Complete los campos requeridos' });
           return;
       }

       this.batchSubmitting.set(true);
       this.timeTrackingApi.batchCreate({
           ...data,
           projectId
       }).subscribe({
           next: (res) => {
               this.messageService.add({ 
                   severity: 'success', 
                   summary: 'Procesado', 
                   detail: `Creados: ${res.created}, Omitidos: ${res.skipped}, Errores: ${res.errors}` 
               });
               this.showBatchDialog.set(false);
           },
           error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error en proceso masivo' });
           },
           complete: () => this.batchSubmitting.set(false)
       });
  }


  closeDetails() {
    this.showDetailsDialog.set(false);
  }

  toggleRow(id?: string) {
    if (!id) return;
    const next = new Set(this.expandedRowIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expandedRowIds.set(next);
  }

  isRowExpanded(id?: string): boolean {
    if (!id) return false;
    return this.expandedRowIds().has(id);
  }

  onEditChange(field: keyof Project, value: Project[keyof Project]) {
    const current = this.editing();
    if (current) {
      console.log(`Cambiando ${field}:`, value);
      this.editing.set({ ...current, [field]: value });
    }
  }

  save() {
    const item = this.editing();
    if (!item) return;

    // Validar campos requeridos
    const validationErrors = this.validateForm(item);
    if (validationErrors.length > 0) {
      validationErrors.forEach((error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error de validación',
          detail: error,
        });
      });
      return;
    }

    // Convertir fechas de Date a string ISO si es necesario
    const formatDate = (date: string | Date | undefined): string | undefined => {
      if (!date) return undefined;
      if (date instanceof Date) {
        return date.toISOString();
      }
      return date;
    };

    const payload = {
      name: item.name.trim(),
      description: item.description?.trim() || '',
      clientId: item.clientId,
      status: item.status,
      startDate: formatDate(item.startDate),
      endDate: formatDate(item.endDate),
      location:
        item.location && item.location.toString().trim() !== ''
          ? item.location.toString().trim()
          : undefined,
      budget: item.budget || 0,
      notes: item.notes?.trim() || '',
      isActive: item.isActive ?? true,
    };

    if (item._id) {
      this.projectsApi.update(item._id, payload).subscribe({
        next: async (updatedProject) => {
          // Eliminar archivos marcados para eliminar
          const attachmentsToDelete = this.attachmentsToDelete();
          if (attachmentsToDelete.length > 0 && updatedProject._id) {
            await this.deleteAttachments(updatedProject._id, attachmentsToDelete);
          }

          // Subir archivos si hay alguno seleccionado
          const files = this.selectedFiles();
          if (files.length > 0 && updatedProject._id) {
            await this.uploadFiles(updatedProject._id, files);
          }

          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Proyecto actualizado correctamente',
          });
          this.load();
          this.closeDialog();
        },
        error: (error) => {
          console.error('Error updating project:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getErrorMessage(error),
          });
        },
      });
    } else {
      this.projectsApi.create(payload).subscribe({
        next: async (createdProject) => {
          // Subir archivos si hay alguno seleccionado
          const files = this.selectedFiles();
          if (files.length > 0 && createdProject._id) {
            await this.uploadFiles(createdProject._id, files);
          }

          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Proyecto creado correctamente',
          });
          this.load();
          this.closeDialog();
        },
        error: (error) => {
          console.error('Error creating project:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getErrorMessage(error),
          });
        },
      });
    }
  }

  remove(item: Project) {
    if (!item._id) return;
    if (confirm('¿Estás seguro de eliminar este proyecto?')) {
      this.projectsApi.delete(item._id).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Proyecto eliminado correctamente',
          });
          this.load();
        },
        error: (error) => {
          console.error('Error deleting project:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getErrorMessage(error),
          });
        },
      });
    }
  }

  getStatusLabel(status: string): string {
    const option = this.statusOptions.find((opt) => opt.value === status);
    return option?.label || status;
  }

  getStatusSeverity(status: string): string {
    switch (status) {
      case 'PENDIENTE':
        return 'info';
      case 'EN_COTIZACION':
        return 'warning';
      case 'APROBADO':
        return 'success';
      case 'EN_EJECUCION':
        return 'success';
      case 'EN_OBSERVACION':
        return 'warning';
      case 'TERMINADO':
        return 'success';
      case 'CANCELADO':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  getStatusClass(status: string): string {
    const severity = this.getStatusSeverity(status);
    switch (severity) {
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
      case 'danger':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }

  getClientName(clientId: string | { _id: string; name: string; taxId?: string }): string {
    // Si clientId es un objeto, devolver el nombre directamente
    if (typeof clientId === 'object' && clientId !== null && 'name' in clientId) {
      return clientId.name;
    }

    // Si clientId es un string, buscar en la lista de clientes
    const client = this.clients().find((c) => c._id === clientId);
    return client?.name || 'Cliente no encontrado';
  }

  getCreatorName(createdBy: string | { _id: string; name: string; email?: string } | undefined): string {
    if (!createdBy) {
      return 'No registrado';
    }

    // Si createdBy es un objeto con nombre, devolverlo directamente
    if (typeof createdBy === 'object' && createdBy !== null && 'name' in createdBy) {
      return createdBy.name;
    }

    // Si es un string (ID), mostrar mensaje genérico
    return 'Usuario';
  }

  // Método para validar el formulario
  private validateForm(item: Project): string[] {
    const errors: string[] = [];

    // El código se genera automáticamente en el backend

    // Validar nombre
    if (!item.name || item.name.trim() === '') {
      errors.push('El nombre del proyecto es requerido');
    }

    // Validar cliente
    if (!item.clientId || (typeof item.clientId === 'string' && item.clientId.trim() === '')) {
      errors.push('El cliente es requerido');
    }

    // Validar estado
    if (!item.status || item.status.trim() === '') {
      errors.push('El estado es requerido');
    }

    // Validar presupuesto si se proporciona
    if (item.budget !== undefined && item.budget < 0) {
      errors.push('El presupuesto no puede ser negativo');
    }

    // Validar fechas si se proporcionan
    if (item.startDate && item.endDate) {
      const startDate = new Date(item.startDate);
      const endDate = new Date(item.endDate);
      if (startDate > endDate) {
        errors.push('La fecha de inicio no puede ser posterior a la fecha de fin');
      }
    }

    return errors;
  }

  // Método para obtener mensaje de error de la API
  private getErrorMessage(error: unknown): string {
    // Manejar errores de validación específicos
    if (error && typeof error === 'object' && 'error' in error) {
      const errorObj = error as { error?: { message?: string | string[] }; message?: string };
      if (errorObj.error?.message) {
        const message = errorObj.error.message;

        // Si es un array de mensajes, unirlos
        if (Array.isArray(message)) {
          const filtered = message.filter((m: string) => !/c[oó]digo/i.test(m));
          return filtered.join(', ');
        }

        // Traducir mensajes comunes de validación (actualizado: código ahora se genera automáticamente)
        if (typeof message === 'string') {
          if (message.includes('name should not be empty')) {
            return 'El nombre del proyecto es requerido';
          }
          if (message.includes('clientId should not be empty')) {
            return 'El cliente es requerido';
          }
          if (message.includes('status should not be empty')) {
            return 'El estado es requerido';
          }
          if (message.includes('clientId must be a valid ObjectId')) {
            return 'El cliente seleccionado no es válido';
          }
          if (message.includes('status must be one of the following values')) {
            return 'El estado seleccionado no es válido';
          }
          if (message.includes('budget must be a positive number')) {
            return 'El presupuesto debe ser un número positivo';
          }
          // Variantes para fecha de inicio
          if (
            message.includes('startDate should not be empty') ||
            message.includes('startDate should not be null or undefined')
          ) {
            return 'La fecha de inicio es obligatoria';
          }
          if (
            message.includes('startDate must be a valid date') ||
            message.includes('startDate must be a valid ISO 8601 date string') ||
            message.includes('startDate must be a valid ISO 8601 date')
          ) {
            return 'La fecha de inicio no es válida';
          }
          if (message.includes('endDate must be a valid date')) {
            return 'La fecha de fin no es válida';
          }
          return message;
        }
      }
      const inner = (errorObj as { error?: unknown }).error as unknown;
      if (inner && typeof inner === 'object') {
        const innerRecord = inner as Record<string, unknown>;
        const innerError = innerRecord['error'];
        if (typeof innerError === 'string') {
          return innerError;
        }
      }
    }

    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }

    return 'Ha ocurrido un error inesperado';
  }

  /**
   * Maneja la selección de archivos
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.addFiles(files);
    }
  }

  /**
   * Agrega archivos a la lista
   */
  addFiles(files: File[]): void {
    const currentFiles = this.selectedFiles();
    this.selectedFiles.set([...currentFiles, ...files]);

    this.messageService.add({
      severity: 'info',
      summary: 'Archivos agregados',
      detail: `${files.length} archivo(s) agregado(s) correctamente`,
    });
  }

  /**
   * Elimina un archivo de la lista
   */
  removeFile(index: number): void {
    const current = this.selectedFiles();
    current.splice(index, 1);
    this.selectedFiles.set([...current]);
  }

  /**
   * Formatea el tamaño del archivo
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Maneja el drag over
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  /**
   * Maneja el drag leave
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  /**
   * Maneja el drop
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const files = Array.from(event.dataTransfer.files);
      this.addFiles(files);
    }
  }

  /**
   * Sube los archivos al proyecto usando Presigned URLs
   */
  private async uploadFiles(projectId: string, files: File[]): Promise<void> {
    try {
      this.uploadingFiles.set(true);

      const currentUser = this.authService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo obtener la información del usuario',
        });
        this.uploadingFiles.set(false);
        return;
      }

      await this.projectsApi.uploadProjectAttachments(
        projectId,
        files,
        currentUser.id,
        undefined,
        (progress) => {
          // Opcional: mostrar progreso
          console.log(`Progreso de subida: ${progress}%`);
        }
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: `Archivos subidos correctamente al proyecto.`,
      });

      // Limpiar archivos seleccionados
      this.selectedFiles.set([]);
    } catch (error) {
      console.error('Error uploading files:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El proyecto se guardó pero hubo un error al subir los archivos.',
      });
    } finally {
      this.uploadingFiles.set(false);
    }
  }

  /**
   * Elimina o restaura un archivo adjunto existente
   */
  removeExistingAttachment(attachmentId: string): void {
    const toDelete = this.attachmentsToDelete();
    if (toDelete.includes(attachmentId)) {
      // Restaurar el archivo
      this.attachmentsToDelete.set(toDelete.filter((id) => id !== attachmentId));
    } else {
      // Marcar para eliminar
      this.attachmentsToDelete.set([...toDelete, attachmentId]);
    }
  }

  /**
   * Elimina archivos adjuntos del proyecto
   */
  private async deleteAttachments(projectId: string, attachmentIds: string[]): Promise<void> {
    const deletePromises = attachmentIds.map((attachmentId) =>
      this.projectsApi.deleteProjectAttachment(projectId, attachmentId).toPromise()
    );

    try {
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting attachments:', error);
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Algunos archivos no pudieron ser eliminados.',
      });
    }
  }

  /**
   * Obtiene el icono según el tipo de archivo
   */
  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return 'pi pi-image';
    } else if (mimeType.startsWith('video/')) {
      return 'pi pi-video';
    } else if (mimeType.startsWith('audio/')) {
      return 'pi pi-volume-up';
    } else if (mimeType.includes('pdf')) {
      return 'pi pi-file-pdf';
    } else {
      return 'pi pi-file';
    }
  }
}
