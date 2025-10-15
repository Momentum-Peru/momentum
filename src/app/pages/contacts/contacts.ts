import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ActivatedRoute } from '@angular/router';
import { ContactService } from '../../shared/services/contact.service';
import { ContactsListComponent } from '../../components/contacts-list/contacts-list';
import { ContactFormComponent } from '../../components/contact-form/contact-form';
import { GoogleContactsOAuthComponent } from '../../components/google-contacts-oauth/google-contacts-oauth';
import { Contact, CreateContactRequest, UpdateContactRequest, ContactsSearchParams } from '../../shared/interfaces/contact.interface';
import { AuthService } from '../../pages/login/services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-contacts',
    standalone: true,
    imports: [
        CommonModule,
        Button,
        Toast,
        ContactsListComponent,
        ContactFormComponent,
        GoogleContactsOAuthComponent
    ],
    templateUrl: './contacts.html',
    styleUrl: './contacts.scss'
})
export class ContactsComponent implements OnInit {
    private contactService = inject(ContactService);
    private messageService = inject(MessageService);
    private route = inject(ActivatedRoute);
    private authService = inject(AuthService);

    // Estados principales
    contacts = signal<Contact[]>([]);
    isLoading = signal(false);
    showForm = signal(false);
    showOAuth = signal(false);

    // Estados del formulario
    editingContact = signal<Contact | null>(null);
    isEditing = signal(false);
    isSubmitting = signal(false);

    // Estados de filtros y búsqueda
    searchTerm = signal<string>('');
    currentFilters = signal<ContactsSearchParams>({});

    ngOnInit(): void {
        this.loadContacts();
        this.handleQueryParams();
    }

    /**
     * Maneja los parámetros de consulta de la URL
     */
    private handleQueryParams(): void {
        this.route.queryParams.subscribe(params => {
            if (params['success'] === 'true') {
                const provider = params['provider'] || 'google_contacts';
                this.messageService.add({
                    severity: 'success',
                    summary: 'Conexión Exitosa',
                    detail: `Cuenta de ${provider} conectada exitosamente`
                });
                this.loadContacts(); // Recargar la lista

                // Mostrar el componente OAuth para actualizar el estado
                this.showOAuth.set(true);
            } else if (params['error'] === 'true') {
                const message = decodeURIComponent(params['message'] || 'Error desconocido');
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error de Conexión',
                    detail: message
                });
            }
        });
    }

    /**
     * Carga los contactos del usuario
     */
    async loadContacts(): Promise<void> {
        this.isLoading.set(true);

        try {
            const filters = this.currentFilters();
            const response = await firstValueFrom(this.contactService.getContacts(filters));
            this.contacts.set(response.contacts);
        } catch (error: any) {
            console.error('Error cargando contactos:', error);

            let errorMessage = 'Error al cargar los contactos';
            if (error.status === 401) {
                errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente';
            }

            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: errorMessage
            });
        } finally {
            this.isLoading.set(false);
        }
    }

    /**
     * Muestra el formulario para crear un nuevo contacto
     */
    showCreateForm(): void {
        this.editingContact.set(null);
        this.isEditing.set(false);
        this.showForm.set(true);
        this.showOAuth.set(false);
    }

    /**
     * Muestra el formulario para editar un contacto existente
     */
    editContact(contact: Contact): void {
        this.editingContact.set(contact);
        this.isEditing.set(true);
        this.showForm.set(true);
        this.showOAuth.set(false);
    }

    /**
     * Muestra los botones OAuth2
     */
    showOAuthButtons(): void {
        this.showOAuth.set(true);
        this.showForm.set(false);
    }

    /**
     * Cancela la operación actual
     */
    cancelOperation(): void {
        this.showForm.set(false);
        this.showOAuth.set(false);
        this.editingContact.set(null);
        this.isEditing.set(false);
    }

    /**
     * Maneja el envío del formulario
     */
    async handleFormSubmit(contactData: CreateContactRequest | UpdateContactRequest): Promise<void> {
        this.isSubmitting.set(true);

        try {
            // Obtener el usuario actual
            const currentUser = this.authService.getCurrentUser();
            if (!currentUser) {
                throw new Error('Usuario no autenticado');
            }

            if (this.isEditing()) {
                // Actualizar contacto existente
                const contact = this.editingContact();
                if (contact) {
                    await firstValueFrom(
                        this.contactService.updateContact(contact._id, contactData as UpdateContactRequest)
                    );

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Actualizado',
                        detail: 'Contacto actualizado exitosamente'
                    });
                }
            } else {
                // Crear nuevo contacto
                const createData = {
                    ...contactData as CreateContactRequest,
                    userId: currentUser.id
                } as CreateContactRequest;

                await firstValueFrom(
                    this.contactService.createContact(createData)
                );

                this.messageService.add({
                    severity: 'success',
                    summary: 'Creado',
                    detail: 'Contacto creado exitosamente'
                });
            }

            this.cancelOperation();
            await this.loadContacts();
        } catch (error: any) {
            console.error('Error guardando contacto:', error);

            let errorMessage = 'Error al guardar el contacto';
            if (error.status === 401) {
                errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente';
            } else if (error.status === 400) {
                errorMessage = 'Datos inválidos. Verifica la información ingresada';
            }

            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: errorMessage
            });
        } finally {
            this.isSubmitting.set(false);
        }
    }

    /**
     * Maneja la eliminación de un contacto
     */
    async handleContactDelete(contactId: string): Promise<void> {
        await this.loadContacts();
    }

    /**
     * Maneja la búsqueda
     */
    onSearch(searchTerm: string): void {
        this.searchTerm.set(searchTerm);
        this.currentFilters.set({
            ...this.currentFilters(),
            search: searchTerm || undefined
        });
        this.loadContacts();
    }

    /**
     * Maneja el cambio de filtros
     */
    onFilterChange(filters: { source?: 'local' | 'google_contacts'; isActive?: boolean }): void {
        this.currentFilters.set({
            ...this.currentFilters(),
            ...filters
        });
        this.loadContacts();
    }

    /**
     * Maneja el éxito de OAuth2
     */
    onOAuthSuccess(message: string): void {
        this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: message
        });

        this.showOAuth.set(false);
        this.loadContacts();

        // Recargar el componente OAuth para actualizar el estado
        setTimeout(() => {
            this.showOAuth.set(true);
        }, 100);
    }

    /**
     * Maneja errores de OAuth2
     */
    onOAuthError(message: string): void {
        this.messageService.add({
            severity: 'error',
            summary: 'Error de Conexión',
            detail: message
        });
    }

    /**
     * Refresca la lista de contactos
     */
    refreshContacts(): void {
        this.loadContacts();
    }
}
