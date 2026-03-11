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
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { FileUploadModule } from 'primeng/fileupload';
import { CompaniesApiService } from '../../shared/services/companies-api.service';
import { AuthService } from '../../pages/login/services/auth.service';
import { MenuService } from '../../shared/services/menu.service';
import { ApisPeruApiService } from '../../shared/services/apisperu-api.service';
import {
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  CompanyQueryParams,
} from '../../shared/interfaces/company.interface';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

/**
 * Componente para la gestión de Empresas de Momentum
 * Principio de Responsabilidad Única: Solo maneja la UI y coordinación para empresas de Momentum
 */
@Component({
  selector: 'app-companies-crm',
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
    CheckboxModule,
    TextareaModule,
    TagModule,
    FileUploadModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './companies-crm.html',
  styleUrls: ['./companies-crm.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompaniesCrmPage implements OnInit {
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly auth = inject(AuthService);
  private readonly menuService = inject(MenuService);
  private readonly apisPeruService = inject(ApisPeruApiService);

  // Subject para manejar la autocompletación de taxId
  private readonly taxIdSubject = new Subject<string>();

  // Verificar si el usuario tiene permiso de edición para este módulo
  readonly canEdit = computed(() => this.menuService.canEdit('/companies-crm'));

  // Signals
  items = signal<Company[]>([]);
  query = signal<string>('');
  isActiveFilter = signal<boolean | null>(null);
  showDialog = signal<boolean>(false);
  showDetailsDialog = signal<boolean>(false);
  editing = signal<Partial<Company> | null>(null);
  viewingCompany = signal<Company | null>(null);
  expandedRows = signal<Set<string>>(new Set());
  /** Archivo de logo seleccionado para subir (no enviado aún) */
  selectedLogoFile = signal<File | null>(null);
  /** Vista previa del logo (data URL o URL existente) */
  logoPreviewUrl = signal<string | null>(null);
  /** Indica si se está arrastrando un archivo sobre la zona de logo */
  isLogoDropActive = signal<boolean>(false);

  ngOnInit() {
    this.load();
    this.setupTaxIdAutocomplete();
  }

  constructor() {
    effect(() => {
      if (!this.showDialog()) {
        this.editing.set(null);
      }
    });

    effect(() => {
      if (!this.showDetailsDialog()) {
        this.viewingCompany.set(null);
      }
    });
  }

  /**
   * Configura la autocompletación cuando se ingresa un taxId
   */
  private setupTaxIdAutocomplete(): void {
    this.taxIdSubject
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

        // Autocompletar según el tipo de respuesta (siempre rellenar con nueva consulta)
        if ('nombreCompleto' in response || 'nombres' in response) {
          // Es DNI
          const dniResponse = response as any;
          const nombreCompleto =
            dniResponse.nombreCompleto ||
            `${dniResponse.nombres} ${dniResponse.apellidoPaterno} ${dniResponse.apellidoMaterno}`.trim();

          this.editing.set({
            ...current,
            name: nombreCompleto,
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

          // Obtener teléfono si está disponible
          const telefono =
            rucResponse.telefonos && rucResponse.telefonos.length > 0
              ? rucResponse.telefonos[0]
              : undefined;

          // Construir descripción con información adicional
          let descripcion: string | undefined = undefined;
          if (rucResponse.estado || rucResponse.condicion) {
            const partesDesc = [];
            if (rucResponse.estado) partesDesc.push(`Estado: ${rucResponse.estado}`);
            if (rucResponse.condicion) partesDesc.push(`Condición: ${rucResponse.condicion}`);
            if (rucResponse.tipo) partesDesc.push(`Tipo: ${rucResponse.tipo}`);
            descripcion = partesDesc.join(' | ');
          }

          this.editing.set({
            ...current,
            name: rucResponse.razonSocial || rucResponse.nombreComercial || current.name || '',
            address: direccionCompleta || current.address,
            phone: telefono || current.phone,
            description: descripcion || current.description,
          });
        }
      });
  }

  load() {
    const params: CompanyQueryParams = {};
    if (this.query()) params.search = this.query();
    if (this.isActiveFilter() !== null) params.isActive = this.isActiveFilter()!;

    this.companiesApi.list(params).subscribe({
      next: (companies) => {
        const user = this.auth.getCurrentUser();
        if (!user || typeof user !== 'object' || !('tenantIds' in user)) {
          this.items.set(companies);
          return;
        }
        const tenantIds = (user as { tenantIds?: string[] }).tenantIds;
        const filtered =
          !tenantIds || tenantIds.length === 0
            ? companies
            : (companies || []).filter((c: { _id?: string }) => c._id && tenantIds.includes(c._id));
        this.items.set(filtered);
      },
      error: (error) => {
        console.error('Error loading companies:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar las empresas',
        });
      },
    });
  }

  setQuery(value: string) {
    this.query.set(value);
    this.load();
  }

  setIsActiveFilter(value: boolean | null) {
    this.isActiveFilter.set(value);
    this.load();
  }

  clearFilters() {
    this.query.set('');
    this.isActiveFilter.set(null);
    this.load();
  }

  newItem() {
    this.selectedLogoFile.set(null);
    this.logoPreviewUrl.set(null);
    this.editing.set({
      name: '',
      code: '',
      taxId: '',
      description: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      logo: '',
      isActive: true,
    });
    this.showDialog.set(true);
  }

  editItem(item: Company) {
    this.selectedLogoFile.set(null);
    this.logoPreviewUrl.set(item.logo || null);
    this.editing.set({ ...item });
    this.showDialog.set(true);
  }

  viewDetails(item: Company) {
    this.viewingCompany.set(item);
    this.showDetailsDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
    this.selectedLogoFile.set(null);
    this.logoPreviewUrl.set(null);
  }

  onLogoSelect(event: { files: File[] }) {
    const file = event.files?.[0];
    if (file) this.applyLogoFile(file);
  }

  private applyLogoFile(file: File): void {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formato no permitido',
        detail: 'Use JPG, PNG, GIF o WebP.',
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Archivo muy grande',
        detail: 'El logo no debe superar 2 MB.',
      });
      return;
    }
    this.selectedLogoFile.set(file);
    const reader = new FileReader();
    reader.onload = () => this.logoPreviewUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  onLogoDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isLogoDropActive.set(true);
  }

  onLogoDragLeave(_event: DragEvent): void {
    this.isLogoDropActive.set(false);
  }

  onLogoDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isLogoDropActive.set(false);
    const files = event.dataTransfer?.files;
    if (!files?.length) return;
    const file = files[0];
    if (file.type.startsWith('image/')) {
      this.applyLogoFile(file);
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formato no permitido',
        detail: 'Arrastra una imagen (JPG, PNG, GIF o WebP).',
      });
    }
  }

  clearLogoSelection() {
    this.selectedLogoFile.set(null);
    const cur = this.editing();
    this.logoPreviewUrl.set(cur?.logo || null);
  }

  closeDetails() {
    this.showDetailsDialog.set(false);
  }

  onEditChange<K extends keyof Company>(key: K, value: Company[K]) {
    const cur = this.editing();
    if (!cur) return;
    this.editing.set({ ...cur, [key]: value });

    // Si se cambió el taxId, disparar la autocompletación
    if (key === 'taxId' && typeof value === 'string') {
      this.taxIdSubject.next(value);
    }
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

    const updatePayload: UpdateCompanyRequest = {
      name: item.name,
      code: item.code,
      taxId: item.taxId,
      description: item.description,
      email: item.email,
      phone: item.phone,
      website: item.website,
      address: item.address,
      isActive: item.isActive,
    };
    const logoFile = this.selectedLogoFile();

    if (item._id) {
      // Actualizar empresa existente
      if (logoFile) {
        this.companiesApi.uploadLogo(item._id, logoFile).subscribe({
          next: () => {
            updatePayload.logo = undefined;
            this.companiesApi.update(item._id!, updatePayload).subscribe({
              next: () => {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Éxito',
                  detail: 'Empresa actualizada correctamente',
                });
                this.closeDialog();
                this.load();
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
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: this.getErrorMessage(error),
            });
          },
        });
      } else {
        updatePayload.logo = item.logo;
        this.companiesApi.update(item._id, updatePayload).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Empresa actualizada correctamente',
            });
            this.closeDialog();
            this.load();
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
    } else {
      // Crear nueva empresa
      const createPayload: CreateCompanyRequest = {
        name: item.name!,
        code: item.code,
        taxId: item.taxId,
        description: item.description,
        email: item.email,
        phone: item.phone,
        website: item.website,
        address: item.address,
        isActive: item.isActive ?? true,
      };
      this.companiesApi.create(createPayload).subscribe({
        next: (company) => {
          if (logoFile && company._id) {
            this.companiesApi.uploadLogo(company._id, logoFile).subscribe({
              next: () => {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Éxito',
                  detail: 'Empresa creada correctamente',
                });
                this.closeDialog();
                this.load();
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
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Empresa creada correctamente',
            });
            this.closeDialog();
            this.load();
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
  }

  remove(item: Company) {
    if (!item._id) return;

    this.confirmationService.confirm({
      message: `¿Estás seguro de que quieres eliminar la empresa "${item.name}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.companiesApi.delete(item._id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Empresa eliminada correctamente',
            });
            this.load();
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

  activate(item: Company) {
    if (!item._id) return;

    this.companiesApi.activate(item._id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Empresa activada correctamente',
        });
        this.load();
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

  deactivate(item: Company) {
    if (!item._id) return;

    this.companiesApi.deactivate(item._id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Empresa desactivada correctamente',
        });
        this.load();
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

  getIsActiveFilterOptions() {
    return [
      { label: 'Todas', value: null },
      { label: 'Activas', value: true },
      { label: 'Inactivas', value: false },
    ];
  }

  private validateForm(item: Partial<Company>): string[] {
    const errors: string[] = [];

    if (!item.name || item.name.trim() === '') {
      errors.push('El nombre de la empresa es requerido');
    }

    if (item.name && (item.name.length < 2 || item.name.length > 120)) {
      errors.push('El nombre debe tener entre 2 y 120 caracteres');
    }

    if (item.email && !this.isValidEmail(item.email)) {
      errors.push('El email no tiene un formato válido');
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
}
