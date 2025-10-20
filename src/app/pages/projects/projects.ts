import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
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
  ],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
})
export class ProjectsPage implements OnInit {
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly clientsApi = inject(ClientsApiService);

  items = signal<Project[]>([]);
  filteredItems = signal<Project[]>([]);
  clients = signal<ClientOption[]>([]);
  query = signal('');
  showDialog = signal(false);
  editing = signal<Project | null>(null);

  statusOptions = [
    { label: 'Planificación', value: 'PLANNING' },
    { label: 'Activo', value: 'ACTIVE' },
    { label: 'En Pausa', value: 'ON_HOLD' },
    { label: 'Completado', value: 'COMPLETED' },
    { label: 'Cancelado', value: 'CANCELLED' },
  ];

  ngOnInit() {
    this.load();
    this.loadClients();
  }

  load() {
    this.projectsApi.list().subscribe({
      next: (data) => {
        this.items.set(data);
        this.applyFilters();
      },
      error: (error) => console.error('Error loading projects:', error),
    });
  }

  loadClients() {
    this.clientsApi.list().subscribe({
      next: (data) => this.clients.set(data),
      error: (error) => console.error('Error loading clients:', error),
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
      status: 'PLANNING',
      startDate: '',
      endDate: '',
      location: '',
      budget: 0,
      notes: '',
      isActive: true,
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
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
    this.editing.set(null);
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
      code: item.code.trim(),
      clientId: item.clientId,
      status: item.status,
      startDate: formatDate(item.startDate),
      endDate: formatDate(item.endDate),
      location: item.location?.trim() || '',
      budget: item.budget || 0,
      notes: item.notes?.trim() || '',
      isActive: item.isActive ?? true,
    };

    if (item._id) {
      this.projectsApi.update(item._id, payload).subscribe({
        next: () => {
          this.load();
          this.closeDialog();
        },
        error: (error) => console.error('Error updating project:', error),
      });
    } else {
      this.projectsApi.create(payload as Project).subscribe({
        next: () => {
          this.load();
          this.closeDialog();
        },
        error: (error) => console.error('Error creating project:', error),
      });
    }
  }

  remove(item: Project) {
    if (!item._id) return;
    if (confirm('¿Estás seguro de eliminar este proyecto?')) {
      this.projectsApi.delete(item._id).subscribe({
        next: () => this.load(),
        error: (error) => console.error('Error deleting project:', error),
      });
    }
  }

  getStatusLabel(status: string): string {
    const option = this.statusOptions.find((opt) => opt.value === status);
    return option?.label || status;
  }

  getStatusSeverity(status: string): string {
    switch (status) {
      case 'PLANNING':
        return 'info';
      case 'ACTIVE':
        return 'success';
      case 'ON_HOLD':
        return 'warning';
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
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
}
