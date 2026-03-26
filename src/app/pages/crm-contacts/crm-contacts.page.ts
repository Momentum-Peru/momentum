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
import { CardModule } from 'primeng/card';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ContactsCrmApiService } from '../../shared/services/contacts-crm-api.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import {
  ContactCrm,
  ContactSource,
  CreateContactCrmRequest,
} from '../../shared/interfaces/contact-crm.interface';
import { UserOption } from '../../shared/interfaces/menu-permission.interface';
import { Router } from '@angular/router';
import { ErpNotifyService } from '../../core/services/erp-notify.service';

type FollowUpStatusFilter = '' | 'NONE' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

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
    CardModule,
    IconFieldModule,
    InputIconModule,
    TooltipModule,
    SelectModule,
    TagModule,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './crm-contacts.page.html',
  styleUrls: ['./crm-contacts.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrmContactsPage implements OnInit, OnDestroy {
  private readonly contactsApi = inject(ContactsCrmApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly erpNotify = inject(ErpNotifyService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);

  contacts = signal<ContactCrm[]>([]);
  users = signal<UserOption[]>([]);
  loading = signal<boolean>(false);

  filterName = signal('');
  filterPhone = signal('');
  filterFollowUpStatus = signal<FollowUpStatusFilter>('');

  /** Índice del primer registro en la página actual (para numerar filas con paginación). */
  tableFirst = signal(0);

  private filterDebounceId: ReturnType<typeof setTimeout> | null = null;

  readonly followUpStatusOptions: { label: string; value: FollowUpStatusFilter }[] = [
    { label: 'Todos los estados', value: '' },
    { label: 'Sin seguimiento', value: 'NONE' },
    { label: 'Programado', value: 'SCHEDULED' },
    { label: 'Hecho', value: 'COMPLETED' },
    { label: 'Cancelado', value: 'CANCELLED' },
  ];

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
    this.loadUsers();
    this.loadContacts();
  }

  private loadUsers(): void {
    this.usersApi.list().subscribe({
      next: (u) => this.users.set(u),
      error: () => this.users.set([]),
    });
  }

  ngOnDestroy(): void {
    if (this.filterDebounceId != null) {
      clearTimeout(this.filterDebounceId);
    }
  }

  hasActiveFilters(): boolean {
    return (
      this.filterName().trim().length > 0 ||
      this.filterPhone().trim().length > 0 ||
      this.filterFollowUpStatus() !== ''
    );
  }

  onFilterNameChange(raw: string): void {
    this.filterName.set(raw);
    this.scheduleLoadContacts();
  }

  onFilterPhoneChange(raw: string): void {
    this.filterPhone.set(raw);
    this.scheduleLoadContacts();
  }

  onFilterStatusChange(value: FollowUpStatusFilter | null): void {
    this.filterFollowUpStatus.set((value ?? '') as FollowUpStatusFilter);
    this.scheduleLoadContacts();
  }

  private scheduleLoadContacts(): void {
    if (this.filterDebounceId != null) {
      clearTimeout(this.filterDebounceId);
    }
    this.filterDebounceId = setTimeout(() => {
      this.filterDebounceId = null;
      this.tableFirst.set(0);
      this.loadContacts();
    }, 350);
  }

  clearFilters(): void {
    this.filterName.set('');
    this.filterPhone.set('');
    this.filterFollowUpStatus.set('');
    if (this.filterDebounceId != null) {
      clearTimeout(this.filterDebounceId);
      this.filterDebounceId = null;
    }
    this.tableFirst.set(0);
    this.loadContacts();
  }

  onTablePage(event: { first?: number }): void {
    this.tableFirst.set(event.first ?? 0);
  }

  loadContacts(): void {
    this.loading.set(true);
    const name = this.filterName().trim();
    const phone = this.filterPhone().trim();
    const followUpStatus = this.filterFollowUpStatus();

    const params =
      name || phone || followUpStatus
        ? {
            ...(name ? { name } : {}),
            ...(phone ? { phone } : {}),
            ...(followUpStatus ? { followUpStatus } : {}),
          }
        : undefined;

    this.contactsApi.list(params).subscribe({
      next: (items) => {
        this.contacts.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading CRM contacts', error);
        this.loading.set(false);
        this.erpNotify.error('Error', 'No se pudieron cargar los contactos');
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
      this.erpNotify.warn('Datos incompletos', 'Los nombres del contacto son obligatorios.');
      return;
    }

    const last = this.formLastName.trim();
    const fullName = [first, last].filter(Boolean).join(' ').trim();

    if (fullName.length < 2) {
      this.erpNotify.warn('Datos incompletos', 'El nombre debe tener al menos 2 caracteres.');
      return;
    }

    const email = this.formEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      this.erpNotify.warn('Correo inválido', 'Ingrese un correo válido o déjelo vacío.');
      return;
    }

    const phone = this.formPhone.trim();
    if (phone && (phone.length < 5 || phone.length > 20)) {
      this.erpNotify.warn('Teléfono', 'Si ingresa teléfono, debe tener entre 5 y 20 caracteres.');
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
        this.erpNotify.crmContactCreated(fullName);
        this.showDialog.set(false);
        this.loadContacts();
      },
      error: (error) => {
        console.error('Error creating CRM contact', error);
        this.erpNotify.error('Error', 'No se pudo crear el contacto');
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
            this.erpNotify.success(
              'Eliminado',
              n > 0
                ? `Contacto eliminado (${n} seguimiento(s) borrados).`
                : 'Contacto eliminado.',
            );
            this.loadContacts();
          },
          error: (err) => {
            this.erpNotify.error(
              'Error',
              (err as { error?: { message?: string } })?.error?.message || 'No se pudo eliminar el contacto',
            );
          },
        });
      },
    });
  }

  /** Iniciales en recuadro: dos letras si hay nombre y apellido implícito, si no una. */
  contactInitials(name?: string): string {
    const n = (name ?? '').trim();
    if (!n) return '?';
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0].charAt(0);
      const b = parts[1].charAt(0);
      return (a + b).toUpperCase();
    }
    return n.charAt(0).toUpperCase();
  }

  /** Texto relativo corto para la fecha del último seguimiento. */
  relativeFollowUpLabel(iso?: string): string {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '';
    const diff = Date.now() - t;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Hace un momento';
    if (m < 60) return `Hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `Hace ${h} h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `Hace ${d} d`;
    const w = Math.floor(d / 7);
    if (w < 8) return `Hace ${w} sem.`;
    return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
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

  getUserName(userId?: string): string {
    if (!userId) return 'Sin asignar';
    return this.users().find((u) => u._id === userId)?.name ?? '—';
  }
}
