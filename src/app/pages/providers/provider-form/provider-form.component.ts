import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { RatingModule } from 'primeng/rating';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import {
    ProvidersService,
    Provider,
    Contact,
    Ubicacion,
} from '../../../shared/services/providers.service';
import { ApisPeruApiService } from '../../../shared/services/apisperu-api.service';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

interface Country { _id: string; codigo: string; nombre: string; }
interface Province { _id: string; codigo: string; nombre: string; paisCodigo: string; }
interface District { _id: string; codigo: string; nombre: string; provinciaCodigo: string; }

@Component({
    selector: 'app-provider-form',
    standalone: true,
    imports: [
        CommonModule, FormsModule, ReactiveFormsModule, InputTextModule, ButtonModule,
        Select, CheckboxModule, ChipModule, RatingModule, CardModule, ToastModule, TooltipModule
    ],
    templateUrl: './provider-form.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderFormComponent implements OnInit {
    private readonly providersService = inject(ProvidersService);
    private readonly messageService = inject(MessageService);
    private readonly apisPeruService = inject(ApisPeruApiService);
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly baseUrl = environment.apiUrl;

    private readonly taxIdSubject = new Subject<string>();

    editing = signal<Provider>({
        name: '',
        contacts: [],
        services: [],
        ubicacion: {},
        isActive: true,
    });

    isEditMode = signal<boolean>(false);

    countries = signal<Country[]>([]);
    provinces = signal<Province[]>([]);
    districts = signal<District[]>([]);
    selectedCountry = signal<Country | null>(null);
    selectedProvince = signal<Province | null>(null);
    selectedDistrict = signal<District | null>(null);

    docTypes = signal<any[]>([
        { label: 'RUC', value: 'RUC' },
        { label: 'DNI', value: 'DNI' },
        { label: 'CE', value: 'CE' },
        { label: 'Pasaporte', value: 'Pasaporte' }
    ]);

    ngOnInit() {
        this.loadCountries();
        this.setupTaxIdAutocomplete();

        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.isEditMode.set(true);
                // Load the provider
                this.providersService.getProviders({}).subscribe({
                    next: (providers) => {
                        const provider = providers.find(p => p._id === id);
                        if (provider) {
                            this.editing.set(provider);
                            this.initializeUbicacion(provider.ubicacion);
                        } else {
                            this.goBack();
                        }
                    },
                    error: () => this.goBack()
                });
            }
        });
    }

    onEditChange<K extends keyof Provider>(key: K, value: Provider[K]) {
        const cur = this.editing();
        if (!cur) return;
        this.editing.set({ ...cur, [key]: value });

        if (key === 'taxId' && typeof value === 'string') {
            this.taxIdSubject.next(value);
        }
    }

    private setupTaxIdAutocomplete(): void {
        this.taxIdSubject
            .pipe(
                debounceTime(800),
                distinctUntilChanged(),
                switchMap((taxId) => {
                    if (!taxId || taxId.length < 8) return of(null);
                    const isValidFormat = /^\d{8}$/.test(taxId) || /^\d{11}$/.test(taxId);
                    if (!isValidFormat) return of(null);

                    return this.apisPeruService.consultDocument(taxId).pipe(
                        catchError(() => of(null))
                    );
                })
            )
            .subscribe((response) => {
                if (!response) return;

                const current = this.editing();
                if (!current) return;

                const peruCountry = this.countries().find((c) => c.codigo === 'PE');
                if (peruCountry && !this.selectedCountry()) {
                    this.selectedCountry.set(peruCountry);
                    this.loadProvinces('PE');
                }

                if ('nombreCompleto' in response || 'nombres' in response) {
                    const dniResponse = response as any;
                    const nombreCompleto = dniResponse.nombreCompleto ||
                        `${dniResponse.nombres} ${dniResponse.apellidoPaterno} ${dniResponse.apellidoMaterno}`.trim();

                    const ubicacion = current.ubicacion || {};
                    ubicacion.paisCodigo = 'PE';

                    this.editing.set({ ...current, name: nombreCompleto, ubicacion });
                } else if ('razonSocial' in response) {
                    const rucResponse = response as any;
                    let direccionCompleta: string | undefined = undefined;
                    if (rucResponse.direccion) {
                        const partesDireccion = [
                            rucResponse.direccion, rucResponse.distrito, rucResponse.provincia, rucResponse.departamento,
                        ].filter(Boolean);
                        direccionCompleta = partesDireccion.join(', ') || rucResponse.direccion;
                    }

                    const telefono = rucResponse.telefonos && rucResponse.telefonos.length > 0 ? rucResponse.telefonos[0] : undefined;
                    let descripcion: string | undefined = undefined;

                    if (rucResponse.estado || rucResponse.condicion) {
                        const partesDesc = [];
                        if (rucResponse.estado) partesDesc.push(`Estado: ${rucResponse.estado}`);
                        if (rucResponse.condicion) partesDesc.push(`Condición: ${rucResponse.condicion}`);
                        if (rucResponse.tipo) partesDesc.push(`Tipo: ${rucResponse.tipo}`);
                        descripcion = partesDesc.join(' | ');
                    }

                    const ubicacion = current.ubicacion || {};
                    ubicacion.paisCodigo = 'PE';
                    if (direccionCompleta) {
                        ubicacion.direccion = direccionCompleta;
                    }

                    this.editing.set({
                        ...current,
                        name: rucResponse.razonSocial || rucResponse.nombreComercial || current.name || '',
                        address: direccionCompleta || current.address,
                        description: descripcion || current.description,
                        website: rucResponse.website || current.website,
                        ubicacion,
                        contacts: current.contacts && current.contacts.length > 0
                            ? current.contacts.map((c, i) => i === 0 && telefono ? { ...c, phone: telefono } : c)
                            : telefono ? [{ name: '', email: '', phone: telefono, area: '' }] : current.contacts || [],
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
                this.messageService.add({ severity: 'error', summary: 'Error de validación', detail: error });
            });
            return;
        }

        const payload: Omit<Provider, '_id' | 'createdAt' | 'updatedAt' | 'ubicacionCompleta'> = {
            name: item.name,
            address: item.address,
            taxIdType: item.taxIdType,
            taxId: item.taxId,
            ubicacion: item.ubicacion,
            contacts: (item.contacts ?? []).map((c) => ({
                name: c.name, email: c.email, phone: c.phone, area: c.area,
            })),
            description: item.description,
            services: item.services,
            website: item.website,
            rating: item.rating,
            isActive: item.isActive,
        };

        const req = item._id
            ? this.providersService.updateProvider(item._id, payload)
            : this.providersService.createProvider(payload);

        req.subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success', summary: 'Éxito',
                    detail: item._id ? 'Proveedor actualizado' : 'Proveedor creado',
                });
                setTimeout(() => this.goBack(), 1000);
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error', summary: 'Error',
                    detail: 'Error al guardar el proveedor. ' + (error.error?.message || ''),
                });
            },
        });
    }

    goBack() {
        this.router.navigate(['/providers']);
    }

    addContact() {
        const cur = this.editing();
        this.editing.set({ ...cur, contacts: [...cur.contacts, { name: '', email: '', area: '' }] });
    }

    removeContact(index: number) {
        const cur = this.editing();
        const contacts = [...cur.contacts];
        contacts.splice(index, 1);
        this.editing.set({ ...cur, contacts });
    }

    updateContact(index: number, field: keyof Contact, value: string) {
        const cur = this.editing();
        const contacts = [...cur.contacts];
        contacts[index] = { ...contacts[index], [field]: value };
        this.editing.set({ ...cur, contacts });
    }

    updateServicesFromText(text: string) {
        const cur = this.editing();
        const services = text.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
        this.editing.set({ ...cur, services });
    }

    updateMetric(metric: string, value: number) {
        const cur = this.editing();
        this.editing.set({
            ...cur,
            metrics: { ...(cur.metrics || {}), [metric]: value }
        });
    }

    loadCountries() {
        this.http.get<Country[]>(`${this.baseUrl}/locations/countries`).subscribe((c) => this.countries.set(c));
    }

    loadProvinces(countryCode: string) {
        this.http.get<Province[]>(`${this.baseUrl}/locations/countries/${countryCode}/provinces`).subscribe((p) => this.provinces.set(p));
    }

    loadDistricts(provinceCode: string) {
        this.http.get<District[]>(`${this.baseUrl}/locations/provinces/${provinceCode}/districts`).subscribe((d) => this.districts.set(d));
    }

    onCountryChange(country: Country | null) {
        this.selectedCountry.set(country);
        this.selectedProvince.set(null);
        this.selectedDistrict.set(null);
        this.provinces.set([]);
        this.districts.set([]);
        if (country) this.loadProvinces(country.codigo);
        this.updateUbicacion();
    }

    onProvinceChange(province: Province | null) {
        this.selectedProvince.set(province);
        this.selectedDistrict.set(null);
        this.districts.set([]);
        if (province) this.loadDistricts(province.codigo);
        this.updateUbicacion();
    }

    onDistrictChange(district: District | null) {
        this.selectedDistrict.set(district);
        this.updateUbicacion();
    }

    updateUbicacion() {
        const current = this.editing();
        this.editing.set({
            ...current, ubicacion: {
                paisCodigo: this.selectedCountry()?.codigo,
                provinciaCodigo: this.selectedProvince()?.codigo,
                distritoCodigo: this.selectedDistrict()?.codigo,
                direccion: current.ubicacion?.direccion || '',
            }
        });
    }

    onDireccionChange(direccion: string) {
        const current = this.editing();
        this.editing.set({ ...current, ubicacion: { ...current.ubicacion, direccion } });
    }

    findCountryByCode(code: string): Country | null { return this.countries().find((c) => c.codigo === code) || null; }
    findProvinceByCode(code: string): Province | null { return this.provinces().find((p) => p.codigo === code) || null; }
    findDistrictByCode(code: string): District | null { return this.districts().find((d) => d.codigo === code) || null; }

    initializeUbicacion(ubicacion?: Ubicacion) {
        if (!ubicacion) return;
        const country = this.countries().find((c) => c.codigo === ubicacion.paisCodigo);
        if (country) {
            this.selectedCountry.set(country);
            this.loadProvinces(country.codigo);
            setTimeout(() => {
                const province = this.provinces().find((p) => p.codigo === ubicacion.provinciaCodigo);
                if (province) {
                    this.selectedProvince.set(province);
                    this.loadDistricts(province.codigo);
                    setTimeout(() => {
                        const district = this.districts().find((d) => d.codigo === ubicacion.distritoCodigo);
                        if (district) this.selectedDistrict.set(district);
                    }, 100);
                }
            }, 100);
        }
    }

    private validateForm(item: Provider): string[] {
        const errors: string[] = [];
        if (!item.name || item.name.trim() === '') errors.push('El nombre del proveedor es requerido');
        if (!item.ubicacion?.paisCodigo) errors.push('El país es requerido');
        if (item.ubicacion?.direccion && item.ubicacion.direccion.trim().length < 5) errors.push('La dirección debe tener al menos 5 caracteres');
        if (!item.contacts || item.contacts.length === 0) errors.push('Debe agregar al menos un contacto');
        else {
            item.contacts.forEach((contact, index) => {
                if (!contact.name || contact.name.trim() === '') errors.push(`El nombre del contacto ${index + 1} es requerido`);
                if (!contact.email || contact.email.trim() === '') errors.push(`El email del contacto ${index + 1} es requerido`);
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) errors.push(`El email del contacto ${index + 1} no tiene un formato válido`);
                if (!contact.area || contact.area.trim() === '') errors.push(`El área del contacto ${index + 1} es requerida`);
            });
        }
        if (!item.services || item.services.length === 0) errors.push('Debe seleccionar al menos un tipo de servicio');
        if (item.rating && (item.rating < 1 || item.rating > 5)) errors.push('La calificación debe estar entre 1 y 5');
        return errors;
    }
}
