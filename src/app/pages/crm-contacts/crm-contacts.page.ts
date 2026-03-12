import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ContactsCrmApiService } from '../../shared/services/contacts-crm-api.service';
import { ContactCrm, CreateContactCrmRequest } from '../../shared/interfaces/contact-crm.interface';
import { Router } from '@angular/router';

@Component({
  selector: 'app-crm-contacts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    DialogModule,
    TableModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './crm-contacts.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrmContactsPage implements OnInit {
  private readonly contactsApi = inject(ContactsCrmApiService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  contacts = signal<ContactCrm[]>([]);
  loading = signal<boolean>(false);

  // Estado del formulario ultra simple
  showDialog = signal<boolean>(false);
  formName = '';
  formPhone = '';

  ngOnInit(): void {
    this.loadContacts();
  }

  loadContacts(): void {
    this.loading.set(true);
    this.contactsApi.list().subscribe({
      next: (items) => {
        this.contacts.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading CRM contacts', error);
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los contactos',
        });
      },
    });
  }

  openCreateDialog(): void {
    // Formulario vacío, sin campos obligatorios
    this.formName = '';
    this.formPhone = '';
    this.showDialog.set(true);
  }

  closeDialog(): void {
    this.showDialog.set(false);
  }

  save(): void {
    const payload: Partial<CreateContactCrmRequest> = {
      name: this.formName || undefined,
      phone: this.formPhone || undefined,
    };

    this.contactsApi.create(payload as CreateContactCrmRequest).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Guardado',
          detail: 'Contacto creado correctamente',
        });
        this.showDialog.set(false);
        this.loadContacts();
      },
      error: (error) => {
        console.error('Error creating CRM contact', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo crear el contacto',
        });
      },
    });
  }

  goToDetail(contact: ContactCrm): void {
    if (!contact._id) return;
    this.router.navigate(['/leads', contact._id]);
  }
}
