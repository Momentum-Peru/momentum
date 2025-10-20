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
        TooltipModule
    ],
    templateUrl: './projects.html',
    styleUrl: './projects.scss'
})
export class ProjectsPage implements OnInit {
    private readonly projectsApi = inject(ProjectsApiService);
    private readonly clientsApi = inject(ClientsApiService);

    items = signal<Project[]>([]);
    clients = signal<ClientOption[]>([]);
    query = signal('');
    showDialog = signal(false);
    editing = signal<Project | null>(null);

    statusOptions = [
        { label: 'Planificación', value: 'PLANNING' },
        { label: 'Activo', value: 'ACTIVE' },
        { label: 'En Pausa', value: 'ON_HOLD' },
        { label: 'Completado', value: 'COMPLETED' },
        { label: 'Cancelado', value: 'CANCELLED' }
    ];

    ngOnInit() {
        this.load();
        this.loadClients();
    }

    load() {
        this.projectsApi.list().subscribe({
            next: (data) => this.items.set(data),
            error: (error) => console.error('Error loading projects:', error)
        });
    }

    loadClients() {
        this.clientsApi.list().subscribe({
            next: (data) => this.clients.set(data),
            error: (error) => console.error('Error loading clients:', error)
        });
    }

    setQuery(event: Event) {
        const target = event.target as HTMLInputElement;
        this.query.set(target.value);
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
            isActive: true
        });
        this.showDialog.set(true);
    }

    editItem(item: Project) {
        this.editing.set({ ...item });
        this.showDialog.set(true);
    }

    closeDialog() {
        this.showDialog.set(false);
        this.editing.set(null);
    }

    onEditChange(field: keyof Project, value: any) {
        const current = this.editing();
        if (current) {
            this.editing.set({ ...current, [field]: value });
        }
    }

    save() {
        const item = this.editing();
        if (!item) return;

        const payload = {
            name: item.name.trim(),
            description: item.description?.trim() || '',
            code: item.code.trim(),
            clientId: item.clientId,
            status: item.status,
            startDate: item.startDate || undefined,
            endDate: item.endDate || undefined,
            location: item.location?.trim() || '',
            budget: item.budget || 0,
            notes: item.notes?.trim() || '',
            isActive: item.isActive ?? true
        };

        if (item._id) {
            this.projectsApi.update(item._id, payload).subscribe({
                next: () => {
                    this.load();
                    this.closeDialog();
                },
                error: (error) => console.error('Error updating project:', error)
            });
        } else {
            this.projectsApi.create(payload as Project).subscribe({
                next: () => {
                    this.load();
                    this.closeDialog();
                },
                error: (error) => console.error('Error creating project:', error)
            });
        }
    }

    remove(item: Project) {
        if (!item._id) return;
        if (confirm('¿Estás seguro de eliminar este proyecto?')) {
            this.projectsApi.delete(item._id).subscribe({
                next: () => this.load(),
                error: (error) => console.error('Error deleting project:', error)
            });
        }
    }

    getStatusLabel(status: string): string {
        const option = this.statusOptions.find(opt => opt.value === status);
        return option?.label || status;
    }

    getStatusSeverity(status: string): string {
        switch (status) {
            case 'PLANNING': return 'info';
            case 'ACTIVE': return 'success';
            case 'ON_HOLD': return 'warning';
            case 'COMPLETED': return 'success';
            case 'CANCELLED': return 'danger';
            default: return 'secondary';
        }
    }

    getStatusClass(status: string): string {
        const severity = this.getStatusSeverity(status);
        switch (severity) {
            case 'info': return 'bg-blue-100 text-blue-800';
            case 'success': return 'bg-green-100 text-green-800';
            case 'warning': return 'bg-yellow-100 text-yellow-800';
            case 'danger': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    getClientName(clientId: string): string {
        const client = this.clients().find(c => c._id === clientId);
        return client?.name || 'Cliente no encontrado';
    }
}