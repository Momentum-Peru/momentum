import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { Popover } from 'primeng/popover';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ContactsCrmApiService } from '../../shared/services/contacts-crm-api.service';
import {
  ContactCrm,
  ContactSource,
  UpdateContactCrmRequest,
} from '../../shared/interfaces/contact-crm.interface';
import { FollowUpsApiService } from '../../shared/services/follow-ups-api.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import { CrmCompaniesApiService } from '../../shared/services/crm-companies-api.service';
import { CompanyOption } from '../../shared/interfaces/company.interface';
import { UserOption } from '../../shared/interfaces/menu-permission.interface';
import {
  FollowUp,
  FollowUpType,
  FollowUpStatus,
  CreateFollowUpRequest,
  UpdateFollowUpRequest,
} from '../../shared/interfaces/follow-up.interface';
import { AgendaApiService } from '../../shared/services/agenda-api.service';
import { LeadsApiService } from '../../shared/services/leads-api.service';
import { buildWhatsAppUrl } from '../../shared/utils/whatsapp-url.util';
import { AudioAnalysisResponse } from '../../shared/interfaces/audio-analysis.interface';
import { firstValueFrom } from 'rxjs';
import { ErpNotifyService } from '../../core/services/erp-notify.service';
import { environment } from '../../../environments/environment';

type Tab = 'info' | 'seguimientos';
type AudioFollowUpMode = 'transcribe' | 'analyze';

interface FileWebhookOption {
  id: string;
  label: string;
  /** Slug permitido en GET /crm/n8n-webhooks/:slug (proxy servidor → n8n). */
  slug: string;
  /** URL pública del webhook (texto de auditoría / descripción). */
  n8nUrl: string;
}

interface N8nProxyResponse {
  upstreamStatus: number;
  upstreamUrl: string;
  body: string;
}

@Component({
  selector: 'app-crm-contact-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonModule,
    TagModule,
    TableModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
    TooltipModule,
    DividerModule,
    ConfirmDialogModule,
    Popover,
  ],
  providers: [ConfirmationService],
  templateUrl: './crm-contact-detail.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrmContactDetailPage implements OnInit {
  private readonly sendFilesPanel = viewChild<Popover>('sendFilesPanel');

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly contactsApi = inject(ContactsCrmApiService);
  private readonly followUpsApi = inject(FollowUpsApiService);
  private readonly erpNotify = inject(ErpNotifyService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly usersApi = inject(UsersApiService);
  private readonly crmCompaniesApi = inject(CrmCompaniesApiService);
  private readonly agendaApi = inject(AgendaApiService);
  private readonly leadsApi = inject(LeadsApiService);

  // ── Data ─────────────────────────────────────────────────────────────────
  contact = signal<ContactCrm | null>(null);
  followUps = signal<FollowUp[]>([]);
  users = signal<UserOption[]>([]);
  clients = signal<CompanyOption[]>([]);

  // ── Loading ───────────────────────────────────────────────────────────────
  loadingContact = signal(false);
  loadingFollowUps = signal(false);
  saving = signal(false);
  savingFollowUp = signal(false);
  savingCompany = signal(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  activeTab = signal<Tab>('seguimientos');

  /** Webhook "Enviar archivos": id de la opción en curso o null. */
  fileWebhookLoadingId = signal<string | null>(null);

  readonly fileWebhookOptions: FileWebhookOption[] = [
    {
      id: 'cusco-media',
      label: 'Imágenes y videos — Proyecto Cusco',
      slug: 'momentumcusco',
      n8nUrl:
        'https://clase-easypanel-n8n.zycrzt.easypanel.host/webhook/momentumcusco',
    },
    {
      id: 'cusco-docs',
      label: 'Documentos — Proyecto Cusco',
      slug: 'momentumdocusco',
      n8nUrl:
        'https://clase-easypanel-n8n.zycrzt.easypanel.host/webhook/momentumdocusco',
    },
    {
      id: 'chincha-media',
      label: 'Imágenes y videos — Proyecto Chincha',
      slug: 'momentumchincha',
      n8nUrl:
        'https://clase-easypanel-n8n.zycrzt.easypanel.host/webhook/momentumchincha',
    },
    {
      id: 'satipo-media',
      label: 'Imágenes y videos — Proyecto Satipo',
      slug: 'momentumsatipo',
      n8nUrl:
        'https://clase-easypanel-n8n.zycrzt.easypanel.host/webhook/momentumsatipo',
    },
  ];

  // Inline field editing
  editingField = signal<string | null>(null);
  editingValue = signal('');
  editingSourceValue = signal<ContactSource | ''>('');

  // New follow-up form (inline in Seguimientos tab)
  showNewFollowUpForm = signal(false);
  newFuTitle = '';
  newFuType = signal<FollowUpType>('CALL');
  newFuStatus = signal<FollowUpStatus>('SCHEDULED');
  newFuDate = signal<Date | null>(null);
  newFuUserId = signal('');
  newFuDescription = '';
  newFuOutcome = '';

  // Edit follow-up dialog
  showEditFollowUpDialog = signal(false);
  editingFollowUp = signal<Partial<FollowUp> | null>(null);
  private cachedScheduledDate: Date | null = null;
  private cachedScheduledDateStr: string | null = null;
  private cachedNextDate: Date | null = null;
  private cachedNextDateStr: string | null = null;

  // Link company dialog
  showLinkCompanyDialog = signal(false);
  selectedClientId = signal('');

  // New company dialog
  showNewCompanyDialog = signal(false);
  newCompanyName = '';
  newCompanyTaxId = '';
  newCompanyPhone = '';
  newCompanyEmail = '';

  showAudioFollowUpDialog = signal(false);
  audioFollowUpMode = signal<AudioFollowUpMode>('transcribe');
  isRecording = signal(false);
  analyzingAudio = signal(false);
  mediaRecorder: MediaRecorder | null = null;
  recordedChunks: Blob[] = [];

  // ── Options ───────────────────────────────────────────────────────────────
  readonly sourceOptions: { label: string; value: ContactSource }[] = [
    { label: 'Referido', value: 'REFERRAL' },
    { label: 'Redes sociales', value: 'SOCIAL_MEDIA' },
    { label: 'Otros', value: 'OTHER' },
  ];

  readonly typeOptions: { label: string; value: FollowUpType }[] = [
    { label: 'Llamada', value: 'CALL' },
    { label: 'Email', value: 'EMAIL' },
    { label: 'Reunión', value: 'MEETING' },
    { label: 'Nota', value: 'NOTE' },
    { label: 'Propuesta', value: 'PROPOSAL' },
    { label: 'Otro', value: 'OTHER' },
  ];

  readonly statusOptions: { label: string; value: FollowUpStatus }[] = [
    { label: 'Programado', value: 'SCHEDULED' },
    { label: 'Completado', value: 'COMPLETED' },
    { label: 'Cancelado', value: 'CANCELLED' },
  ];

  // ── Computed ──────────────────────────────────────────────────────────────
  initials = computed(() => {
    const name = this.contact()?.name || '';
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join('');
  });

  linkedClient = computed(() => {
    const clientId = this.contact()?.clientId;
    if (!clientId) return null;
    return this.clients().find((c) => c._id === clientId) ?? null;
  });

  followUpCounts = computed(() => {
    const fus = this.followUps();
    return {
      total: fus.length,
      scheduled: fus.filter((f) => f.status === 'SCHEDULED').length,
      completed: fus.filter((f) => f.status === 'COMPLETED').length,
    };
  });

  /** Más reciente primero (fecha programada o creación). */
  sortedFollowUps = computed(() => {
    const list = [...this.followUps()];
    return list.sort((a, b) => {
      const ta = a.scheduledDate
        ? new Date(a.scheduledDate).getTime()
        : a.createdAt
          ? new Date(a.createdAt).getTime()
          : 0;
      const tb = b.scheduledDate
        ? new Date(b.scheduledDate).getTime()
        : b.createdAt
          ? new Date(b.createdAt).getTime()
          : 0;
      return tb - ta;
    });
  });

  lastFollowUpPreview = computed(() => {
    const s = this.sortedFollowUps();
    return s.length ? s[0] : null;
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/leads']);
      return;
    }
    this.loadContact(id);
    this.loadUsers();
    this.loadClients();
  }

  private loadContact(id: string): void {
    this.loadingContact.set(true);
    this.contactsApi.getById(id).subscribe({
      next: (c) => {
        this.contact.set(c);
        this.loadingContact.set(false);
        this.loadFollowUps(c);
      },
      error: () => {
        this.loadingContact.set(false);
        this.erpNotify.error('Error', 'No se pudo cargar el contacto');
        this.router.navigate(['/leads']);
      },
    });
  }

  private loadUsers(): void {
    this.usersApi.list().subscribe({
      next: (u) => this.users.set(u),
      error: () => this.users.set([]),
    });
  }

  private loadClients(): void {
    this.crmCompaniesApi.listActiveAsOptions().subscribe({
      next: (c) => this.clients.set(c),
      error: () => this.clients.set([]),
    });
  }

  private loadFollowUps(contact: ContactCrm): void {
    if (!contact._id) { this.followUps.set([]); return; }
    this.loadingFollowUps.set(true);
    this.followUpsApi.getByContact(contact._id).subscribe({
      next: (items) => { this.followUps.set(items ?? []); this.loadingFollowUps.set(false); },
      error: () => { this.loadingFollowUps.set(false); this.followUps.set([]); },
    });
  }

  goBack(): void {
    this.router.navigate(['/leads']);
  }

  confirmDeleteContact(): void {
    const c = this.contact();
    if (!c?._id) return;
    const name = (c.name ?? '').trim() || 'este contacto';
    this.confirmationService.confirm({
      message: `¿Eliminar a <strong>${name}</strong>? Se borrarán también <strong>todos sus seguimientos</strong>. No se puede deshacer.`,
      header: 'Eliminar contacto',
      icon: 'pi pi-trash',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.executeDeleteContact(c._id!),
    });
  }

  private executeDeleteContact(id: string): void {
    this.contactsApi.delete(id).subscribe({
      next: (res) => {
        const n = res.followUpsRemoved ?? 0;
        this.erpNotify.success(
          'Eliminado',
          n > 0
            ? `Contacto eliminado (${n} seguimiento(s) borrados).`
            : 'Contacto eliminado.'
        );
        this.router.navigate(['/leads']);
      },
      error: (err: { error?: { message?: string } }) => {
        this.erpNotify.error('Error', err?.error?.message || 'No se pudo eliminar el contacto');
      },
    });
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  /**
   * Llama al proxy del API (servidor → n8n) y crea un seguimiento con la respuesta.
   * Evita CORS del navegador (error HTTP 0 al llamar a n8n directamente).
   */
  runFileWebhook(option: FileWebhookOption, event: Event): void {
    event.stopPropagation();
    const contact = this.contact();
    if (!contact?._id) return;
    if (this.fileWebhookLoadingId()) return;

    this.fileWebhookLoadingId.set(option.id);
    const proxyUrl = `${environment.apiUrl}/crm/n8n-webhooks/${option.slug}`;
    this.http.get<N8nProxyResponse>(proxyUrl).subscribe({
      next: (data) => {
        const ok =
          data.upstreamStatus >= 200 && data.upstreamStatus < 300;
        const sanitized = this.sanitizeWebhookBodyForDisplay(data.body ?? '');
        const truncated = sanitized.length > 12000;
        const bodySlice = sanitized.slice(0, 12000);
        this.persistWebhookFollowUp(contact, option, {
          ok,
          upstreamHttpStatus: data.upstreamStatus,
          responseBody: bodySlice,
          bodyTruncated: truncated,
          resolvedUrl: data.upstreamUrl ?? option.n8nUrl,
        });
      },
      error: (err: HttpErrorResponse) => {
        const friendly = this.mapProxyHttpError(err);
        const raw =
          typeof err.error === 'string'
            ? err.error
            : JSON.stringify(err.error ?? { message: err.message });
        const sanitized = this.sanitizeWebhookBodyForDisplay(raw);
        this.persistWebhookFollowUp(contact, option, {
          ok: false,
          upstreamHttpStatus: err.status ?? 0,
          responseBody: sanitized.slice(0, 12000),
          bodyTruncated: sanitized.length > 12000,
          resolvedUrl: option.n8nUrl,
          backendFailureMessage: friendly,
        });
      },
    });
  }

  private persistWebhookFollowUp(
    contact: ContactCrm,
    option: FileWebhookOption,
    result: {
      ok: boolean;
      upstreamHttpStatus: number;
      responseBody: string;
      bodyTruncated: boolean;
      resolvedUrl: string;
      backendFailureMessage?: string;
    },
  ): void {
    const {
      ok,
      upstreamHttpStatus,
      responseBody,
      bodyTruncated,
      resolvedUrl,
      backendFailureMessage,
    } = result;

    const title = `Enviar archivos: ${option.label}`;
    const resumenUsuario = backendFailureMessage
      ? backendFailureMessage
      : this.upstreamSummaryForUser(ok, upstreamHttpStatus);

    const lines = [
      `Acción: ${option.label}`,
      `Webhook en n8n: ${option.n8nUrl}`,
      `URL atendida por el flujo: ${resolvedUrl}`,
      'Conexión: aplicación → API Momentum → n8n (evita bloqueos CORS del navegador).',
      '',
      `Resumen: ${resumenUsuario}`,
      `Código HTTP devuelto por n8n: ${upstreamHttpStatus || '—'}`,
      bodyTruncated ? '\n(Respuesta truncada a 12 000 caracteres.)\n' : '',
      '\n--- Respuesta técnica ---\n',
      responseBody || '(vacío)',
    ];

    const outcome = backendFailureMessage
      ? `No se ejecutó el flujo: ${backendFailureMessage}`
      : ok
        ? 'Listo. La respuesta de n8n está en la descripción.'
        : this.shortOutcomeForFailedUpstream(upstreamHttpStatus);

    const payload: CreateFollowUpRequest = {
      contactId: contact._id!,
      title,
      type: 'OTHER',
      status: 'COMPLETED',
      description: lines.join('\n'),
      outcome,
    };
    this.followUpsApi.create(payload).subscribe({
      next: () => {
        this.fileWebhookLoadingId.set(null);
        this.sendFilesPanel()?.hide();
        if (backendFailureMessage) {
          this.erpNotify.warn(
            'Seguimiento guardado',
            'No se pudo contactar n8n; el detalle quedó registrado en el seguimiento.',
          );
        } else if (ok) {
          this.erpNotify.success(
            'Listo',
            'La respuesta de n8n quedó guardada en seguimientos.',
          );
        } else {
          this.erpNotify.warn(
            'Revisa el seguimiento',
            resumenUsuario,
          );
        }
        this.loadFollowUps(contact);
        this.activeTab.set('seguimientos');
      },
      error: () => {
        this.fileWebhookLoadingId.set(null);
        this.erpNotify.error('Error', 'No se pudo guardar el seguimiento.');
      },
    });
  }

  /** Texto legible según código HTTP devuelto por n8n (vía proxy). */
  private upstreamSummaryForUser(ok: boolean, status: number): string {
    if (ok) {
      return `El flujo en n8n respondió correctamente (código ${status}).`;
    }
    if (status === 404) {
      return 'n8n indica que esa ruta de webhook no existe o el workflow está inactivo / sin publicar.';
    }
    if (status === 401 || status === 403) {
      return 'n8n rechazó la petición. Revisa si el nodo Webhook exige autenticación o header.';
    }
    if (status >= 500) {
      return 'n8n devolvió error interno. Abre la ejecución del workflow en n8n para ver el fallo.';
    }
    return `n8n respondió con código ${status}. Mira el detalle de la respuesta más abajo.`;
  }

  private shortOutcomeForFailedUpstream(status: number): string {
    if (status === 404) {
      return 'Webhook no encontrado o flujo inactivo en n8n.';
    }
    if (status === 401 || status === 403) {
      return 'Revisa autenticación del Webhook en n8n.';
    }
    if (status >= 500) {
      return 'Error en n8n al procesar el webhook.';
    }
    return 'La llamada llegó a n8n pero el código de respuesta indica un problema.';
  }

  /** Cuando falla el GET al API proxy (no llegamos a n8n). */
  private mapProxyHttpError(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'No hay conexión con el servidor Momentum (red, VPN o API no disponible).';
    }
    if (err.status === 401 || err.status === 403) {
      return 'Tu sesión expiró o no tienes permiso. Vuelve a iniciar sesión.';
    }
    const msg = (err.error as { message?: string })?.message;
    if (typeof msg === 'string' && msg.trim().length > 0) {
      return msg.length > 320 ? `${msg.slice(0, 317)}…` : msg;
    }
    if (err.status >= 500) {
      return 'Momentum no pudo contactar a n8n (revisa que la instancia esté en línea y la URL sea correcta).';
    }
    return 'No se pudo completar la solicitud. Intenta de nuevo en unos segundos.';
  }

  /** Evita mostrar basura del cliente (p. ej. ProgressEvent serializado). */
  private sanitizeWebhookBodyForDisplay(raw: string): string {
    const t = (raw ?? '').trim();
    if (!t) {
      return '(Sin contenido en la respuesta.)';
    }
    if (
      t === '{"isTrusted":true}' ||
      /^[\s\{\[]*"isTrusted"\s*:\s*true/.test(t)
    ) {
      return '(Sin datos útiles en el cuerpo; suele ocurrir con errores del navegador. La llamada ahora pasa por el servidor Momentum.)';
    }
    return raw ?? '';
  }

  // ── Inline editing ────────────────────────────────────────────────────────
  startEdit(field: string, currentValue?: string): void {
    this.editingField.set(field);
    this.editingValue.set(currentValue ?? '');
  }

  startEditSource(): void {
    this.editingField.set('source');
    this.editingSourceValue.set((this.contact()?.source as ContactSource) ?? '');
  }

  cancelEdit(): void {
    this.editingField.set(null);
    this.editingValue.set('');
  }

  saveField(field: keyof UpdateContactCrmRequest): void {
    const contact = this.contact();
    if (!contact?._id) return;
    const raw = this.editingValue().trim();
    this.saving.set(true);
    this.contactsApi.update(contact._id, { [field]: raw || undefined } as UpdateContactCrmRequest).subscribe({
      next: (updated) => {
        this.contact.set(updated);
        this.editingField.set(null);
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.erpNotify.error('Error', 'No se pudo guardar el campo');
      },
    });
  }

  saveSource(value: ContactSource): void {
    const contact = this.contact();
    if (!contact?._id) return;
    this.contactsApi.update(contact._id, { source: value }).subscribe({
      next: (updated) => { this.contact.set(updated); this.editingField.set(null); },
      error: () => this.erpNotify.error('Error', 'No se pudo guardar'),
    });
  }

  onFieldKeydown(event: KeyboardEvent, field: keyof UpdateContactCrmRequest): void {
    if (event.key === 'Enter') this.saveField(field);
    if (event.key === 'Escape') this.cancelEdit();
  }

  // ── New follow-up (inline form) ───────────────────────────────────────────
  toggleNewFollowUpForm(): void {
    this.showNewFollowUpForm.set(!this.showNewFollowUpForm());
    if (!this.showNewFollowUpForm()) this.resetNewFuForm();
  }

  private resetNewFuForm(): void {
    this.newFuTitle = '';
    this.newFuType.set('CALL');
    this.newFuStatus.set('SCHEDULED');
    this.newFuDate.set(null);
    this.newFuUserId.set('');
    this.newFuDescription = '';
    this.newFuOutcome = '';
  }

  createFollowUp(): void {
    const contact = this.contact();
    if (!contact?._id) return;
    this.savingFollowUp.set(true);
    const date = this.newFuDate();
    const payload: CreateFollowUpRequest = {
      contactId: contact._id,
      title: this.newFuTitle.trim() || undefined,
      type: this.newFuType(),
      status: this.newFuStatus(),
      scheduledDate: date ? date.toISOString() : undefined,
      userId: this.newFuUserId() || undefined,
      description: this.newFuDescription.trim() || undefined,
      outcome: this.newFuOutcome.trim() || undefined,
    };
    this.followUpsApi.create(payload).subscribe({
      next: () => {
        this.savingFollowUp.set(false);
        this.erpNotify.crmFollowUpCreated((contact.name ?? '').trim() || undefined);
        this.showNewFollowUpForm.set(false);
        this.resetNewFuForm();
        this.loadFollowUps(contact);
      },
      error: () => {
        this.savingFollowUp.set(false);
        this.erpNotify.error('Error', 'No se pudo crear el seguimiento');
      },
    });
  }

  // ── Edit follow-up dialog ─────────────────────────────────────────────────
  openEditFollowUp(fu: FollowUp): void {
    if (!fu?._id) return;
    this.editingFollowUp.set({ ...fu });
    this.showEditFollowUpDialog.set(true);
  }

  onEditFuChange<K extends keyof FollowUp>(key: K, value: FollowUp[K] | undefined): void {
    const cur = this.editingFollowUp();
    if (!cur) return;
    this.editingFollowUp.set({ ...cur, [key]: value as FollowUp[K] });
  }

  onEditFuDateChange(date: Date | null, key: 'scheduledDate' | 'nextFollowUpDate'): void {
    this.onEditFuChange(key, (date ? date.toISOString() : undefined) as unknown as string);
  }

  getEditScheduledDate(): Date | null {
    const s = this.editingFollowUp()?.scheduledDate;
    if (!s) { this.cachedScheduledDate = null; this.cachedScheduledDateStr = null; return null; }
    if (this.cachedScheduledDateStr !== s) { this.cachedScheduledDate = new Date(s); this.cachedScheduledDateStr = s; }
    return this.cachedScheduledDate;
  }

  getEditNextDate(): Date | null {
    const s = this.editingFollowUp()?.nextFollowUpDate;
    if (!s) { this.cachedNextDate = null; this.cachedNextDateStr = null; return null; }
    if (this.cachedNextDateStr !== s) { this.cachedNextDate = new Date(s); this.cachedNextDateStr = s; }
    return this.cachedNextDate;
  }

  saveFollowUp(): void {
    const editing = this.editingFollowUp();
    const contact = this.contact();
    if (!editing?._id) return;
    const payload: UpdateFollowUpRequest = {
      title: editing.title,
      description: editing.description,
      type: editing.type,
      status: editing.status,
      scheduledDate: editing.scheduledDate,
      contactId: editing.contactId || contact?._id,
      userId: editing.userId,
      outcome: editing.outcome,
      nextFollowUpDate: editing.nextFollowUpDate,
    };
    this.followUpsApi.update(editing._id, payload).subscribe({
      next: () => {
        this.erpNotify.crmFollowUpUpdated();
        this.showEditFollowUpDialog.set(false);
        this.editingFollowUp.set(null);
        if (contact) this.loadFollowUps(contact);
      },
      error: () => this.erpNotify.error('Error', 'No se pudo actualizar el seguimiento'),
    });
  }

  deleteFollowUp(fu: FollowUp): void {
    if (!fu._id) return;
    this.followUpsApi.delete(fu._id).subscribe({
      next: () => {
        this.erpNotify.crmFollowUpRemoved();
        const contact = this.contact();
        if (contact) this.loadFollowUps(contact);
      },
      error: () => this.erpNotify.error('Error', 'No se pudo eliminar'),
    });
  }

  // ── Link company ──────────────────────────────────────────────────────────
  openLinkCompany(): void {
    this.selectedClientId.set(this.contact()?.clientId ?? '');
    this.showLinkCompanyDialog.set(true);
  }

  saveLinkCompany(): void {
    const contact = this.contact();
    if (!contact?._id) return;
    this.saving.set(true);
    this.contactsApi.update(contact._id, { clientId: this.selectedClientId() || undefined }).subscribe({
      next: (updated) => {
        this.contact.set(updated);
        this.saving.set(false);
        this.showLinkCompanyDialog.set(false);
        this.erpNotify.success('Empresa vinculada', 'Se actualizó la empresa.');
      },
      error: () => {
        this.saving.set(false);
        this.erpNotify.error('Error', 'No se pudo vincular la empresa');
      },
    });
  }

  unlinkCompany(): void {
    const contact = this.contact();
    if (!contact?._id) return;
    this.contactsApi.update(contact._id, { clientId: undefined }).subscribe({
      next: (updated) => {
        this.contact.set(updated);
        this.erpNotify.info('Desvinculada', 'Se desvinculó la empresa del contacto.');
      },
      error: () => this.erpNotify.error('Error', 'No se pudo desvincular'),
    });
  }

  // ── New company ───────────────────────────────────────────────────────────
  openNewCompany(): void {
    this.newCompanyName = '';
    this.newCompanyTaxId = '';
    this.newCompanyPhone = '';
    this.newCompanyEmail = '';
    this.showNewCompanyDialog.set(true);
  }

  saveNewCompany(): void {
    const name = this.newCompanyName.trim();
    const taxId = this.newCompanyTaxId.trim();
    if (!name) {
      this.erpNotify.warn('Requerido', 'El nombre de la empresa es requerido');
      return;
    }
    if (!/^\d{11}$/.test(taxId)) {
      this.erpNotify.warn('RUC inválido', 'El RUC debe tener exactamente 11 dígitos');
      return;
    }
    const contact = this.contact();
    if (!contact?._id) return;
    this.savingCompany.set(true);
    this.crmCompaniesApi.create({
      name,
      taxId,
      ...(this.newCompanyPhone.trim() ? { phone: this.newCompanyPhone.trim() } : {}),
      ...(this.newCompanyEmail.trim() ? { email: this.newCompanyEmail.trim() } : {}),
    }).subscribe({
      next: (newClient) => {
        this.clients.set([...this.clients(), { _id: newClient._id, name: newClient.name }]);
        this.contactsApi.update(contact._id!, { clientId: newClient._id }).subscribe({
          next: (updated) => {
            this.contact.set(updated);
            this.savingCompany.set(false);
            this.showNewCompanyDialog.set(false);
            this.erpNotify.success('Empresa creada', 'Se creó y vinculó la empresa.');
          },
          error: () => {
            this.savingCompany.set(false);
            this.erpNotify.warn('Empresa creada', 'Empresa creada pero no se pudo vincular.');
          },
        });
      },
      error: () => {
        this.savingCompany.set(false);
        this.erpNotify.error('Error', 'No se pudo crear la empresa');
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getTypeLabel(type?: FollowUpType): string {
    const map: Record<string, string> = { CALL: 'Llamada', EMAIL: 'Email', MEETING: 'Reunión', NOTE: 'Nota', PROPOSAL: 'Propuesta', OTHER: 'Otro' };
    return type ? (map[type] ?? type) : '—';
  }

  getTypeIcon(type?: FollowUpType): string {
    const map: Record<string, string> = { CALL: 'pi-phone', EMAIL: 'pi-envelope', MEETING: 'pi-users', NOTE: 'pi-file', PROPOSAL: 'pi-file-edit', OTHER: 'pi-ellipsis-h' };
    return `pi ${type ? (map[type] ?? 'pi-circle') : 'pi-circle'}`;
  }

  getStatusLabel(status?: FollowUpStatus): string {
    const map: Record<string, string> = { SCHEDULED: 'Programado', COMPLETED: 'Completado', CANCELLED: 'Cancelado' };
    return status ? (map[status] ?? status) : '—';
  }

  getStatusSeverity(status?: FollowUpStatus): 'success' | 'warn' | 'danger' | 'secondary' {
    if (status === 'COMPLETED') return 'success';
    if (status === 'SCHEDULED') return 'warn';
    if (status === 'CANCELLED') return 'danger';
    return 'secondary';
  }

  getSourceLabel(source?: string): string {
    const map: Record<string, string> = { REFERRAL: 'Referido', SOCIAL_MEDIA: 'Redes sociales', OTHER: 'Otros' };
    return source ? (map[source] ?? source) : '—';
  }

  getSourceSeverity(source?: string): 'success' | 'info' | 'secondary' {
    if (source === 'REFERRAL') return 'success';
    if (source === 'SOCIAL_MEDIA') return 'info';
    return 'secondary';
  }

  getUserName(userId?: string): string {
    if (!userId) return 'Sin asignar';
    return this.users().find((u) => u._id === userId)?.name ?? '—';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }

  formatDateTime(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  callContact(): void {
    const phone = this.contact()?.phone || this.contact()?.mobile;
    if (!phone) {
      this.erpNotify.warn('Sin teléfono', 'El contacto no tiene teléfono registrado');
      return;
    }
    window.open(`tel:${phone}`);
  }

  emailContact(): void {
    const email = this.contact()?.email;
    if (!email) {
      this.erpNotify.warn('Sin correo', 'El contacto no tiene correo registrado');
      return;
    }
    window.open(`mailto:${email}`);
  }

  quickFollowUp(type: FollowUpType): void {
    this.activeTab.set('seguimientos');
    this.newFuType.set(type);
    this.showNewFollowUpForm.set(true);
  }

  copyToClipboard(text?: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() =>
      this.erpNotify.info('Copiado', 'Copiado al portapapeles')
    );
  }

  whatsappUrl(): string | null {
    const c = this.contact();
    return buildWhatsAppUrl(c?.mobile || c?.phone);
  }

  openWhatsApp(): void {
    const url = this.whatsappUrl();
    if (!url) {
      this.erpNotify.warn(
        'Sin WhatsApp',
        'No hay un número válido. Añade móvil o teléfono (con o sin +51).'
      );
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  openAudioFollowUpDialog(mode: AudioFollowUpMode): void {
    if (!this.showNewFollowUpForm()) {
      this.showNewFollowUpForm.set(true);
    }
    this.audioFollowUpMode.set(mode);
    this.showAudioFollowUpDialog.set(true);
    void this.startRecordingFollowUp();
  }

  closeAudioFollowUpDialog(): void {
    this.showAudioFollowUpDialog.set(false);
    if (this.isRecording()) {
      this.stopRecordingFollowUp();
    }
  }

  async toggleRecordingFollowUp(): Promise<void> {
    if (this.isRecording()) {
      this.stopRecordingFollowUp();
    } else {
      await this.startRecordingFollowUp();
    }
  }

  private async startRecordingFollowUp(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      this.recordedChunks = [];
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void this.onFollowUpRecordingStopped();
      };
      this.mediaRecorder.start();
      this.isRecording.set(true);
    } catch {
      this.erpNotify.error('Micrófono', 'No se pudo acceder al micrófono.');
    }
  }

  private stopRecordingFollowUp(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.isRecording.set(false);
  }

  private async onFollowUpRecordingStopped(): Promise<void> {
    if (this.recordedChunks.length === 0) return;
    const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm;codecs=opus' });
    const fileName = `contact-fu-${Date.now()}.webm`;
    const audioFile = new File([audioBlob], fileName, { type: 'audio/webm;codecs=opus' });
    this.recordedChunks = [];

    this.analyzingAudio.set(true);
    try {
      if (this.audioFollowUpMode() === 'transcribe') {
        const result = await firstValueFrom(this.agendaApi.transcribe(audioFile));
        const text = result?.text?.trim() ?? '';
        this.newFuDescription = this.newFuDescription.trim()
          ? `${this.newFuDescription.trim()}\n\n${text}`.trim()
          : text;
        this.erpNotify.success('Transcripción', 'Texto añadido a la descripción del seguimiento.');
      } else {
        const presigned = await firstValueFrom(
          this.leadsApi.getPresignedUrlForAudioGlobal({
            fileName,
            contentType: 'audio/webm',
            expirationTime: 600,
          }),
        );
        await this.agendaApi.uploadFileToS3(
          presigned.presignedUrl,
          audioFile,
          'audio/webm',
        );
        const analysis = await firstValueFrom(
          this.leadsApi.analyzeAudioGlobal({ audioUrl: presigned.publicUrl }),
        );
        this.applyAudioAnalysisToNewFollowUp(analysis);
        this.erpNotify.success('Análisis IA', 'Resumen y acuerdos aplicados al formulario.');
      }
    } catch {
      this.erpNotify.error('Audio', 'No se pudo procesar el audio. Intenta de nuevo.');
    } finally {
      this.analyzingAudio.set(false);
      this.closeAudioFollowUpDialog();
    }
  }

  private applyAudioAnalysisToNewFollowUp(result: AudioAnalysisResponse): void {
    const summary = result.summary?.trim() ?? '';
    let outcome = '';
    if (result.agreements?.length) {
      outcome +=
        'ACUERDOS:\n' +
        result.agreements.map((a) => `- ${a}`).join('\n') +
        '\n\n';
    }
    if (result.followUpActions?.length) {
      outcome +=
        'ACCIONES:\n' + result.followUpActions.map((a) => `- ${a}`).join('\n');
    }
    if (summary) {
      this.newFuDescription = this.newFuDescription.trim()
        ? `${this.newFuDescription.trim()}\n\n${summary}`.trim()
        : summary;
    }
    if (outcome.trim()) {
      this.newFuOutcome = this.newFuOutcome.trim()
        ? `${this.newFuOutcome.trim()}\n\n${outcome.trim()}`
        : outcome.trim();
    }
  }
}
