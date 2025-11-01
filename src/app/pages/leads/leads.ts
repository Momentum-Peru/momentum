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
import { TagModule } from 'primeng/tag';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { LeadsApiService } from '../../shared/services/leads-api.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import { UserOption } from '../../shared/interfaces/menu-permission.interface';
import { ClientsApiService, ClientOption } from '../../shared/services/clients-api.service';
import {
    Lead,
    LeadStatus,
    LeadSource,
    LeadContact,
    LeadCompany,
    LeadLocation,
    LeadStatistics,
} from '../../shared/interfaces/lead.interface';

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
    ],
    providers: [ConfirmationService, MessageService],
    templateUrl: './leads.html',
    styleUrls: ['./leads.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeadsPage implements OnInit {
    private readonly leadsApi = inject(LeadsApiService);
    private readonly usersApi = inject(UsersApiService);
    private readonly clientsApi = inject(ClientsApiService);
    private readonly messageService = inject(MessageService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl;

    // Signals
    items = signal<Lead[]>([]);
    query = signal<string>('');
    statusFilter = signal<LeadStatus | ''>('');
    sourceFilter = signal<LeadSource | ''>('');
    assignedToFilter = signal<string>('');
    showDialog = signal<boolean>(false);
    showStatsDialog = signal<boolean>(false);
    showDetailsDialog = signal<boolean>(false);
    showConvertDialog = signal<boolean>(false);
    editing = signal<Partial<Lead> | null>(null);
    viewingLead = signal<Lead | null>(null);
    convertingLead = signal<Lead | null>(null);
    stats = signal<LeadStatistics | null>(null);
    expandedRows = signal<Set<string>>(new Set());

    // Selectores
    users = signal<UserOption[]>([]);
    clients = signal<ClientOption[]>([]);
    countries = signal<Country[]>([]);
    provinces = signal<Province[]>([]);
    districts = signal<District[]>([]);
    selectedCountry = signal<Country | null>(null);
    selectedProvince = signal<Province | null>(null);
    selectedDistrict = signal<District | null>(null);

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

    statusColors: Record<LeadStatus, 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'> = {
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
        this.loadCountries();
        this.loadStats();
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
        const params: any = {};
        if (this.query()) params.search = this.query();
        if (this.statusFilter()) params.status = this.statusFilter();
        if (this.sourceFilter()) params.source = this.sourceFilter();
        if (this.assignedToFilter()) params.assignedTo = this.assignedToFilter();

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

    clearFilters() {
        this.query.set('');
        this.statusFilter.set('');
        this.sourceFilter.set('');
        this.assignedToFilter.set('');
        this.load();
        this.loadStats();
    }

    newItem() {
        this.editing.set({
            name: '',
            contact: { name: '', email: '' },
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

        const payload: any = {
            name: item.name,
            contact: item.contact,
            company: item.company,
            location: item.location,
            status: item.status,
            source: item.source,
            estimatedValue: item.estimatedValue,
            notes: item.notes,
            assignedTo: item.assignedTo,
        };

        const req = item._id
            ? this.leadsApi.update(item._id, payload)
            : this.leadsApi.create(payload);

        req.subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: item._id ? 'Lead actualizado correctamente' : 'Lead creado correctamente',
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

    getUserName(id: string): string {
        const user = this.users().find((u) => u._id === id);
        return user ? user.name : id;
    }

    getStatusLabel(status: LeadStatus): string {
        const option = this.statusOptions.find((o) => o.value === status);
        return option ? option.label : status;
    }

    getStatusSeverity(status: LeadStatus): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
        return this.statusColors[status] || 'info';
    }

    getClientFilterOptions() {
        return [{ label: 'Todos', value: '' }, ...this.clients().map(c => ({ label: c.name, value: c._id }))];
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

        return errors;
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    private getErrorMessage(error: any): string {
        if (error.error?.message) {
            return error.error.message;
        }
        if (error.error?.error) {
            return error.error.error;
        }
        if (error.message) {
            return error.message;
        }
        return 'Ha ocurrido un error inesperado';
    }
}

