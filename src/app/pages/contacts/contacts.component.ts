import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import {
    ContactsService,
    Contact,
    CreateContactPayload,
    ContactSource,
} from '../../shared/services/contacts.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-contacts',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        SelectModule,
        DialogModule,
        TooltipModule,
    ],
    templateUrl: './contacts.html',
})
export class ContactsComponent implements OnInit {
    private contactsService = inject(ContactsService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    private router = inject(Router);

    contacts = signal<Contact[]>([]);
    loading = signal(true);
    saving = signal(false);
    searchTerm = '';

    // Dialog State
    showDialog = false;
    editingContact = signal<Contact | null>(null);

    form: CreateContactPayload = {
        name: '',
        email: '',
        phone: '',
        company: '',
        role: '',
        source: 'OTHER',
    };

    readonly contactSourceOptions: { label: string; value: ContactSource }[] = [
        { label: 'Referido', value: 'REFERRAL' },
        { label: 'Redes sociales', value: 'SOCIAL_MEDIA' },
        { label: 'Otros', value: 'OTHER' },
    ];

    ngOnInit() {
        this.loadContacts();
    }

    loadContacts() {
        this.loading.set(true);
        this.contactsService.findAll(this.searchTerm).subscribe({
            next: (data) => {
                this.contacts.set(data);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    onSearch(term: string) {
        this.searchTerm = term;
        // Debounce properly in a real app, simplified here
        this.loadContacts();
    }

    openCreateDialog() {
        this.editingContact.set(null);
        this.form = { name: '', email: '', phone: '', company: '', role: '' };
        this.showDialog = true;
    }

    openEditDialog(contact: Contact) {
        this.editingContact.set(contact);
        this.form = {
            name: contact.name,
            email: contact.email || '',
            phone: contact.phone || '',
            company: contact.company || '',
            role: contact.role || '',
            source: contact.source || 'OTHER',
        };
        this.showDialog = true;
    }

    closeDialog() {
        this.showDialog = false;
    }

    saveContact() {
        if (!this.form.name?.trim()) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'El nombre es obligatorio' });
            return;
        }
        if (!this.form.source) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Indique de dónde viene el contacto',
            });
            return;
        }

        this.saving.set(true);

        const request = this.editingContact()
            ? this.contactsService.update(this.editingContact()!._id, this.form)
            : this.contactsService.create(this.form);

        request.subscribe({
            next: (saved) => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Contacto guardado correctamente' });
                this.loadContacts();
                this.closeDialog();
                this.saving.set(false);
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el contacto' });
                this.saving.set(false);
            }
        });
    }

    deleteContact(contact: Contact) {
        this.confirmationService.confirm({
            message: `¿Estás seguro de eliminar a ${contact.name}?`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.contactsService.delete(contact._id).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Contacto eliminado' });
                        this.loadContacts();
                    },
                    error: () => {
                        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
                    }
                });
            }
        });
    }

    openWhatsApp(contact: Contact) {
        if (!contact.phone) return;
        const phone = contact.phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${phone}`, '_blank');
    }

    getContactSourceLabel(value: ContactSource | undefined): string {
        if (!value) return '';
        const opt = this.contactSourceOptions.find((o) => o.value === value);
        return opt?.label ?? value;
    }

    openAgendaModal(contact: Contact) {
        // Navigate to Agenda and potentially pass state (requires Agenda to handle queryParams or State)
        // For now, simple navigation. To fully implement "Pre-select", we'd need to update Agenda to read query params.
        this.router.navigate(['/agenda'], { queryParams: { createForContact: contact._id, contactName: contact.name } });
    }
}
