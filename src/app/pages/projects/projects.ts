import { Component, OnInit, signal, inject, effect } from '@angular/core';
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
import { Project } from '../../shared/interfaces/project.interface';
import { ClientOption } from '../../shared/services/clients-api.service';

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
  ],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
})
export class ProjectsPage implements OnInit {
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly messageService = inject(MessageService);

  items = signal<Project[]>([]);
  filteredItems = signal<Project[]>([]);
  clients = signal<ClientOption[]>([]);
  query = signal('');
  showDialog = signal(false);
  showDetailsDialog = signal(false);
  editing = signal<Project | null>(null);
  viewingProject = signal<Project | null>(null);
  expandedRowIds = signal<Set<string>>(new Set());
  nextCode = signal<number | null>(null);

  statusOptions = [
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'En Cotización', value: 'EN_COTIZACION' },
    { label: 'En Ejecución', value: 'EN_EJECUCION' },
    { label: 'En Observación', value: 'EN_OBSERVACION' },
    { label: 'Terminado', value: 'TERMINADO' },
    { label: 'Cancelado', value: 'CANCELADO' },
  ];

  ngOnInit() {
    this.load();
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

    this.filteredItems.set(filtered);
  }

  newItem() {
    this.editing.set({
      name: '',
      description: '',
      code: '',
      clientId: '',
      status: 'PENDIENTE',
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
      clientId = (clientId as any)._id;
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
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  viewDetails(project: Project) {
    this.viewingProject.set(project);
    this.showDetailsDialog.set(true);
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

  onEditChange(field: keyof Project, value: any) {
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
      location: item.location && item.location.toString().trim() !== '' ? item.location.toString().trim() : undefined,
      budget: item.budget || 0,
      notes: item.notes?.trim() || '',
      isActive: item.isActive ?? true,
    };

    if (item._id) {
      this.projectsApi.update(item._id, payload).subscribe({
        next: () => {
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
        next: () => {
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
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'danger':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
  private getErrorMessage(error: any): string {
    // Manejar errores de validación específicos
    if (error.error?.message) {
      const message = error.error.message;

      // Si es un array de mensajes, unirlos
      if (Array.isArray(message)) {
        const filtered = message.filter((m: string) => !/c[oó]digo/i.test(m))
        return filtered.join(', ');
      }

      // Traducir mensajes comunes de validación (actualizado: código ahora se genera automáticamente)
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

    if (error.error?.error) {
      return error.error.error;
    }

    if (error.message) {
      return error.message;
    }

    return 'Ha ocurrido un error inesperado';
  }
}
