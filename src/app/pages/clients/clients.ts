import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

interface Contact {
    name: string;
    email: string;
    phone?: string;
    area: string;
}

interface Country {
    _id: string;
    codigo: string;
    nombre: string;
    nombreCompleto: string;
    createdAt: string;
    updatedAt: string;
}

interface Province {
    _id: string;
    codigo: string;
    nombre: string;
    paisCodigo: string;
    tipo: string;
    createdAt: string;
    updatedAt: string;
}

interface District {
    _id: string;
    codigo: string;
    nombre: string;
    provinciaCodigo: string;
    paisCodigo: string;
    tipo: string;
    createdAt: string;
    updatedAt: string;
}

interface Ubicacion {
    paisCodigo?: string;
    provinciaCodigo?: string;
    distritoCodigo?: string;
    direccion?: string;
}

interface ClientItem {
    _id?: string;
    name: string;
    taxId?: string;
    ubicacion?: Ubicacion;
    contacts: Contact[];
    documents?: string[];
}

@Component({
    selector: 'app-clients',
    standalone: true,
    imports: [CommonModule, HttpClientModule, FormsModule, ReactiveFormsModule, InputTextModule, ButtonModule, TableModule, DialogModule, SelectModule, TooltipModule],
    templateUrl: './clients.html',
    styleUrls: ['./clients.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientsPage {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl;

    items = signal<ClientItem[]>([]);
    query = signal<string>('');
    showDialog = signal<boolean>(false);
    editing = signal<ClientItem | null>(null);
    showContactsDialog = signal<boolean>(false);
    contactsViewing = signal<Contact[] | null>(null);
    contactsClientName = signal<string>('');

    // Ubicaciones
    countries = signal<Country[]>([]);
    provinces = signal<Province[]>([]);
    districts = signal<District[]>([]);
    selectedCountry = signal<Country | null>(null);
    selectedProvince = signal<Province | null>(null);
    selectedDistrict = signal<District | null>(null);

    ngOnInit() {
        this.load();
        this.loadCountries();
    }

    load() {
        const q = this.query();
        const url = q ? `${this.baseUrl}/clients?q=${encodeURIComponent(q)}` : `${this.baseUrl}/clients`;
        this.http.get<ClientItem[]>(url).subscribe(v => this.items.set(v));
    }

    setQuery(v: string) { this.query.set(v); this.load(); }
    newItem() {
        this.editing.set({ name: '', contacts: [], ubicacion: {} });
        this.showDialog.set(true);
        this.initializeUbicacion();
    }
    editItem(item: ClientItem) {
        this.editing.set({ ...item });
        this.showDialog.set(true);
        this.initializeUbicacion(item.ubicacion);
    }
    closeDialog() { this.showDialog.set(false); this.editing.set(null); }
    onEditChange<K extends keyof ClientItem>(key: K, value: ClientItem[K]) {
        const cur = this.editing(); if (!cur) return;
        this.editing.set({ ...cur, [key]: value });
    }
    save() {
        const item = this.editing(); if (!item) return;
        // Construimos un payload limpio evitando enviar campos prohibidos/solo lectura
        const payload: Pick<ClientItem, 'name' | 'taxId' | 'ubicacion' | 'contacts'> = {
            name: item.name,
            taxId: item.taxId,
            ubicacion: item.ubicacion,
            contacts: (item.contacts ?? []).map(c => ({
                name: c.name,
                email: c.email,
                phone: c.phone,
                area: c.area,
            }))
        };
        const req = item._id
            ? this.http.patch<ClientItem>(`${this.baseUrl}/clients/${item._id}`, payload)
            : this.http.post<ClientItem>(`${this.baseUrl}/clients`, payload);
        req.subscribe(() => { this.closeDialog(); this.load(); });
    }
    remove(item: ClientItem) { this.http.delete(`${this.baseUrl}/clients/${item._id}`).subscribe(() => this.load()); }

    addContact() {
        const cur = this.editing(); if (!cur) return;
        const newContact: Contact = { name: '', email: '', area: '' };
        this.editing.set({ ...cur, contacts: [...cur.contacts, newContact] });
    }

    removeContact(index: number) {
        const cur = this.editing(); if (!cur) return;
        const contacts = [...cur.contacts];
        contacts.splice(index, 1);
        this.editing.set({ ...cur, contacts });
    }

    updateContact(index: number, field: keyof Contact, value: string) {
        const cur = this.editing(); if (!cur) return;
        const contacts = [...cur.contacts];
        contacts[index] = { ...contacts[index], [field]: value };
        this.editing.set({ ...cur, contacts });
    }

    openContacts(item: ClientItem) {
        this.contactsViewing.set(item.contacts ?? []);
        this.contactsClientName.set(item.name);
        this.showContactsDialog.set(true);
    }

    closeContacts() {
        this.showContactsDialog.set(false);
        this.contactsViewing.set(null);
        this.contactsClientName.set('');
    }

    // Métodos para cargar ubicaciones
    loadCountries() {
        this.http.get<Country[]>(`${this.baseUrl}/locations/countries`).subscribe(countries => {
            this.countries.set(countries);
        });
    }

    loadProvinces(countryCode: string) {
        this.http.get<Province[]>(`${this.baseUrl}/locations/countries/${countryCode}/provinces`).subscribe(provinces => {
            this.provinces.set(provinces);
            // Limpiar distritos cuando cambia la provincia
            this.districts.set([]);
            this.selectedDistrict.set(null);
        });
    }

    loadDistricts(provinceCode: string) {
        this.http.get<District[]>(`${this.baseUrl}/locations/provinces/${provinceCode}/districts`).subscribe(districts => {
            this.districts.set(districts);
        });
    }

    // Métodos para manejar selección de ubicaciones
    onCountryChange(country: Country | null) {
        this.selectedCountry.set(country);
        this.selectedProvince.set(null);
        this.selectedDistrict.set(null);
        this.provinces.set([]);
        this.districts.set([]);

        if (country) {
            this.loadProvinces(country.codigo);
        }

        this.updateUbicacion();
    }

    onProvinceChange(province: Province | null) {
        this.selectedProvince.set(province);
        this.selectedDistrict.set(null);
        this.districts.set([]);

        if (province) {
            this.loadDistricts(province.codigo);
        }

        this.updateUbicacion();
    }

    onDistrictChange(district: District | null) {
        this.selectedDistrict.set(district);
        this.updateUbicacion();
    }

    updateUbicacion() {
        const current = this.editing();
        if (!current) return;

        const ubicacion: Ubicacion = {
            paisCodigo: this.selectedCountry()?.codigo,
            provinciaCodigo: this.selectedProvince()?.codigo,
            distritoCodigo: this.selectedDistrict()?.codigo,
            direccion: current.ubicacion?.direccion || ''
        };

        this.editing.set({ ...current, ubicacion });
    }

    onDireccionChange(direccion: string) {
        const current = this.editing();
        if (!current) return;

        const ubicacion = { ...current.ubicacion, direccion };
        this.editing.set({ ...current, ubicacion });
    }

    // Métodos auxiliares para el template
    findCountryByCode(code: string): Country | null {
        return this.countries().find(c => c.codigo === code) || null;
    }

    findProvinceByCode(code: string): Province | null {
        return this.provinces().find(p => p.codigo === code) || null;
    }

    findDistrictByCode(code: string): District | null {
        return this.districts().find(d => d.codigo === code) || null;
    }

    // Métodos para obtener nombres en la tabla
    getCountryName(codigo: string): string {
        const country = this.countries().find(c => c.codigo === codigo);
        return country ? country.nombre : codigo;
    }

    getProvinceName(codigo: string): string {
        const province = this.provinces().find(p => p.codigo === codigo);
        return province ? province.nombre : codigo;
    }

    getDistrictName(codigo: string): string {
        const district = this.districts().find(d => d.codigo === codigo);
        return district ? district.nombre : codigo;
    }

    // Método para inicializar ubicaciones cuando se edita un cliente
    initializeUbicacion(ubicacion?: Ubicacion) {
        if (!ubicacion) {
            this.selectedCountry.set(null);
            this.selectedProvince.set(null);
            this.selectedDistrict.set(null);
            this.provinces.set([]);
            this.districts.set([]);
            return;
        }

        // Buscar país
        const country = this.countries().find(c => c.codigo === ubicacion.paisCodigo);
        if (country) {
            this.selectedCountry.set(country);
            this.loadProvinces(country.codigo);

            // Buscar provincia
            setTimeout(() => {
                const province = this.provinces().find(p => p.codigo === ubicacion.provinciaCodigo);
                if (province) {
                    this.selectedProvince.set(province);
                    this.loadDistricts(province.codigo);

                    // Buscar distrito
                    setTimeout(() => {
                        const district = this.districts().find(d => d.codigo === ubicacion.distritoCodigo);
                        if (district) {
                            this.selectedDistrict.set(district);
                        }
                    }, 100);
                }
            }, 100);
        }
    }
}


