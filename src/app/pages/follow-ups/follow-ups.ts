import {
    ChangeDetectionStrategy,
    Component,
    inject,
    signal,
    OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { FollowUpsApiService } from '../../shared/services/follow-ups-api.service';
import { LeadsApiService } from '../../shared/services/leads-api.service';
import { ContactsCrmApiService } from '../../shared/services/contacts-crm-api.service';
import { ClientsApiService, ClientOption } from '../../shared/services/clients-api.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import { UserOption } from '../../shared/interfaces/menu-permission.interface';
import {
    FollowUp,
    FollowUpType,
    FollowUpStatus,
    CreateFollowUpRequest,
    UpdateFollowUpRequest,
} from '../../shared/interfaces/follow-up.interface';
import { Lead } from '../../shared/interfaces/lead.interface';
import { ContactCrm } from '../../shared/interfaces/contact-crm.interface';

@Component({
    selector: 'app-follow-ups',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        InputTextModule,
        ButtonModule,
        TableModule,
        DialogModule,
        SelectModule,
        TooltipModule,
        ToastModule,
        CardModule,
        ConfirmDialogModule,
        TagModule,
        TextareaModule,
        DatePickerModule,
    ],
    providers: [ConfirmationService, MessageService],
    templateUrl: './follow-ups.html',
    styleUrls: ['./follow-ups.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FollowUpsPage implements OnInit {
    private readonly followUpsApi = inject(FollowUpsApiService);
    private readonly leadsApi = inject(LeadsApiService);
    private readonly contactsApi = inject(ContactsCrmApiService);
    private readonly clientsApi = inject(ClientsApiService);
    private readonly usersApi = inject(UsersApiService);
    private readonly messageService = inject(MessageService);
    private readonly confirmationService = inject(ConfirmationService);

    // Signals
    items = signal<FollowUp[]>([]);
    query = signal<string>('');
    statusFilter = signal<FollowUpStatus | ''>('');
    typeFilter = signal<FollowUpType | ''>('');
    showDialog = signal<boolean>(false);
    showDetailsDialog = signal<boolean>(false);
    editing = signal<Partial<FollowUp> | null>(null);
    viewingFollowUp = signal<FollowUp | null>(null);
    expandedRows = signal<Set<string>>(new Set());

    // Selectores
    leads = signal<Lead[]>([]);
    contacts = signal<ContactCrm[]>([]);
    clients = signal<ClientOption[]>([]);
    users = signal<UserOption[]>([]);

    // Opciones de enums
    typeOptions: { label: string; value: FollowUpType | '' }[] = [
        { label: 'Todos', value: '' },
        { label: 'Llamada', value: 'CALL' },
        { label: 'Email', value: 'EMAIL' },
        { label: 'Reunión', value: 'MEETING' },
        { label: 'Nota', value: 'NOTE' },
        { label: 'Propuesta', value: 'PROPOSAL' },
        { label: 'Otro', value: 'OTHER' },
    ];

    statusOptions: { label: string; value: FollowUpStatus | '' }[] = [
        { label: 'Todos', value: '' },
        { label: 'Programado', value: 'SCHEDULED' },
        { label: 'Completado', value: 'COMPLETED' },
        { label: 'Cancelado', value: 'CANCELLED' },
    ];

    statusColors: Record<FollowUpStatus, 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'> = {
        SCHEDULED: 'warn',
        COMPLETED: 'success',
        CANCELLED: 'danger',
    };

    // Cache para las fechas para evitar crear nuevos objetos Date en cada render
    private cachedScheduledDate: Date | null = null;
    private cachedScheduledDateString: string | null = null;
    private cachedNextFollowUpDate: Date | null = null;
    private cachedNextFollowUpDateString: string | null = null;

    getScheduledDate(): Date | null {
        const dateString = this.editing()?.scheduledDate;
        if (!dateString) {
            this.cachedScheduledDate = null;
            this.cachedScheduledDateString = null;
            return null;
        }

        // Solo crear un nuevo Date si la string cambió
        if (this.cachedScheduledDateString !== dateString) {
            this.cachedScheduledDate = new Date(dateString);
            this.cachedScheduledDateString = dateString;
        }

        return this.cachedScheduledDate;
    }

    getNextFollowUpDate(): Date | null {
        const dateString = this.editing()?.nextFollowUpDate;
        if (!dateString) {
            this.cachedNextFollowUpDate = null;
            this.cachedNextFollowUpDateString = null;
            return null;
        }

        // Solo crear un nuevo Date si la string cambió
        if (this.cachedNextFollowUpDateString !== dateString) {
            this.cachedNextFollowUpDate = new Date(dateString);
            this.cachedNextFollowUpDateString = dateString;
        }

        return this.cachedNextFollowUpDate;
    }

    onScheduledDateChange(date: Date | null) {
        if (date) {
            const dateString = date.toISOString();
            // Evitar actualización innecesaria si el valor es el mismo
            if (this.editing()?.scheduledDate !== dateString) {
                this.onEditChange('scheduledDate', dateString);
            }
        } else {
            if (this.editing()?.scheduledDate !== undefined) {
                this.onEditChange('scheduledDate', undefined as any);
            }
        }
    }

    onNextFollowUpDateChange(date: Date | null) {
        if (date) {
            const dateString = date.toISOString();
            // Evitar actualización innecesaria si el valor es el mismo
            if (this.editing()?.nextFollowUpDate !== dateString) {
                this.onEditChange('nextFollowUpDate', dateString);
            }
        } else {
            if (this.editing()?.nextFollowUpDate !== undefined) {
                this.onEditChange('nextFollowUpDate', undefined as any);
            }
        }
    }

    // Flags para controlar carga lazy
    private usersLoaded = signal<boolean>(false);
    private clientsLoaded = signal<boolean>(false);
    private leadsLoaded = signal<boolean>(false);
    private contactsLoaded = signal<boolean>(false);

    ngOnInit() {
        this.load();
        // Cargar usuarios inmediatamente ya que se usan en la tabla
        this.loadUsers();
    }

    constructor() {
        // No usar efectos aquí para evitar loops infinitos
        // La limpieza se manejará manualmente en closeDialog() y closeDetails()
    }

    load() {
        const params: any = {};
        if (this.statusFilter()) params.status = this.statusFilter();
        if (this.typeFilter()) params.type = this.typeFilter();

        this.followUpsApi.list(params).subscribe({
            next: (followUps) => this.items.set(followUps),
            error: (error) => {
                console.error('Error loading follow-ups:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar los seguimientos',
                });
            },
        });
    }

    loadUsers() {
        this.usersApi.list().subscribe({
            next: (users) => this.users.set(users),
            error: () => this.users.set([]),
        });
    }

    loadClients() {
        this.clientsApi.list().subscribe({
            next: (clients) => this.clients.set(clients),
            error: () => this.clients.set([]),
        });
    }

    loadLeads() {
        this.leadsApi.list().subscribe({
            next: (leads) => this.leads.set(leads),
            error: () => this.leads.set([]),
        });
    }

    loadContacts() {
        this.contactsApi.list().subscribe({
            next: (contacts) => this.contacts.set(contacts),
            error: () => this.contacts.set([]),
        });
    }

    setStatusFilter(value: FollowUpStatus | '') {
        this.statusFilter.set(value);
        this.load();
    }

    setTypeFilter(value: FollowUpType | '') {
        this.typeFilter.set(value);
        this.load();
    }

    clearFilters() {
        this.statusFilter.set('');
        this.typeFilter.set('');
        this.load();
    }

    newItem() {
        // Cargar datos si no se han cargado antes
        if (!this.clientsLoaded()) {
            this.loadClients();
            this.clientsLoaded.set(true);
        }
        if (!this.leadsLoaded()) {
            this.loadLeads();
            this.leadsLoaded.set(true);
        }
        if (!this.contactsLoaded()) {
            this.loadContacts();
            this.contactsLoaded.set(true);
        }

        // Preparar el objeto de edición antes de abrir el diálogo
        const newEditing: Partial<FollowUp> = {
            title: '',
            description: '',
            type: 'CALL',
            status: 'SCHEDULED',
            scheduledDate: new Date().toISOString(),
            userId: '',
        };
        this.editing.set(newEditing);
        this.showDialog.set(true);
    }

    editItem(item: FollowUp) {
        this.editing.set({ ...item });
        this.showDialog.set(true);
    }

    viewDetails(item: FollowUp) {
        this.viewingFollowUp.set(item);
        this.showDetailsDialog.set(true);
    }

    closeDialog() {
        this.showDialog.set(false);
        // Limpiar editing y cache cuando se cierra el diálogo
        this.editing.set(null);
        this.cachedScheduledDate = null;
        this.cachedScheduledDateString = null;
        this.cachedNextFollowUpDate = null;
        this.cachedNextFollowUpDateString = null;
    }

    closeDetails() {
        this.showDetailsDialog.set(false);
        // Limpiar viewingFollowUp cuando se cierra el diálogo de detalles
        this.viewingFollowUp.set(null);
    }

    onEditChange<K extends keyof FollowUp>(key: K, value: FollowUp[K]) {
        const cur = this.editing();
        if (!cur) return;

        // Evitar actualización si el valor no cambió
        if (cur[key] === value) {
            return;
        }

        this.editing.set({ ...cur, [key]: value });
    }

    save() {
        const item = this.editing();
        if (!item) return;

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

        if (item._id) {
            const updatePayload: UpdateFollowUpRequest = {
                title: item.title,
                description: item.description,
                type: item.type,
                status: item.status,
                scheduledDate: item.scheduledDate,
                leadId: item.leadId,
                contactId: item.contactId,
                clientId: item.clientId,
                userId: item.userId,
                attachments: item.attachments,
                outcome: item.outcome,
                nextFollowUpDate: item.nextFollowUpDate,
            };
            this.followUpsApi.update(item._id, updatePayload).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Seguimiento actualizado correctamente',
                    });
                    this.closeDialog();
                    this.load();
                },
                error: (error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: this.getErrorMessage(error),
                    });
                },
            });
        } else {
            const createPayload: CreateFollowUpRequest = {
                title: item.title!,
                description: item.description!,
                type: item.type!,
                status: item.status,
                scheduledDate: item.scheduledDate!,
                leadId: item.leadId,
                contactId: item.contactId,
                clientId: item.clientId,
                userId: item.userId!,
                attachments: item.attachments,
                outcome: item.outcome,
                nextFollowUpDate: item.nextFollowUpDate,
            };
            this.followUpsApi.create(createPayload).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Seguimiento creado correctamente',
                    });
                    this.closeDialog();
                    this.load();
                },
                error: (error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: this.getErrorMessage(error),
                    });
                },
            });
        }
    }

    remove(item: FollowUp) {
        if (!item._id) return;

        this.confirmationService.confirm({
            message: `¿Estás seguro de que quieres eliminar el seguimiento "${item.title}"?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            accept: () => {
                this.followUpsApi.delete(item._id!).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Éxito',
                            detail: 'Seguimiento eliminado correctamente',
                        });
                        this.load();
                    },
                    error: (error) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: this.getErrorMessage(error),
                        });
                    },
                });
            },
        });
    }

    getTypeLabel(type: FollowUpType): string {
        const option = this.typeOptions.find((o) => o.value === type);
        return option ? option.label : type;
    }

    getStatusLabel(status: FollowUpStatus): string {
        const option = this.statusOptions.find((o) => o.value === status);
        return option ? option.label : status;
    }

    getStatusSeverity(status: FollowUpStatus): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
        return this.statusColors[status] || 'info';
    }

    getUserName(id: string | undefined): string {
        if (!id) {
            return 'Sin asignar';
        }
        const user = this.users().find((u) => u._id === id);
        return user ? user.name : id;
    }

    getLeadName(id: string | undefined): string {
        if (!id) {
            return '-';
        }
        const lead = this.leads().find((l) => l._id === id);
        return lead ? lead.name : id;
    }

    getContactName(id: string | undefined): string {
        if (!id) {
            return '-';
        }
        const contact = this.contacts().find((c) => c._id === id);
        return contact ? contact.name : id;
    }

    getClientName(id: string | undefined): string {
        if (!id) {
            return '-';
        }
        const client = this.clients().find((c) => c._id === id);
        return client ? client.name : id;
    }

    toggleRow(rowId: string | undefined) {
        if (!rowId) return;
        const expanded = new Set(this.expandedRows());
        if (expanded.has(rowId)) {
            expanded.delete(rowId);
        } else {
            expanded.add(rowId);
        }
        this.expandedRows.set(expanded);
    }

    isRowExpanded(rowId: string | undefined): boolean {
        if (!rowId) return false;
        return this.expandedRows().has(rowId);
    }

    private validateForm(item: Partial<FollowUp>): string[] {
        const errors: string[] = [];

        if (!item.title || item.title.trim() === '') {
            errors.push('El título del seguimiento es requerido');
        }

        if (!item.description || item.description.trim() === '') {
            errors.push('La descripción del seguimiento es requerida');
        }

        if (!item.type) {
            errors.push('El tipo de seguimiento es requerido');
        }

        if (!item.scheduledDate) {
            errors.push('La fecha programada es requerida');
        }

        if (!item.userId || item.userId.trim() === '') {
            errors.push('Debe asignar el seguimiento a un usuario');
        }

        if (!item.leadId && !item.contactId && !item.clientId) {
            errors.push('Debe asociar el seguimiento a un lead, contacto o cliente');
        }

        return errors;
    }

    private getErrorMessage(error: any): string {
        if (error.error?.message) {
            return error.error.message;
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

