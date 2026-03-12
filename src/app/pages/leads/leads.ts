import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
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
import { TagModule } from 'primeng/tag';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { LeadsApiService } from '../../shared/services/leads-api.service';
import { FollowUpsApiService } from '../../shared/services/follow-ups-api.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import { UserOption } from '../../shared/interfaces/menu-permission.interface';
import { ClientsApiService, ClientOption } from '../../shared/services/clients-api.service';
import { CompaniesApiService } from '../../shared/services/companies-api.service';
import { CompanyOption } from '../../shared/interfaces/company.interface';
import { AuthService } from '../login/services/auth.service';
import { ApisPeruApiService } from '../../shared/services/apisperu-api.service';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { Subject, of } from 'rxjs';
import {
  Lead,
  LeadStatus,
  LeadSource,
  LeadContact,
  LeadCompany,
  LeadLocation,
  LeadStatistics,
  CreateLeadRequest,
  UpdateLeadRequest,
} from '../../shared/interfaces/lead.interface';
import { FollowUp } from '../../shared/interfaces/follow-up.interface';

interface Country {
  _id: string;
  codigo: string;
  nombre: string;
}

interface Province {
  _id: string;
  codigo: string;
  nombre: string;
  paisCodigo: string;
}

interface District {
  _id: string;
  codigo: string;
  nombre: string;
  provinciaCodigo: string;
}

@Component({
  selector: 'app-leads',
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
    InputNumberModule,
    TextareaModule,
    DatePickerModule,
    DragDropModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './leads.html',
  styleUrls: ['./leads.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeadsPage implements OnInit {
  private readonly leadsApi = inject(LeadsApiService);
  private readonly followUpsApi = inject(FollowUpsApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly baseUrl = environment.apiUrl;
  private readonly apisPeruService = inject(ApisPeruApiService);

  // Subject para manejar la autocompletación de taxId
  private readonly companyTaxIdSubject = new Subject<string>();

  // Signals
  viewMode = signal<'list' | 'pipeline'>('pipeline'); // Default to pipeline as requested
  items = signal<Lead[]>([]);
  query = signal<string>('');
  statusFilter = signal<LeadStatus | ''>('');
  sourceFilter = signal<LeadSource | ''>('');
  assignedToFilter = signal<string>('');
  companyIdFilter = signal<string>('');
  showDialog = signal<boolean>(false);
  showStatsDialog = signal<boolean>(false);
  showDetailsDialog = signal<boolean>(false);
  showConvertDialog = signal<boolean>(false);
  editing = signal<Partial<Lead> | null>(null);
  viewingLead = signal<Lead | null>(null);
  convertingLead = signal<Lead | null>(null);
  stats = signal<LeadStatistics | null>(null);
  expandedRows = signal<Set<string>>(new Set());
  showPhotoModal = signal<boolean>(false);
  photoModalUrls = signal<string[]>([]);
  photoModalCurrentIndex = signal<number>(0);
  leadFollowUps = signal<FollowUp[]>([]);

  // Selectores
  users = signal<UserOption[]>([]);
  clients = signal<ClientOption[]>([]);
  companies = signal<CompanyOption[]>([]);
  countries = signal<Country[]>([]);
  provinces = signal<Province[]>([]);
  districts = signal<District[]>([]);
  selectedCountry = signal<Country | null>(null);
  selectedProvince = signal<Province | null>(null);
  selectedDistrict = signal<District | null>(null);

  // Computed para agrupar leads por estado (Pipeline)
  leadsByStatus = computed(() => {
    const leads = this.items();
    const grouped: Record<LeadStatus, Lead[]> = {
      NEW: [],
      CONTACTED: [],
      QUALIFIED: [],
      PROPOSAL: [],
      NEGOTIATION: [],
      CONVERTED: [],
      LOST: [],
    };

    leads.forEach((lead) => {
      if (lead.status && grouped[lead.status]) {
        grouped[lead.status].push(lead);
      } else {
        // Fallback para estados desconocidos o sin estado
        grouped['NEW'].push(lead);
      }
    });

    return grouped;
  });

  // Opciones de enums
  statusOptions: { label: string; value: LeadStatus | '' }[] = [
    { label: 'Todos', value: '' },
    { label: 'Nuevo', value: 'NEW' },
    { label: 'Contactado', value: 'CONTACTED' },
    { label: 'Calificado', value: 'QUALIFIED' },
    { label: 'Propuesta', value: 'PROPOSAL' },
    { label: 'Negociación', value: 'NEGOTIATION' },
    { label: 'Convertido', value: 'CONVERTED' },
    { label: 'Perdido', value: 'LOST' },
  ];

  sourceOptions: { label: string; value: LeadSource | '' }[] = [
    { label: 'Todos', value: '' },
    { label: 'Sitio Web', value: 'WEBSITE' },
    { label: 'Referencia', value: 'REFERRAL' },
    { label: 'Redes Sociales', value: 'SOCIAL_MEDIA' },
    { label: 'Email', value: 'EMAIL' },
    { label: 'Teléfono', value: 'PHONE' },
    { label: 'Evento', value: 'EVENT' },
    { label: 'Otro', value: 'OTHER' },
  ];

  statusColors: Record<
    LeadStatus,
    'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'
  > = {
    NEW: 'info',
    CONTACTED: 'warn',
    QUALIFIED: 'secondary',
    PROPOSAL: 'secondary',
    NEGOTIATION: 'warn',
    CONVERTED: 'success',
    LOST: 'danger',
  };

  selectedClientId = signal<string>('');

  ngOnInit() {
    this.load();
    this.loadUsers();
    this.loadClients();
    this.loadCompanies();
    this.loadCountries();
    this.loadStats();
    this.setupCompanyTaxIdAutocomplete();
  }

  constructor() {
    effect(() => {
      if (!this.showDialog()) {
        this.editing.set(null);
        this.resetLocation();
      }
    });

    effect(() => {
      if (!this.showDetailsDialog()) {
        this.viewingLead.set(null);
      }
    });

    effect(() => {
      if (!this.showConvertDialog()) {
        this.convertingLead.set(null);
      }
    });
  }

  load() {
    const params: import('../../shared/interfaces/lead.interface').LeadQueryParams & {
      search?: string;
    } = {};
    if (this.query()) params.search = this.query();
    const status = this.statusFilter();
    if (status !== '') params.status = status;
    const source = this.sourceFilter();
    if (source !== '') params.source = source;
    if (this.assignedToFilter()) params.assignedTo = this.assignedToFilter();
    if (this.companyIdFilter()) params.companyId = this.companyIdFilter();

    this.leadsApi.list(params).subscribe({
      next: (leads) => this.items.set(leads),
      error: (error) => {
        console.error('Error loading leads:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los leads',
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

  loadCompanies() {
    this.companiesApi.listActiveAsOptions().subscribe({
      next: (companies) => this.companies.set(companies),
      error: () => this.companies.set([]),
    });
  }

  loadCountries() {
    this.http.get<Country[]>(`${this.baseUrl}/locations/countries`).subscribe({
      next: (countries) => this.countries.set(countries),
      error: () => this.countries.set([]),
    });
  }

  loadProvinces(countryCode: string) {
    this.http
      .get<Province[]>(`${this.baseUrl}/locations/countries/${countryCode}/provinces`)
      .subscribe({
        next: (provinces) => {
          this.provinces.set(provinces);
          this.districts.set([]);
          this.selectedDistrict.set(null);
        },
        error: () => this.provinces.set([]),
      });
  }

  loadDistricts(provinceCode: string) {
    this.http
      .get<District[]>(`${this.baseUrl}/locations/provinces/${provinceCode}/districts`)
      .subscribe({
        next: (districts) => this.districts.set(districts),
        error: () => this.districts.set([]),
      });
  }

  loadStats() {
    this.leadsApi.getStatistics(this.assignedToFilter() || undefined).subscribe({
      next: (stats) => this.stats.set(stats),
      error: () => this.stats.set(null),
    });
  }

  setQuery(value: string) {
    this.query.set(value);
    this.load();
  }

  setStatusFilter(value: LeadStatus | '') {
    this.statusFilter.set(value);
    this.load();
  }

  setSourceFilter(value: LeadSource | '') {
    this.sourceFilter.set(value);
    this.load();
  }

  setAssignedToFilter(value: string) {
    this.assignedToFilter.set(value);
    this.load();
    this.loadStats();
  }

  setCompanyIdFilter(value: string) {
    this.companyIdFilter.set(value);
    this.load();
  }

  clearFilters() {
    this.query.set('');
    this.statusFilter.set('');
    this.sourceFilter.set('');
    this.assignedToFilter.set('');
    this.companyIdFilter.set('');
    this.load();
    this.loadStats();
  }

  newItem() {
    this.editing.set({
      name: '',
      contact: { name: '', email: '', phone: '' },
      status: 'NEW',
      source: 'OTHER',
      assignedTo: '',
    });
    this.showDialog.set(true);
    this.resetLocation();
  }

  editItem(item: Lead) {
    this.editing.set({ ...item });
    this.showDialog.set(true);
    this.initializeLocation(item.location);
  }

  viewDetails(item: Lead) {
    this.viewingLead.set(item);
    this.showDetailsDialog.set(true);
    if (item._id) {
      this.loadFollowUps(item._id);
    }
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  closeDetails() {
    this.showDetailsDialog.set(false);
  }

  closeConvert() {
    this.showConvertDialog.set(false);
  }

  onEditChange<K extends keyof Lead>(key: K, value: Lead[K]) {
    const cur = this.editing();
    if (!cur) return;
    this.editing.set({ ...cur, [key]: value });
  }

  onContactChange<K extends keyof LeadContact>(key: K, value: LeadContact[K]) {
    const cur = this.editing();
    if (!cur || !cur.contact) return;
    this.editing.set({
      ...cur,
      contact: { ...cur.contact, [key]: value },
    });
  }

  onCompanyChange<K extends keyof LeadCompany>(key: K, value: LeadCompany[K]) {
    const cur = this.editing();
    if (!cur) return;
    const company = cur.company || {};
    this.editing.set({
      ...cur,
      company: { ...company, [key]: value },
    });

    // Si se cambió el taxId, disparar la autocompletación
    if (key === 'taxId' && typeof value === 'string') {
      this.companyTaxIdSubject.next(value);
    }
  }

  /**
   * Configura la autocompletación cuando se ingresa un taxId en company
   */
  private setupCompanyTaxIdAutocomplete(): void {
    this.companyTaxIdSubject
      .pipe(
        debounceTime(800), // Esperar 800ms después de que el usuario deje de escribir
        distinctUntilChanged(), // Solo procesar si el valor cambió
        switchMap((taxId) => {
          if (!taxId || taxId.length < 8) {
            return of(null);
          }

          // Validar formato: 8 dígitos para DNI, 11 para RUC
          const isValidFormat = /^\d{8}$/.test(taxId) || /^\d{11}$/.test(taxId);
          if (!isValidFormat) {
            return of(null);
          }

          // Consultar APIsPERU
          return this.apisPeruService.consultDocument(taxId).pipe(
            catchError((error) => {
              // Si falla, no mostrar error (el backend también intentará autocompletar)
              console.warn('No se pudo autocompletar desde APIsPERU:', error);
              return of(null);
            }),
          );
        }),
      )
      .subscribe((response) => {
        if (!response) return;

        const current = this.editing();
        if (!current) return;

        const company = current.company || {};

        // Autocompletar según el tipo de respuesta (siempre rellenar con nueva consulta)
        // DNI y RUC son documentos peruanos, establecer país automáticamente
        const peruCountry = this.countries().find((c) => c.codigo === 'PE');
        if (peruCountry && !this.selectedCountry()) {
          this.selectedCountry.set(peruCountry);
          this.loadProvinces('PE');
        }

        if ('nombreCompleto' in response || 'nombres' in response) {
          // Es DNI
          const dniResponse = response as any;
          const nombreCompleto =
            dniResponse.nombreCompleto ||
            `${dniResponse.nombres} ${dniResponse.apellidoPaterno} ${dniResponse.apellidoMaterno}`.trim();

          // Actualizar ubicación con país Perú
          const location = current.location || {};
          location.paisCodigo = 'PE';

          this.editing.set({
            ...current,
            company: {
              ...company,
              name: nombreCompleto,
            },
            location,
          });
        } else if ('razonSocial' in response) {
          // Es RUC
          const rucResponse = response as any;

          // Construir dirección completa si hay información de ubicación
          let direccionCompleta: string | undefined = undefined;
          if (rucResponse.direccion) {
            const partesDireccion = [
              rucResponse.direccion,
              rucResponse.distrito,
              rucResponse.provincia,
              rucResponse.departamento,
            ].filter(Boolean);
            direccionCompleta = partesDireccion.join(', ') || rucResponse.direccion;
          }

          // Construir descripción con información adicional
          let descripcion: string | undefined = undefined;
          if (rucResponse.estado || rucResponse.condicion) {
            const partesDesc = [];
            if (rucResponse.estado) partesDesc.push(`Estado: ${rucResponse.estado}`);
            if (rucResponse.condicion) partesDesc.push(`Condición: ${rucResponse.condicion}`);
            if (rucResponse.tipo) partesDesc.push(`Tipo: ${rucResponse.tipo}`);
            descripcion = partesDesc.join(' | ');
          }

          // Actualizar ubicación con país Perú y dirección
          const location = current.location || {};
          location.paisCodigo = 'PE';
          if (direccionCompleta) {
            location.direccion = direccionCompleta;
          }

          this.editing.set({
            ...current,
            company: {
              ...company,
              name: rucResponse.razonSocial || rucResponse.nombreComercial || company.name || '',
              website: rucResponse.website || company.website,
            },
            location,
            notes: descripcion || current.notes,
          });
        }
      });
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

    // Después de la validación, sabemos que name y contact existen
    // Hacer type narrowing explícito para TypeScript
    const name = item.name;
    const contact = item.contact;

    if (!name || !contact) {
      return;
    }

    // Ahora TypeScript sabe que name y contact no son undefined
    if (item._id) {
      // Actualizar lead existente - solo campos permitidos en UpdateLeadRequest
      const updatePayload: UpdateLeadRequest = {
        name,
        contact,
        company: item.company,
        location: item.location,
        status: item.status,
        source: item.source,
        estimatedValue: item.estimatedValue,
        notes: item.notes,
        assignedTo: item.assignedTo,
        companyId: item.companyId,
      };

      this.leadsApi.update(item._id, updatePayload).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Lead actualizado correctamente',
          });
          this.closeDialog();
          this.load();
          this.loadStats();
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
      // Crear nuevo lead - solo campos permitidos en CreateLeadRequest
      // Después de la validación y el check anterior, sabemos que name y contact existen
      const createPayload: CreateLeadRequest = {
        name,
        contact,
        company: item.company,
        location: item.location,
        status: item.status || 'NEW',
        source: item.source || 'OTHER',
        estimatedValue: item.estimatedValue,
        notes: item.notes,
        assignedTo: item.assignedTo,
        companyId: item.companyId,
      };

      this.leadsApi.create(createPayload).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Lead creado correctamente',
          });
          this.closeDialog();
          this.load();
          this.loadStats();
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

  remove(item: Lead) {
    if (!item._id) return;

    this.confirmationService.confirm({
      message: `¿Estás seguro de que quieres eliminar el lead "${item.name}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.leadsApi.delete(item._id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Lead eliminado correctamente',
            });
            this.load();
            this.loadStats();
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

  openConvertDialog(item: Lead) {
    if (item.status === 'CONVERTED') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Información',
        detail: 'Este lead ya ha sido convertido',
      });
      return;
    }
    this.convertingLead.set(item);
    this.showConvertDialog.set(true);
  }

  convertToClient() {
    const lead = this.convertingLead();
    const clientId = this.selectedClientId();
    if (!lead?._id || !clientId) return;

    this.leadsApi.convertToClient(lead._id, { clientId }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Lead convertido a cliente correctamente',
        });
        this.closeConvert();
        this.load();
        this.loadStats();
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

  openStats() {
    this.showStatsDialog.set(true);
  }

  closeStats() {
    this.showStatsDialog.set(false);
  }

  // Métodos de ubicación
  onCountryChange(country: Country | null) {
    this.selectedCountry.set(country);
    this.selectedProvince.set(null);
    this.selectedDistrict.set(null);
    this.provinces.set([]);
    this.districts.set([]);

    if (country) {
      this.loadProvinces(country.codigo);
    }
    this.updateLocation();
  }

  onProvinceChange(province: Province | null) {
    this.selectedProvince.set(province);
    this.selectedDistrict.set(null);
    this.districts.set([]);

    if (province) {
      this.loadDistricts(province.codigo);
    }
    this.updateLocation();
  }

  onDistrictChange(district: District | null) {
    this.selectedDistrict.set(district);
    this.updateLocation();
  }

  updateLocation() {
    const cur = this.editing();
    if (!cur) return;

    const location: LeadLocation = {
      paisCodigo: this.selectedCountry()?.codigo,
      provinciaCodigo: this.selectedProvince()?.codigo,
      distritoCodigo: this.selectedDistrict()?.codigo,
      direccion: cur.location?.direccion || '',
    };

    this.editing.set({ ...cur, location });
  }

  onDireccionChange(direccion: string) {
    const cur = this.editing();
    if (!cur) return;
    const location = { ...cur.location, direccion } as LeadLocation;
    this.editing.set({ ...cur, location });
  }

  initializeLocation(location?: LeadLocation) {
    if (!location) {
      this.resetLocation();
      return;
    }

    const country = this.countries().find((c) => c.codigo === location.paisCodigo);
    if (country) {
      this.selectedCountry.set(country);
      this.loadProvinces(country.codigo);

      setTimeout(() => {
        const province = this.provinces().find((p) => p.codigo === location.provinciaCodigo);
        if (province) {
          this.selectedProvince.set(province);
          this.loadDistricts(province.codigo);

          setTimeout(() => {
            const district = this.districts().find((d) => d.codigo === location.distritoCodigo);
            if (district) {
              this.selectedDistrict.set(district);
            }
          }, 100);
        }
      }, 100);
    }
  }

  resetLocation() {
    this.selectedCountry.set(null);
    this.selectedProvince.set(null);
    this.selectedDistrict.set(null);
    this.provinces.set([]);
    this.districts.set([]);
  }

  findCountryByCode(code: string): Country | null {
    return this.countries().find((c) => c.codigo === code) || null;
  }

  findProvinceByCode(code: string): Province | null {
    return this.provinces().find((p) => p.codigo === code) || null;
  }

  findDistrictByCode(code: string): District | null {
    return this.districts().find((d) => d.codigo === code) || null;
  }

  getCountryName(codigo: string): string {
    const country = this.countries().find((c) => c.codigo === codigo);
    return country ? country.nombre : codigo;
  }

  getProvinceName(codigo: string): string {
    const province = this.provinces().find((p) => p.codigo === codigo);
    return province ? province.nombre : codigo;
  }

  getDistrictName(codigo: string): string {
    const district = this.districts().find((d) => d.codigo === codigo);
    return district ? district.nombre : codigo;
  }

  getUserName(id: string | undefined): string {
    if (!id) {
      return 'Sin asignar';
    }
    const user = this.users().find((u) => u._id === id);
    return user ? user.name : id;
  }

  getStatusLabel(status: LeadStatus): string {
    const option = this.statusOptions.find((o) => o.value === status);
    return option ? option.label : status;
  }

  getStatusSeverity(
    status: LeadStatus,
  ): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    return this.statusColors[status] || 'info';
  }

  getClientFilterOptions() {
    return [
      { label: 'Todos', value: '' },
      ...this.clients().map((c) => ({ label: c.name, value: c._id })),
    ];
  }

  getCompanyFilterOptions() {
    const allCompanies = this.companies();

    // Filtrar por acceso del usuario si tiene tenantIds definidos
    const user = this.auth.getCurrentUser();
    if (!user || typeof user !== 'object' || !('tenantIds' in user)) {
      return allCompanies.map((c) => ({ label: c.name, value: c._id }));
    }

    const tenantIds = (user as { tenantIds?: string[] }).tenantIds;
    const filteredCompanies =
      !tenantIds || tenantIds.length === 0
        ? allCompanies
        : allCompanies.filter((c) => tenantIds.includes(c._id));

    return filteredCompanies.map((c) => ({ label: c.name, value: c._id }));
  }

  getCompanyName(id: string | undefined): string {
    if (!id) {
      return '-';
    }
    const company = this.companies().find((c) => c._id === id);
    return company ? company.name : id;
  }

  getStatusCount(status: LeadStatus | ''): number {
    if (!status || !this.stats()) return 0;
    return this.stats()?.byStatus[status] || 0;
  }

  getSourceCount(source: LeadSource | ''): number {
    if (!source || !this.stats()) return 0;
    return this.stats()?.bySource[source] || 0;
  }

  getSourceLabel(source: LeadSource): string {
    const option = this.sourceOptions.find((o) => o.value === source);
    return option ? option.label : source;
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

  private validateForm(item: Partial<Lead>): string[] {
    const errors: string[] = [];

    if (!item.name || item.name.trim() === '') {
      errors.push('El nombre del lead es requerido');
    }

    if (!item.contact?.name || item.contact.name.trim() === '') {
      errors.push('El nombre del contacto es requerido');
    }

    if (!item.contact?.email || item.contact.email.trim() === '') {
      errors.push('El email del contacto es requerido');
    } else if (!this.isValidEmail(item.contact.email)) {
      errors.push('El email del contacto no tiene un formato válido');
    }

    if (!item.assignedTo || item.assignedTo.trim() === '') {
      errors.push('Debe asignar el lead a un usuario');
    }

    if (!item.companyId || item.companyId.trim() === '') {
      errors.push('Debe seleccionar una empresa de Momentum');
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
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }
    return 'Ha ocurrido un error inesperado';
  }

  /**
   * Maneja el drop de una tarjeta en el pipeline
   */
  onDrop(event: CdkDragDrop<Lead[]>, newStatus: string) {
    if (event.previousContainer === event.container) {
      // Reordenar en la misma columna (opcional, por ahora solo visual)
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Mover a otra columna (cambio de estado)
      const lead = event.previousContainer.data[event.previousIndex];
      const targetStatus = newStatus as LeadStatus;

      // Verificar si la transición es válida
      if (this.isValidStatusTransition(lead.status, targetStatus)) {
        // Actualizar visualmente inmediatamente (optimistic UI)
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex,
        );

        // Llamar a la API
        this.updateLeadStatus(lead, targetStatus);
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'Movimiento no permitido',
          detail: `No se puede mover de ${this.getStatusLabel(lead.status)} a ${this.getStatusLabel(
            targetStatus,
          )}`,
        });
      }
    }
  }

  // ========== MÉTODOS DE ANÁLISIS DE AUDIO ==========

  // Métodos eliminados y movidos a FollowUps

  // ========== MÉTODOS DE SEGUIMIENTOS ==========

  /**
   * Carga los seguimientos de un lead
   */
  loadFollowUps(leadId: string | undefined) {
    if (!leadId) {
      this.leadFollowUps.set([]);
      return;
    }
    this.followUpsApi.list({ leadId }).subscribe({
      next: (followUps) => this.leadFollowUps.set(followUps),
      error: () => this.leadFollowUps.set([]),
    });
  }

  /**
   * Obtiene el nombre del tipo de seguimiento
   */
  getFollowUpTypeLabel(type: string | undefined): string {
    if (type == null || type === '') return '—';
    const types: Record<string, string> = {
      CALL: 'Llamada',
      EMAIL: 'Email',
      MEETING: 'Reunión',
      NOTE: 'Nota',
      PROPOSAL: 'Propuesta',
      OTHER: 'Otro',
    };
    return types[type] || type;
  }

  /**
   * Obtiene el nombre del estado de seguimiento
   */
  getFollowUpStatusLabel(status: string | undefined): string {
    if (status == null || status === '') return '—';
    const statuses: Record<string, string> = {
      SCHEDULED: 'Programado',
      COMPLETED: 'Completado',
      CANCELLED: 'Cancelado',
    };
    return statuses[status] || status;
  }

  // ========== VALIDACIONES DE TRANSICIÓN DE ESTADOS ==========

  /**
   * Valida si una transición de estado es válida
   */
  isValidStatusTransition(currentStatus: LeadStatus, newStatus: LeadStatus): boolean {
    const validTransitions: Record<LeadStatus, LeadStatus[]> = {
      NEW: ['CONTACTED', 'LOST'],
      CONTACTED: ['QUALIFIED', 'LOST', 'NEW'],
      QUALIFIED: ['PROPOSAL', 'CONTACTED', 'LOST'],
      PROPOSAL: ['NEGOTIATION', 'QUALIFIED', 'LOST'],
      NEGOTIATION: ['CONVERTED', 'PROPOSAL', 'LOST'],
      CONVERTED: [], // Estado final, no se puede cambiar
      LOST: ['NEW', 'CONTACTED'],
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }

  /**
   * Obtiene los estados válidos a los que se puede transicionar desde el estado actual
   */
  getValidNextStatuses(currentStatus: LeadStatus): { label: string; value: LeadStatus }[] {
    const validTransitions: Record<LeadStatus, LeadStatus[]> = {
      NEW: ['CONTACTED', 'LOST'],
      CONTACTED: ['QUALIFIED', 'LOST', 'NEW'],
      QUALIFIED: ['PROPOSAL', 'CONTACTED', 'LOST'],
      PROPOSAL: ['NEGOTIATION', 'QUALIFIED', 'LOST'],
      NEGOTIATION: ['CONVERTED', 'PROPOSAL', 'LOST'],
      CONVERTED: [],
      LOST: ['NEW', 'CONTACTED'],
    };

    const validStatuses = validTransitions[currentStatus] || [];
    return this.statusOptions
      .filter((option) => option.value !== '' && validStatuses.includes(option.value as LeadStatus))
      .map((option) => ({ label: option.label, value: option.value as LeadStatus }));
  }

  /**
   * Obtiene las opciones de estado para el formulario de edición
   */
  getStatusOptionsForEdit(): { label: string; value: LeadStatus | '' }[] {
    const editingValue = this.editing();
    if (editingValue?._id && editingValue.status) {
      const validStatuses = this.getValidNextStatuses(editingValue.status);
      return [{ label: 'Seleccionar...', value: '' }, ...validStatuses];
    }
    return this.statusOptions.filter((s) => s.value !== '');
  }

  /**
   * Wrapper para actualizar el estado del lead desde el template
   */
  onStatusChange(newStatus: LeadStatus | string | Event) {
    // Si es un Event, extraer el valor del target
    let statusValue: LeadStatus;
    if (newStatus instanceof Event) {
      const target = newStatus.target as HTMLSelectElement;
      statusValue = target.value as LeadStatus;
    } else {
      statusValue = newStatus as LeadStatus;
    }

    const lead = this.viewingLead();
    if (!lead || !lead._id) return;
    this.updateLeadStatus(lead, statusValue);
  }

  /**
   * Actualiza el estado del lead con validación de transición
   */
  updateLeadStatus(lead: Lead, newStatus: LeadStatus) {
    if (!lead._id) return;

    if (!this.isValidStatusTransition(lead.status, newStatus)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Transición inválida',
        detail: `No se puede cambiar de ${this.getStatusLabel(lead.status)} a ${this.getStatusLabel(
          newStatus,
        )}`,
      });
      return;
    }

    this.leadsApi.updateStatus(lead._id, newStatus).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Estado actualizado correctamente',
        });
        this.load();
        if (this.viewingLead()?._id === lead._id && lead._id) {
          this.leadsApi.getById(lead._id).subscribe({
            next: (updatedLead) => {
              this.viewingLead.set(updatedLead);
              this.loadFollowUps(lead._id);
            },
          });
        }
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

  /**
   * Abre el diálogo para crear un nuevo seguimiento desde el lead actual
   */
  openFollowUpDialog() {
    const lead = this.viewingLead();
    if (!lead?._id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No hay un lead seleccionado',
      });
      return;
    }

    // Redirigir a la página de seguimientos con el leadId pre-seleccionado
    this.router.navigate(['/follow-ups'], {
      queryParams: { leadId: lead._id, action: 'new' },
    });

    // Cerrar el modal de detalles
    this.showDetailsDialog.set(false);
  }

  /**
   * Normaliza un valor a array (para compatibilidad con datos que pueden ser string o array)
   */
  normalizeToArray(value: string | string[] | undefined | null): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  }

  /**
   * Abre el modal de fotos
   */
  openPhotoModal(photos: string[], currentIndex = 0): void {
    this.photoModalUrls.set(photos);
    this.photoModalCurrentIndex.set(currentIndex);
    this.showPhotoModal.set(true);
  }

  /**
   * Cierra el modal de fotos
   */
  closePhotoModal(): void {
    this.showPhotoModal.set(false);
    this.photoModalUrls.set([]);
    this.photoModalCurrentIndex.set(0);
  }

  /**
   * Navega a la foto anterior
   */
  previousPhoto(): void {
    const current = this.photoModalCurrentIndex();
    if (current > 0) {
      this.photoModalCurrentIndex.set(current - 1);
    }
  }

  /**
   * Navega a la foto siguiente
   */
  nextPhoto(): void {
    const current = this.photoModalCurrentIndex();
    const urls = this.photoModalUrls();
    if (current < urls.length - 1) {
      this.photoModalCurrentIndex.set(current + 1);
    }
  }
}
