import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { Tooltip } from 'primeng/tooltip';
import { Toast } from 'primeng/toast';
import { Card } from 'primeng/card';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { MessageService } from 'primeng/api';
import { MenuService } from '../../shared/services/menu.service';
import { ApisPeruApiService } from '../../shared/services/apisperu-api.service';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

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

interface ClientStats {
  total: number;
  withLocation: number;
  withoutLocation: number;
  withContacts: number;
}

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputText,
    ButtonModule,
    TableModule,
    Dialog,
    Select,
    Tooltip,
    Toast,
    Card,
    ConfirmDialog,
  ],
  templateUrl: './clients.html',
  styleUrls: ['./clients.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientsPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly menuService = inject(MenuService);
  private readonly apisPeruService = inject(ApisPeruApiService);
  private readonly baseUrl = environment.apiUrl;

  // Subject para manejar la autocompletación de taxId
  private readonly taxIdSubject = new Subject<string>();

  // Verificar si el usuario tiene permiso de edición para este módulo
  readonly canEdit = computed(() => this.menuService.canEdit('/clients'));

  items = signal<ClientItem[]>([]);
  query = signal<string>('');
  locationFilter = signal<string>('');
  showDialog = signal<boolean>(false);
  editing = signal<ClientItem | null>(null);
  showContactsDialog = signal<boolean>(false);
  contactsViewing = signal<Contact[] | null>(null);
  contactsClientName = signal<string>('');
  showStatsDialog = signal<boolean>(false);
  stats = signal<ClientStats | null>(null);
  showDetailsDialog = signal<boolean>(false);
  viewingClient = signal<ClientItem | null>(null);
  expandedRows = signal<Set<string>>(new Set());

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
    this.loadStats();
    this.setupTaxIdAutocomplete();
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
        this.contactsClientName.set('');
      }
    });

    // Efecto para manejar el cierre del diálogo de detalles
    effect(() => {
      if (!this.showDetailsDialog()) {
        this.viewingClient.set(null);
      }
    });
  }

  load() {
    const q = this.query();
    const url = q
      ? `${this.baseUrl}/clients?q=${encodeURIComponent(q)}`
      : `${this.baseUrl}/clients`;
    this.http.get<ClientItem[]>(url).subscribe((v) => this.items.set(v));
  }

  setQuery(v: string) {
    this.query.set(v);
    this.load();
  }
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
  closeDialog() {
    this.showDialog.set(false);
  }
  onEditChange<K extends keyof ClientItem>(key: K, value: ClientItem[K]) {
    const cur = this.editing();
    if (!cur) return;
    this.editing.set({ ...cur, [key]: value });

    // Si se cambió el taxId, disparar la autocompletación
    if (key === 'taxId' && typeof value === 'string') {
      this.taxIdSubject.next(value);
    }
  }

  /**
   * Configura la autocompletación cuando se ingresa un taxId
   */
  private setupTaxIdAutocomplete(): void {
    this.taxIdSubject
      .pipe(
        debounceTime(800),
        distinctUntilChanged(),
        switchMap((taxId) => {
          if (!taxId || taxId.length < 8) {
            return of(null);
          }

          const isValidFormat = /^\d{8}$/.test(taxId) || /^\d{11}$/.test(taxId);
          if (!isValidFormat) {
            return of(null);
          }

          return this.apisPeruService.consultDocument(taxId).pipe(
            catchError((error) => {
              console.warn('No se pudo autocompletar desde APIsPERU:', error);
              return of(null);
            })
          );
        })
      )
      .subscribe((response) => {
        if (!response) return;

        const current = this.editing();
        if (!current) return;

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
          const nombreCompleto = dniResponse.nombreCompleto ||
            `${dniResponse.nombres} ${dniResponse.apellidoPaterno} ${dniResponse.apellidoMaterno}`.trim();

          // Actualizar ubicación con país Perú
          const ubicacion = current.ubicacion || {};
          ubicacion.paisCodigo = 'PE';

          this.editing.set({
            ...current,
            name: nombreCompleto,
            ubicacion,
          });
        } else if ('razonSocial' in response) {
          // Es RUC
          const rucResponse = response as any;

          // Construir dirección completa
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

          // Actualizar ubicación con país Perú y dirección
          const ubicacion = current.ubicacion || {};
          ubicacion.paisCodigo = 'PE';
          if (direccionCompleta) {
            ubicacion.direccion = direccionCompleta;
          }

          this.editing.set({
            ...current,
            name: rucResponse.razonSocial || rucResponse.nombreComercial || current.name || '',
            ubicacion,
          });
        }
      });
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

    // Construimos un payload limpio evitando enviar campos prohibidos/solo lectura
    const payload: Pick<ClientItem, 'name' | 'taxId' | 'ubicacion' | 'contacts'> = {
      name: item.name,
      taxId: item.taxId,
      ubicacion: item.ubicacion,
      contacts: (item.contacts ?? []).map((c) => ({
        name: c.name,
        email: c.email,
        phone: c.phone,
        area: c.area,
      })),
    };

    const req = item._id
      ? this.http.patch<ClientItem>(`${this.baseUrl}/clients/${item._id}`, payload)
      : this.http.post<ClientItem>(`${this.baseUrl}/clients`, payload);

    req.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: item._id ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente',
        });
        this.closeDialog();
        this.load();
        this.loadStats();
      },
      error: (error) => {
        console.error('Error al guardar cliente:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.getErrorMessage(error),
        });
      },
    });
  }
  remove(item: ClientItem) {
    this.http.delete(`${this.baseUrl}/clients/${item._id}`).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Cliente eliminado correctamente',
        });
        this.load();
        this.loadStats();
      },
      error: (error) => {
        console.error('Error al eliminar cliente:', error);
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

  openContacts(item: ClientItem) {
    this.contactsViewing.set(item.contacts ?? []);
    this.contactsClientName.set(item.name);
    this.showContactsDialog.set(true);
  }

  closeContacts() {
    this.showContactsDialog.set(false);
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
        // Limpiar distritos cuando cambia la provincia
        this.districts.set([]);
        this.selectedDistrict.set(null);
      });
  }

  loadDistricts(provinceCode: string) {
    this.http
      .get<District[]>(`${this.baseUrl}/locations/provinces/${provinceCode}/districts`)
      .subscribe((districts) => {
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
    const country = this.countries().find((c) => c.codigo === ubicacion.paisCodigo);
    if (country) {
      this.selectedCountry.set(country);
      this.loadProvinces(country.codigo);

      // Buscar provincia
      setTimeout(() => {
        const province = this.provinces().find((p) => p.codigo === ubicacion.provinciaCodigo);
        if (province) {
          this.selectedProvince.set(province);
          this.loadDistricts(province.codigo);

          // Buscar distrito
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
  private validateForm(item: ClientItem): string[] {
    const errors: string[] = [];

    // Validar nombre del cliente
    if (!item.name || item.name.trim() === '') {
      errors.push('El nombre del cliente es requerido');
    }

    // Validar país (ubicación)
    if (!item.ubicacion?.paisCodigo) {
      errors.push('El país es requerido');
    }

    // Validar dirección si se proporciona
    if (item.ubicacion?.direccion && item.ubicacion.direccion.trim().length < 5) {
      errors.push('La dirección debe tener al menos 5 caracteres');
    }

    // Validar contactos
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

    return errors;
  }

  // Método para validar formato de email
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Método para obtener mensaje de error de la API
  private getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const httpError = error as { error?: { message?: string | string[] }; message?: string };
      if (httpError.error?.message) {
        const message = httpError.error.message;
        if (typeof message === 'string') {
          // Traducir mensajes comunes de validación
          if (
            message.includes('ubicacion.direccion must be longer than or equal to 5 characters')
          ) {
            return 'La dirección debe tener al menos 5 caracteres';
          }
          if (message.includes('name should not be empty')) {
            return 'El nombre del cliente es requerido';
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
          return message;
        }
        if (Array.isArray(message)) {
          return message.join(', ');
        }
      }
      if (
        httpError.error &&
        typeof httpError.error === 'object' &&
        'error' in httpError.error &&
        typeof httpError.error.error === 'string'
      ) {
        return httpError.error.error;
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
   * Actualiza el filtro de ubicación
   */
  setLocationFilter(value: string) {
    this.locationFilter.set(value);
    this.load();
  }

  /**
   * Limpia todos los filtros
   */
  clearFilters() {
    this.query.set('');
    this.locationFilter.set('');
    this.load();
  }

  /**
   * Abre el modal de estadísticas
   */
  openStats() {
    this.showStatsDialog.set(true);
  }

  /**
   * Cierra el modal de estadísticas
   */
  closeStats() {
    this.showStatsDialog.set(false);
  }

  /**
   * Abre el modal de detalles del cliente
   */
  viewDetails(client: ClientItem) {
    this.viewingClient.set(client);
    this.showDetailsDialog.set(true);
  }

  /**
   * Cierra el modal de detalles
   */
  closeDetails() {
    this.showDetailsDialog.set(false);
  }

  /**
   * Carga las estadísticas de clientes
   */
  loadStats() {
    this.http.get<ClientItem[]>(`${this.baseUrl}/clients`).subscribe({
      next: (clients) => {
        const stats: ClientStats = {
          total: clients.length,
          withLocation: clients.filter((client) => client.ubicacion?.paisCodigo).length,
          withoutLocation: clients.filter((client) => !client.ubicacion?.paisCodigo).length,
          withContacts: clients.filter((client) => client.contacts?.length > 0).length,
        };
        this.stats.set(stats);
      },
      error: (error) => {
        console.error('Error cargando estadísticas:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar las estadísticas',
        });
      },
    });
  }

  /**
   * Confirma y elimina un cliente
   */
  confirmDelete(client: ClientItem) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que quieres eliminar el cliente "${client.name}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.remove(client);
      },
    });
  }

  /**
   * Alterna la expansión de una fila del accordion
   */
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

  /**
   * Verifica si una fila está expandida
   */
  isRowExpanded(rowId: string | undefined): boolean {
    if (!rowId) return false;
    return this.expandedRows().has(rowId);
  }
}
