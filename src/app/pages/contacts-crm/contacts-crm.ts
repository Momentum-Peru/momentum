import {
    ChangeDetectionStrategy,
    Component,
    inject,
    signal,
    effect,
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
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { ContactsCrmApiService } from '../../shared/services/contacts-crm-api.service';
import { ClientsApiService, ClientOption } from '../../shared/services/clients-api.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import { UserOption } from '../../shared/interfaces/menu-permission.interface';
import {
    ContactCrm,
    CreateContactCrmRequest,
    UpdateContactCrmRequest,
} from '../../shared/interfaces/contact-crm.interface';

@Component({
    selector: 'app-contacts-crm',
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
        CheckboxModule,
        TextareaModule,
    ],
    providers: [ConfirmationService, MessageService],
    templateUrl: './contacts-crm.html',
    styleUrls: ['./contacts-crm.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactsCrmPage implements OnInit {
    private readonly contactsApi = inject(ContactsCrmApiService);
    private readonly clientsApi = inject(ClientsApiService);
    private readonly usersApi = inject(UsersApiService);
    private readonly messageService = inject(MessageService);
    private readonly confirmationService = inject(ConfirmationService);

    // Signals
    items = signal<ContactCrm[]>([]);
    query = signal<string>('');
    clientFilter = signal<string>('');
    showDialog = signal<boolean>(false);
    showDetailsDialog = signal<boolean>(false);
    editing = signal<Partial<ContactCrm> | null>(null);
    viewingContact = signal<ContactCrm | null>(null);
    expandedRows = signal<Set<string>>(new Set());

    // Selectores
    clients = signal<ClientOption[]>([]);
    users = signal<UserOption[]>([]);

    ngOnInit() {
        this.load();
        this.loadClients();
        this.loadUsers();
    }

    constructor() {
        effect(() => {
            if (!this.showDialog()) {
                this.editing.set(null);
            }
        });

        effect(() => {
            if (!this.showDetailsDialog()) {
                this.viewingContact.set(null);
            }
        });
    }

    load() {
        const params: {
            search?: string;
            clientId?: string;
        } = {};
        if (this.query()) params.search = this.query();
        if (this.clientFilter()) params.clientId = this.clientFilter();

        this.contactsApi.list(params).subscribe({
            next: (contacts) => this.items.set(contacts),
            error: (error) => {
                console.error('Error loading contacts:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar los contactos',
                });
            },
        });
    }

    loadClients() {
        this.clientsApi.list().subscribe({
            next: (clients) => this.clients.set(clients),
            error: () => this.clients.set([]),
        });
    }

    loadUsers() {
        this.usersApi.list().subscribe({
            next: (users) => this.users.set(users),
            error: () => this.users.set([]),
        });
    }

    setQuery(value: string) {
        this.query.set(value);
        this.load();
    }

    setClientFilter(value: string) {
        this.clientFilter.set(value);
        this.load();
    }

    clearFilters() {
        this.query.set('');
        this.clientFilter.set('');
        this.load();
    }

    newItem() {
        this.editing.set({
            name: '',
            email: '',
            clientId: '',
            isPrimary: false,
        });
        this.showDialog.set(true);
    }

    editItem(item: ContactCrm) {
        this.editing.set({ ...item });
        this.showDialog.set(true);
    }

    viewDetails(item: ContactCrm) {
        this.viewingContact.set(item);
        this.showDetailsDialog.set(true);
    }

    closeDialog() {
        this.showDialog.set(false);
    }

    closeDetails() {
        this.showDetailsDialog.set(false);
    }

    onEditChange<K extends keyof ContactCrm>(key: K, value: ContactCrm[K]) {
        const cur = this.editing();
        if (!cur) return;
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

        const payload: CreateContactCrmRequest | UpdateContactCrmRequest = {
            name: item.name!,
            email: item.email!,
            phone: item.phone,
            mobile: item.mobile,
            position: item.position,
            department: item.department,
            clientId: item.clientId!,
            isPrimary: item.isPrimary || false,
            notes: item.notes,
            assignedTo: item.assignedTo,
        };

        const req = item._id
            ? this.contactsApi.update(item._id, payload)
            : this.contactsApi.create(payload);

        req.subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: item._id
                        ? 'Contacto actualizado correctamente'
                        : 'Contacto creado correctamente',
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

    remove(item: ContactCrm) {
        if (!item._id) return;

        this.confirmationService.confirm({
            message: `¿Estás seguro de que quieres eliminar el contacto "${item.name}"?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            accept: () => {
                this.contactsApi.delete(item._id!).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Éxito',
                            detail: 'Contacto eliminado correctamente',
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

    getClientName(id: string): string {
        const client = this.clients().find((c) => c._id === id);
        return client ? client.name : id;
    }

    getClientFilterOptions() {
        return [{ label: 'Todos', value: '' }, ...this.clients().map(c => ({ label: c.name, value: c._id }))];
    }

    getUserName(id: string): string {
        const user = this.users().find((u) => u._id === id);
        return user ? user.name : id;
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

    private validateForm(item: Partial<ContactCrm>): string[] {
        const errors: string[] = [];

        if (!item.name || item.name.trim() === '') {
            errors.push('El nombre del contacto es requerido');
        }

        if (!item.email || item.email.trim() === '') {
            errors.push('El email del contacto es requerido');
        } else if (!this.isValidEmail(item.email)) {
            errors.push('El email del contacto no tiene un formato válido');
        }

        if (!item.clientId || item.clientId.trim() === '') {
            errors.push('Debe seleccionar un cliente');
        }

        return errors;
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    private getErrorMessage(error: unknown): string {
        if (error && typeof error === 'object' && 'error' in error) {
            const httpError = error as { error?: { message?: string; error?: string }; message?: string };
            if (httpError.error?.message) {
                return String(httpError.error.message);
            }
            if (httpError.error?.error) {
                return String(httpError.error.error);
            }
        }
        if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
            return error.message;
        }
        return 'Ha ocurrido un error inesperado';
    }
}

