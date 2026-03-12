import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import { ContactsCrmApiService } from '../../shared/services/contacts-crm-api.service';
import { ContactCrm, UpdateContactCrmRequest } from '../../shared/interfaces/contact-crm.interface';
import { FollowUpsApiService } from '../../shared/services/follow-ups-api.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import { UserOption } from '../../shared/interfaces/menu-permission.interface';
import {
  FollowUp,
  FollowUpType,
  FollowUpStatus,
  CreateFollowUpRequest,
  UpdateFollowUpRequest,
} from '../../shared/interfaces/follow-up.interface';

@Component({
  selector: 'app-crm-contact-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonModule,
    CardModule,
    TagModule,
    TableModule,
    ToastModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
  ],
  providers: [MessageService],
  templateUrl: './crm-contact-detail.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrmContactDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly contactsApi = inject(ContactsCrmApiService);
  private readonly followUpsApi = inject(FollowUpsApiService);
  private readonly messageService = inject(MessageService);
  private readonly usersApi = inject(UsersApiService);

  contact = signal<ContactCrm | null>(null);
  followUps = signal<FollowUp[]>([]);
  loadingContact = signal<boolean>(false);
  loadingFollowUps = signal<boolean>(false);
  showEditContactDialog = signal<boolean>(false);
  showEditFollowUpDialog = signal<boolean>(false);
  editingContact = signal<Partial<ContactCrm> | null>(null);
  editingFollowUp = signal<Partial<FollowUp> | null>(null);
  users = signal<UserOption[]>([]);

  readonly contactId = computed(() => this.contact()?._id || '');

  typeOptions: { label: string; value: FollowUpType }[] = [
    { label: 'Llamada', value: 'CALL' },
    { label: 'Email', value: 'EMAIL' },
    { label: 'Reunión', value: 'MEETING' },
    { label: 'Nota', value: 'NOTE' },
    { label: 'Propuesta', value: 'PROPOSAL' },
    { label: 'Otro', value: 'OTHER' },
  ];

  statusOptions: { label: string; value: FollowUpStatus }[] = [
    { label: 'Programado', value: 'SCHEDULED' },
    { label: 'Completado', value: 'COMPLETED' },
    { label: 'Cancelado', value: 'CANCELLED' },
  ];

  private cachedEditScheduledDate: Date | null = null;
  private cachedEditScheduledDateString: string | null = null;
  private cachedEditNextFollowUpDate: Date | null = null;
  private cachedEditNextFollowUpDateString: string | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Contacto no encontrado',
      });
      this.router.navigate(['/leads']);
      return;
    }
    this.loadContact(id);
    this.loadUsers();
  }

  private loadContact(id: string): void {
    this.loadingContact.set(true);
    this.contactsApi.getById(id).subscribe({
      next: (contact) => {
        this.contact.set(contact);
        this.loadingContact.set(false);
        this.loadFollowUpsForContact(contact);
      },
      error: (error) => {
        console.error('Error loading CRM contact', error);
        this.loadingContact.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el contacto',
        });
        this.router.navigate(['/leads']);
      },
    });
  }

  private loadUsers(): void {
    this.usersApi.list().subscribe({
      next: (items) => this.users.set(items),
      error: () => this.users.set([]),
    });
  }

  private loadFollowUpsForContact(contact: ContactCrm): void {
    if (!contact._id) {
      this.followUps.set([]);
      return;
    }
    this.loadingFollowUps.set(true);
    this.followUpsApi.getByContact(contact._id).subscribe({
      next: (items) => {
        this.followUps.set(items || []);
        this.loadingFollowUps.set(false);
      },
      error: (error) => {
        console.error('Error loading follow-ups for contact client', error);
        this.loadingFollowUps.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los seguimientos del contacto',
        });
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/leads']);
  }

  openEditContact(): void {
    const current = this.contact();
    if (!current) return;
    this.editingContact.set({ ...current });
    this.showEditContactDialog.set(true);
  }

  saveContact(): void {
    const current = this.contact();
    const editing = this.editingContact();
    if (!current || !current._id || !editing) return;

    const payload: UpdateContactCrmRequest = {
      name: editing.name,
      email: editing.email,
      phone: editing.phone,
      mobile: editing.mobile,
      position: editing.position,
      department: editing.department,
      isPrimary: editing.isPrimary,
      notes: editing.notes,
      assignedTo: editing.assignedTo,
    };

    this.contactsApi.update(current._id, payload).subscribe({
      next: (updated) => {
        this.contact.set(updated);
        this.showEditContactDialog.set(false);
        this.editingContact.set(null);
        this.messageService.add({
          severity: 'success',
          summary: 'Contacto actualizado',
          detail: 'Se guardaron los cambios del contacto.',
        });
      },
      error: (error) => {
        console.error('Error updating CRM contact', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el contacto',
        });
      },
    });
  }

  openEditFollowUp(followUp: FollowUp): void {
    if (!followUp || !followUp._id) return;
    this.editingFollowUp.set({ ...followUp });
    this.showEditFollowUpDialog.set(true);
  }

  onEditFollowUpChange<K extends keyof FollowUp>(key: K, value: FollowUp[K] | undefined): void {
    const cur = this.editingFollowUp();
    if (!cur) return;
    if (cur[key] === value) return;
    this.editingFollowUp.set({ ...cur, [key]: value as FollowUp[K] });
  }

  onEditFollowUpDateChange(date: Date | null, key: 'scheduledDate' | 'nextFollowUpDate'): void {
    if (!date) {
      this.onEditFollowUpChange(key, undefined as unknown as string);
      return;
    }
    this.onEditFollowUpChange(key, date.toISOString() as unknown as string);
  }

  saveFollowUp(): void {
    const editing = this.editingFollowUp();
    const contact = this.contact();
    if (!editing || !editing._id) return;

    const payload: UpdateFollowUpRequest = {
      title: editing.title,
      description: editing.description,
      type: editing.type,
      status: editing.status,
      scheduledDate: editing.scheduledDate,
      leadId: editing.leadId,
      contactId: editing.contactId || contact?._id,
      clientId: editing.clientId,
      userId: editing.userId,
      attachments: editing.attachments,
      outcome: editing.outcome,
      nextFollowUpDate: editing.nextFollowUpDate,
    };

    this.followUpsApi.update(editing._id, payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Seguimiento actualizado',
          detail: 'Se guardaron los cambios del seguimiento.',
        });
        this.showEditFollowUpDialog.set(false);
        this.editingFollowUp.set(null);
        if (contact) {
          this.loadFollowUpsForContact(contact);
        }
      },
      error: (error) => {
        console.error('Error updating follow-up from contact detail', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el seguimiento',
        });
      },
    });
  }

  getEditScheduledDate(): Date | null {
    const dateString = this.editingFollowUp()?.scheduledDate;
    if (!dateString) {
      this.cachedEditScheduledDate = null;
      this.cachedEditScheduledDateString = null;
      return null;
    }
    if (this.cachedEditScheduledDateString !== dateString) {
      this.cachedEditScheduledDate = new Date(dateString);
      this.cachedEditScheduledDateString = dateString;
    }
    return this.cachedEditScheduledDate;
  }

  getEditNextFollowUpDate(): Date | null {
    const dateString = this.editingFollowUp()?.nextFollowUpDate;
    if (!dateString) {
      this.cachedEditNextFollowUpDate = null;
      this.cachedEditNextFollowUpDateString = null;
      return null;
    }
    if (this.cachedEditNextFollowUpDateString !== dateString) {
      this.cachedEditNextFollowUpDate = new Date(dateString);
      this.cachedEditNextFollowUpDateString = dateString;
    }
    return this.cachedEditNextFollowUpDate;
  }

  /**
   * Crea un seguimiento mínimo asociado directamente a este contacto CRM (contactId).
   * Todos los campos son opcionales en backend, así que solo asociamos contactId
   * y dejamos que el usuario complete luego desde el módulo de Seguimientos si lo desea.
   */
  createQuickFollowUp(): void {
    const contact = this.contact();
    if (!contact || !contact._id) {
      this.router.navigate(['/follow-ups']);
      return;
    }

    const payload: CreateFollowUpRequest = {
      contactId: contact._id,
      description: '',
    };

    this.followUpsApi.create(payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Seguimiento creado',
          detail: 'Se creó un seguimiento vacío asociado al contacto.',
        });
        this.loadFollowUpsForContact(contact);
      },
      error: (error) => {
        console.error('Error creating quick follow-up', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo crear el seguimiento',
        });
      },
    });
  }

  getTypeLabel(type?: FollowUpType): string {
    if (!type) return '—';
    const types: Record<FollowUpType, string> = {
      CALL: 'Llamada',
      EMAIL: 'Email',
      MEETING: 'Reunión',
      NOTE: 'Nota',
      PROPOSAL: 'Propuesta',
      OTHER: 'Otro',
    };
    return types[type] || type;
  }

  getStatusLabel(status?: FollowUpStatus): string {
    if (!status) return '—';
    const statuses: Record<FollowUpStatus, string> = {
      SCHEDULED: 'Programado',
      COMPLETED: 'Completado',
      CANCELLED: 'Cancelado',
    };
    return statuses[status] || status;
  }

  getUserName(userId?: string): string {
    if (!userId) return 'Sin asignar';
    const user = this.users().find((u) => u._id === userId);
    return user ? user.name : userId;
  }
}
