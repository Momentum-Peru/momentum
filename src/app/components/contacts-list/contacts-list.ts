import { Component, signal, inject, OnInit, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { InputText } from 'primeng/inputtext';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ContactService } from '../../shared/services/contact.service';
import { Contact } from '../../shared/interfaces/contact.interface';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-contacts-list',
    standalone: true,
    imports: [CommonModule, FormsModule, Button, Tag, InputText, ConfirmDialog],
    templateUrl: './contacts-list.html',
    styleUrl: './contacts-list.scss'
})
export class ContactsListComponent implements OnInit {
    private contactService = inject(ContactService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    // Inputs y outputs
    contacts = input.required<Contact[]>();
    isLoading = input<boolean>(false);

    // Outputs para eventos
    edit = output<Contact>();
    deleteContact = output<string>();
    refresh = output<void>();
    searchChange = output<string>();
    filterChange = output<{ source?: 'local' | 'google_contacts'; isActive?: boolean }>();

    // Estados locales
    deletingContactId = signal<string | null>(null);
    searchTerm = signal<string>('');
    selectedSource = signal<string>('all');
    selectedStatus = signal<string>('all');

    // Opciones para filtros
    sourceOptions = [
        { label: 'Todos', value: 'all' },
        { label: 'Locales', value: 'local' },
        { label: 'Google Contacts', value: 'google_contacts' }
    ];

    statusOptions = [
        { label: 'Todos', value: 'all' },
        { label: 'Activos', value: 'true' },
        { label: 'Inactivos', value: 'false' }
    ];

    ngOnInit(): void {
        console.log('ContactsListComponent initialized');
        console.log('Contacts received:', this.contacts());
        console.log('Is loading:', this.isLoading());
    }

    /**
     * Obtiene el icono según la fuente del contacto
     */
    getSourceIcon(source: string): string {
        switch (source) {
            case 'google_contacts':
                return 'pi pi-google';
            case 'local':
                return 'pi pi-user';
            default:
                return 'pi pi-user';
        }
    }

    /**
     * Obtiene el color del tag según la fuente
     */
    getSourceSeverity(source: string): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" | null | undefined {
        switch (source) {
            case 'google_contacts':
                return 'info';
            case 'local':
                return 'success';
            default:
                return 'secondary';
        }
    }

    /**
     * Obtiene el texto de la fuente en español
     */
    getSourceText(source: string): string {
        switch (source) {
            case 'google_contacts':
                return 'Google Contacts';
            case 'local':
                return 'Local';
            default:
                return source;
        }
    }

    /**
     * Obtiene el color del tag según el estado
     */
    getStatusSeverity(isActive: boolean): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" | null | undefined {
        return isActive ? 'success' : 'secondary';
    }

    /**
     * Obtiene el texto del estado en español
     */
    getStatusText(isActive: boolean): string {
        return isActive ? 'Activo' : 'Inactivo';
    }

    /**
     * Verifica si un contacto es de Google Contacts
     */
    isGoogleContact(contact: Contact): boolean {
        return contact.source === 'google_contacts';
    }

    /**
     * Maneja la edición de un contacto
     */
    editContact(contact: Contact): void {
        this.edit.emit(contact);
    }

    /**
     * Confirma la eliminación de un contacto
     */
    confirmDelete(contact: Contact): void {
        this.confirmationService.confirm({
            message: `¿Estás seguro de que quieres eliminar el contacto "${contact.name}"?`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Eliminar',
            rejectLabel: 'Cancelar',
            accept: () => {
                this.deleteContact(contact._id);
            }
        });
    }

    /**
     * Elimina un contacto
     */
    private async deleteContact(contactId: string): Promise<void> {
        this.deletingContactId.set(contactId);

        try {
            await firstValueFrom(this.contactService.deleteContact(contactId));

            this.messageService.add({
                severity: 'success',
                summary: 'Eliminado',
                detail: 'Contacto eliminado exitosamente'
            });

            // Cerrar el modal de confirmación
            this.confirmationService.close();

            this.deleteContact.emit(contactId);
        } catch (error: unknown) {
            console.error('Error eliminando contacto:', error);

            let errorMessage = 'Error al eliminar el contacto';
            if (error && typeof error === 'object' && 'status' in error) {
                const httpError = error as { status: number };
                if (httpError.status === 401) {
                    errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente';
                } else if (httpError.status === 404) {
                    errorMessage = 'El contacto no fue encontrado';
                }
            }

            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: errorMessage
            });
        } finally {
            this.deletingContactId.set(null);
        }
    }

    /**
     * Refresca la lista de contactos
     */
    refreshContacts(): void {
        this.refresh.emit();
    }

    /**
     * Maneja la búsqueda
     */
    onSearchChange(): void {
        this.searchChange.emit(this.searchTerm());
    }

    /**
     * Maneja el cambio de filtros
     */
    onFilterSourceChange(): void {
        this.filterChange.emit({
            source: this.selectedSource() === 'all' ? undefined : (this.selectedSource() as 'local' | 'google_contacts'),
            isActive: this.selectedStatus() === 'all' ? undefined : this.selectedStatus() === 'true'
        });
    }

    /**
     * Maneja el cambio de estado
     */
    onFilterStatusChange(): void {
        this.filterChange.emit({
            source: this.selectedSource() === 'all' ? undefined : (this.selectedSource() as 'local' | 'google_contacts'),
            isActive: this.selectedStatus() === 'all' ? undefined : this.selectedStatus() === 'true'
        });
    }

    /**
     * Limpia los filtros
     */
    clearFilters(): void {
        this.searchTerm.set('');
        this.selectedSource.set('all');
        this.selectedStatus.set('all');
        this.searchChange.emit('');
        this.filterChange.emit({});
    }

    /**
     * Formatea la fecha para mostrar
     */
    formatDate(date: Date | string): string {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}
