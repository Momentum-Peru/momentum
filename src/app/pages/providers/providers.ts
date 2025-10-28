import { ChangeDetectionStrategy, Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { Tooltip } from 'primeng/tooltip';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
// InputTextarea no está disponible en PrimeNG 20, usaremos InputText con textarea
import { Checkbox } from 'primeng/checkbox';
import { Chip } from 'primeng/chip';
import { Rating } from 'primeng/rating';
import { Tag } from 'primeng/tag';
import { Card } from 'primeng/card';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import {
  ProvidersService,
  Provider,
  ProviderStats,
  ProviderFilters,
  Contact,
  Ubicacion,
} from '../../shared/services/providers.service';

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

@Component({
  selector: 'app-providers',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    InputText,
    ButtonModule,
    TableModule,
    Dialog,
    Select,
    Tooltip,
    Toast,
    Checkbox,
    Chip,
    Rating,
    Tag,
    Card,
  ],
  templateUrl: './providers.html',
  styleUrls: ['./providers.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProvidersPage {
  private readonly providersService = inject(ProvidersService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  items = signal<Provider[]>([]);
  query = signal<string>('');
  selectedService = signal<string>('');
  selectedStatus = signal<boolean | null>(null);
  showDialog = signal<boolean>(false);
  editing = signal<Provider | null>(null);
  showContactsDialog = signal<boolean>(false);
  contactsViewing = signal<Contact[] | null>(null);
  contactsProviderName = signal<string>('');
  showStatsDialog = signal<boolean>(false);
  stats = signal<ProviderStats | null>(null);
  showDetailsDialog = signal<boolean>(false);
  viewingProvider = signal<Provider | null>(null);

  // Ubicaciones
  countries = signal<Country[]>([]);
  provinces = signal<Province[]>([]);
  districts = signal<District[]>([]);
  selectedCountry = signal<Country | null>(null);
  selectedProvince = signal<Province | null>(null);
  selectedDistrict = signal<District | null>(null);

  // Servicios disponibles (se cargan dinámicamente)
  availableServices = signal<string[]>([]);

  ngOnInit() {
    this.load();
    this.loadCountries();
    this.loadStats();
    this.loadAvailableServices();
  }

  constructor() {
    // Efecto para manejar el cierre del diálogo principal
    effect(() => {
      if (!this.showDialog()) {
        this.editing.set(null);
      }
    });

    // Efecto para manejar el cierre del diálogo de contactos
    effect(() => {
      if (!this.showContactsDialog()) {
        this.contactsViewing.set(null);
        this.contactsProviderName.set('');
      }
    });

    // Efecto para manejar el cierre del diálogo de detalles
    effect(() => {
      if (!this.showDetailsDialog()) {
        this.viewingProvider.set(null);
      }
    });
  }

  load() {
    const filters: ProviderFilters = {
      q: this.query() || undefined,
      service: this.selectedService() || undefined,
      isActive: this.selectedStatus() ?? undefined,
    };

    this.providersService.getProviders(filters).subscribe({
      next: (providers) => this.items.set(providers),
      error: (error) => {
        console.error('Error al cargar proveedores:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los proveedores',
        });
      },
    });
  }

  setQuery(v: string) {
    this.query.set(v);
    this.load();
  }

  setService(service: string) {
    this.selectedService.set(service);
    this.load();
  }

  setStatus(status: boolean | null) {
    this.selectedStatus.set(status);
    this.load();
  }

  clearFilters() {
    this.query.set('');
    this.selectedService.set('');
    this.selectedStatus.set(null);
    this.load();
  }

  newItem() {
    this.editing.set({
      name: '',
      contacts: [],
      services: [],
      ubicacion: {},
      isActive: true,
    });
    this.showDialog.set(true);
    this.initializeUbicacion();
  }

  editItem(item: Provider) {
    this.editing.set({ ...item });
    this.showDialog.set(true);
    this.initializeUbicacion(item.ubicacion);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  onEditChange<K extends keyof Provider>(key: K, value: Provider[K]) {
    const cur = this.editing();
    if (!cur) return;
    this.editing.set({ ...cur, [key]: value });
  }

  save() {
    const item = this.editing();
    if (!item) return;

    // Validar campos requeridos
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

    // Construimos un payload limpio
    const payload: Omit<Provider, '_id' | 'createdAt' | 'updatedAt' | 'ubicacionCompleta'> = {
      name: item.name,
      address: item.address,
      taxId: item.taxId,
      ubicacion: item.ubicacion,
      contacts: (item.contacts ?? []).map((c) => ({
        name: c.name,
        email: c.email,
        phone: c.phone,
        area: c.area,
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
          severity: 'success',
          summary: 'Éxito',
          detail: item._id
            ? 'Proveedor actualizado correctamente'
            : 'Proveedor creado correctamente',
        });
        this.closeDialog();
        this.load();
        this.loadStats();
        this.loadAvailableServices();
      },
      error: (error) => {
        console.error('Error al guardar proveedor:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.getErrorMessage(error),
        });
      },
    });
  }

  remove(item: Provider) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que quieres eliminar el proveedor "${item.name}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.providersService.deleteProvider(item._id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Proveedor eliminado correctamente',
            });
            this.load();
            this.loadStats();
            this.loadAvailableServices();
          },
          error: (error) => {
            console.error('Error al eliminar proveedor:', error);
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

  toggleActive(item: Provider) {
    this.providersService.toggleProviderActive(item._id!).subscribe({
      next: (updatedItem) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Proveedor ${updatedItem.isActive ? 'activado' : 'desactivado'} correctamente`,
        });
        this.load();
        this.loadStats();
      },
      error: (error) => {
        console.error('Error al cambiar estado del proveedor:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.getErrorMessage(error),
        });
      },
    });
  }

  updateRating(item: Provider, rating: number) {
    this.providersService.updateProviderRating(item._id!, rating).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Calificación actualizada correctamente',
        });
        this.load();
      },
      error: (error) => {
        console.error('Error al actualizar calificación:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.getErrorMessage(error),
        });
      },
    });
  }

  addContact() {
    const cur = this.editing();
    if (!cur) return;
    const newContact: Contact = { name: '', email: '', area: '' };
    this.editing.set({ ...cur, contacts: [...cur.contacts, newContact] });
  }

  removeContact(index: number) {
    const cur = this.editing();
    if (!cur) return;
    const contacts = [...cur.contacts];
    contacts.splice(index, 1);
    this.editing.set({ ...cur, contacts });
  }

  updateContact(index: number, field: keyof Contact, value: string) {
    const cur = this.editing();
    if (!cur) return;
    const contacts = [...cur.contacts];
    contacts[index] = { ...contacts[index], [field]: value };
    this.editing.set({ ...cur, contacts });
  }

  updateServicesFromText(text: string) {
    const cur = this.editing();
    if (!cur) return;

    // Dividir por comas, limpiar espacios y filtrar vacíos
    const services = text
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    this.editing.set({ ...cur, services });
  }

  addService(service: string) {
    const cur = this.editing();
    if (!cur) return;
    if (!cur.services.includes(service)) {
      this.editing.set({ ...cur, services: [...cur.services, service] });
    }
  }

  removeService(service: string) {
    const cur = this.editing();
    if (!cur) return;
    this.editing.set({ ...cur, services: cur.services.filter((s) => s !== service) });
  }

  openContacts(item: Provider) {
    this.contactsViewing.set(item.contacts ?? []);
    this.contactsProviderName.set(item.name);
    this.showContactsDialog.set(true);
  }

  closeContacts() {
    this.showContactsDialog.set(false);
  }

  openStats() {
    this.showStatsDialog.set(true);
  }

  closeStats() {
    this.showStatsDialog.set(false);
  }

  viewDetails(provider: Provider) {
    this.viewingProvider.set(provider);
    this.showDetailsDialog.set(true);
  }

  closeDetails() {
    this.showDetailsDialog.set(false);
  }

  loadStats() {
    this.providersService.getProviderStats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: (error) => {
        console.error('Error al cargar estadísticas:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar las estadísticas',
        });
      },
    });
  }

  // Métodos para cargar ubicaciones
  loadCountries() {
    this.http.get<Country[]>(`${this.baseUrl}/locations/countries`).subscribe((countries) => {
      this.countries.set(countries);
    });
  }

  loadProvinces(countryCode: string) {
    this.http
      .get<Province[]>(`${this.baseUrl}/locations/countries/${countryCode}/provinces`)
      .subscribe((provinces) => {
        this.provinces.set(provinces);
      });
  }

  loadDistricts(provinceCode: string) {
    this.http
      .get<District[]>(`${this.baseUrl}/locations/provinces/${provinceCode}/districts`)
      .subscribe((districts) => {
        this.districts.set(districts);
      });
  }

  loadAvailableServices() {
    this.providersService.getProviders().subscribe({
      next: (providers) => {
        // Extraer todos los servicios únicos de todos los proveedores
        const allServices = providers.flatMap((provider) => provider.services || []);
        const uniqueServices = [...new Set(allServices)].sort();
        this.availableServices.set(uniqueServices);
      },
      error: (error) => {
        console.error('Error al cargar servicios disponibles:', error);
        // En caso de error, mantener array vacío
        this.availableServices.set([]);
      },
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
      direccion: current.ubicacion?.direccion || '',
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
    return this.countries().find((c) => c.codigo === code) || null;
  }

  findProvinceByCode(code: string): Province | null {
    return this.provinces().find((p) => p.codigo === code) || null;
  }

  findDistrictByCode(code: string): District | null {
    return this.districts().find((d) => d.codigo === code) || null;
  }

  // Métodos para obtener nombres en la tabla
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

  // Método para inicializar ubicaciones cuando se edita un proveedor
  initializeUbicacion(ubicacion?: Ubicacion) {
    if (!ubicacion) {
      this.selectedCountry.set(null);
      this.selectedProvince.set(null);
      this.selectedDistrict.set(null);
      this.provinces.set([]);
      this.districts.set([]);
      return;
    }

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
            if (district) {
              this.selectedDistrict.set(district);
            }
          }, 100);
        }
      }, 100);
    }
  }

  // Método para validar el formulario
  private validateForm(item: Provider): string[] {
    const errors: string[] = [];

    if (!item.name || item.name.trim() === '') {
      errors.push('El nombre del proveedor es requerido');
    }

    if (!item.ubicacion?.paisCodigo) {
      errors.push('El país es requerido');
    }

    if (item.ubicacion?.direccion && item.ubicacion.direccion.trim().length < 5) {
      errors.push('La dirección debe tener al menos 5 caracteres');
    }

    if (!item.contacts || item.contacts.length === 0) {
      errors.push('Debe agregar al menos un contacto');
    } else {
      item.contacts.forEach((contact, index) => {
        if (!contact.name || contact.name.trim() === '') {
          errors.push(`El nombre del contacto ${index + 1} es requerido`);
        }
        if (!contact.email || contact.email.trim() === '') {
          errors.push(`El email del contacto ${index + 1} es requerido`);
        } else if (!this.isValidEmail(contact.email)) {
          errors.push(`El email del contacto ${index + 1} no tiene un formato válido`);
        }
        if (!contact.area || contact.area.trim() === '') {
          errors.push(`El área del contacto ${index + 1} es requerida`);
        }
      });
    }

    if (!item.services || item.services.length === 0) {
      errors.push('Debe seleccionar al menos un tipo de servicio');
    }

    if (item.rating && (item.rating < 1 || item.rating > 5)) {
      errors.push('La calificación debe estar entre 1 y 5');
    }

    return errors;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private getErrorMessage(error: any): string {
    if (error.error?.message) {
      const message = error.error.message;

      if (message.includes('ubicacion.direccion must be longer than or equal to 5 characters')) {
        return 'La dirección debe tener al menos 5 caracteres';
      }
      if (message.includes('name should not be empty')) {
        return 'El nombre del proveedor es requerido';
      }
      if (message.includes('contacts should not be empty')) {
        return 'Debe agregar al menos un contacto';
      }
      if (message.includes('email must be an email')) {
        return 'El formato del email no es válido';
      }
      if (message.includes('paisCodigo should not be empty')) {
        return 'El país es requerido';
      }
      if (message.includes('services should not be empty')) {
        return 'Debe seleccionar al menos un tipo de servicio';
      }
      if (message.includes('website must be a URL')) {
        return 'El sitio web debe tener un formato válido';
      }
      if (message.includes('rating must not be less than 1')) {
        return 'La calificación debe ser mayor o igual a 1';
      }
      if (message.includes('rating must not be greater than 5')) {
        return 'La calificación debe ser menor o igual a 5';
      }
      if (message.includes('description must be longer than or equal to 10 characters')) {
        return 'La descripción debe tener al menos 10 caracteres';
      }

      return message;
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
