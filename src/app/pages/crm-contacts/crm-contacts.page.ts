import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ContactsCrmApiService } from '../../shared/services/contacts-crm-api.service';
import { CrmCompaniesApiService } from '../../shared/services/crm-companies-api.service';
import {
  ContactCrm,
  ContactSource,
  CreateContactCrmRequest,
} from '../../shared/interfaces/contact-crm.interface';
import { CompanyOption } from '../../shared/interfaces/company.interface';
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
    CardModule,
    IconFieldModule,
    InputIconModule,
    TooltipModule,
    SelectModule,
    TagModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './crm-contacts.page.html',
  styleUrls: ['./crm-contacts.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrmContactsPage implements OnInit, OnDestroy {
  private readonly contactsApi = inject(ContactsCrmApiService);
  private readonly crmCompaniesApi = inject(CrmCompaniesApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);

  contacts = signal<ContactCrm[]>([]);
  companies = signal<CompanyOption[]>([]);
  loading = signal<boolean>(false);

  /** Texto de búsqueda (nombre, teléfono o correo); se envía al API tras debounce. */
  searchTerm = signal('');

  /** Índice del primer registro en la página actual (para numerar filas con paginación). */
  tableFirst = signal(0);

  private searchDebounceId: ReturnType<typeof setTimeout> | null = null;

  // Estado del formulario de alta de contacto
  showDialog = signal<boolean>(false);
  formFirstName = '';
  formLastName = '';
  formPhone = '';
  formEmail = '';
  formSource: ContactSource | '' = '';

  readonly sourceOptions: { label: string; value: ContactSource }[] = [
    { label: 'Referido', value: 'REFERRAL' },
    { label: 'Redes sociales', value: 'SOCIAL_MEDIA' },
    { label: 'Otros', value: 'OTHER' },
  ];

  ngOnInit(): void {
    this.loadContacts();
    this.crmCompaniesApi.listActiveAsOptions().subscribe({
      next: (c) => this.companies.set(c),
      error: () => this.companies.set([]),
    });
  }

  getCompanyName(clientId?: string): string {
    if (!clientId) return 'Sin empresa';
    return this.companies().find((c) => c._id === clientId)?.name ?? 'Sin empresa';
  }

  ngOnDestroy(): void {
    if (this.searchDebounceId != null) {
      clearTimeout(this.searchDebounceId);
    }
  }

  onSearchChange(raw: string): void {
    this.searchTerm.set(raw);
    if (this.searchDebounceId != null) {
      clearTimeout(this.searchDebounceId);
    }
    this.searchDebounceId = setTimeout(() => {
      this.searchDebounceId = null;
      this.loadContacts();
    }, 350);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    if (this.searchDebounceId != null) {
      clearTimeout(this.searchDebounceId);
      this.searchDebounceId = null;
    }
    this.tableFirst.set(0);
    this.loadContacts();
  }

  onTablePage(event: { first?: number }): void {
    this.tableFirst.set(event.first ?? 0);
  }

  loadContacts(): void {
    this.loading.set(true);
    const q = this.searchTerm().trim();
    this.contactsApi.list(q ? { search: q } : undefined).subscribe({
      next: (items) => {
        this.contacts.set(items);
        this.tableFirst.set(0);
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
    this.formFirstName = '';
    this.formLastName = '';
    this.formPhone = '';
    this.formEmail = '';
    this.formSource = '';
    this.showDialog.set(true);
  }

  closeDialog(): void {
    this.showDialog.set(false);
  }

  save(): void {
    const first = this.formFirstName.trim();
    if (!first) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail: 'Los nombres del contacto son obligatorios.',
      });
      return;
    }

    const last = this.formLastName.trim();
    const fullName = [first, last].filter(Boolean).join(' ').trim();

    if (fullName.length < 2) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail: 'El nombre debe tener al menos 2 caracteres.',
      });
      return;
    }

    const email = this.formEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Correo inválido',
        detail: 'Ingrese un correo válido o déjelo vacío.',
      });
      return;
    }

    const phone = this.formPhone.trim();
    if (phone && (phone.length < 5 || phone.length > 20)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Teléfono',
        detail: 'Si ingresa teléfono, debe tener entre 5 y 20 caracteres.',
      });
      return;
    }

    const payload: Partial<CreateContactCrmRequest> = {
      name: fullName,
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      ...(this.formSource ? { source: this.formSource } : { source: 'OTHER' }),
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

  confirmDelete(contact: ContactCrm, event: Event): void {
    event.stopPropagation();
    const id = contact._id;
    if (!id) return;
    const name = contact.name?.trim() || 'este contacto';
    this.confirmationService.confirm({
      message: `¿Eliminar a <strong>${name}</strong>? Se borrarán también <strong>todos sus seguimientos</strong>. No se puede deshacer.`,
      header: 'Eliminar contacto',
      icon: 'pi pi-trash',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.contactsApi.delete(id).subscribe({
          next: (res) => {
            const n = res.followUpsRemoved ?? 0;
            this.messageService.add({
              severity: 'success',
              summary: 'Eliminado',
              detail:
                n > 0
                  ? `Contacto eliminado (${n} seguimiento(s) borrados).`
                  : 'Contacto eliminado.',
            });
            this.loadContacts();
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: err?.error?.message || 'No se pudo eliminar el contacto',
            });
          },
        });
      },
    });
  }

  lastFollowUpTypeLabel(type?: string): string {
    const map: Record<string, string> = {
      CALL: 'Llamada',
      EMAIL: 'Email',
      MEETING: 'Reunión',
      NOTE: 'Nota',
      PROPOSAL: 'Propuesta',
      OTHER: 'Otro',
    };
    return type ? (map[type] ?? type) : '';
  }

  lastFollowUpStatusLabel(status?: string): string {
    const map: Record<string, string> = {
      SCHEDULED: 'Programado',
      COMPLETED: 'Hecho',
      CANCELLED: 'Cancelado',
    };
    return status ? (map[status] ?? status) : '';
  }

  lastFollowUpStatusClass(status?: string): string {
    if (status === 'COMPLETED') {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
    }
    if (status === 'SCHEDULED') {
      return 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200';
    }
    if (status === 'CANCELLED') {
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
    }
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  }

  sourceLabel(source?: ContactSource): string {
    const map: Record<string, string> = {
      REFERRAL: 'Referido',
      SOCIAL_MEDIA: 'Redes',
      OTHER: 'Otros',
    };
    return source ? (map[source] ?? source) : '—';
  }

  sourceSeverity(source?: ContactSource): 'success' | 'info' | 'secondary' {
    if (source === 'REFERRAL') return 'success';
    if (source === 'SOCIAL_MEDIA') return 'info';
    return 'secondary';
  }
}
