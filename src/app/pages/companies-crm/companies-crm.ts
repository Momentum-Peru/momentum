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
import { CrmCompaniesApiService } from '../../shared/services/crm-companies-api.service';
import { MenuService } from '../../shared/services/menu.service';
import { ApisPeruApiService } from '../../shared/services/apisperu-api.service';
import {
  CrmCompany,
  CreateCrmCompanyRequest,
  UpdateCrmCompanyRequest,
  CompanyQueryParams,
} from '../../shared/interfaces/company.interface';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

/**
 * Empresas del CRM (colección propia; no confundir con `/companies` de la plataforma).
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
  private readonly crmCompaniesApi = inject(CrmCompaniesApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly menuService = inject(MenuService);
  private readonly apisPeruService = inject(ApisPeruApiService);

  // Subject para manejar la autocompletación de taxId
  private readonly taxIdSubject = new Subject<string>();

  // Verificar si el usuario tiene permiso de edición para este módulo
  readonly canEdit = computed(() => this.menuService.canEdit('/companies-crm'));

  // Signals
  items = signal<CrmCompany[]>([]);
  query = signal<string>('');
  isActiveFilter = signal<boolean | null>(null);
  showDialog = signal<boolean>(false);
  showDetailsDialog = signal<boolean>(false);
  editing = signal<Partial<CrmCompany> | null>(null);
  viewingCompany = signal<CrmCompany | null>(null);
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
          if (!taxId || taxId.length < 11) {
            return of(null);
          }

          const isRuc = /^\d{11}$/.test(taxId);
          if (!isRuc) {
            return of(null);
          }

          return this.apisPeruService.consultDocument(taxId).pipe(
            catchError((error) => {
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

        if ('razonSocial' in response) {
          const rucResponse = response as {
            razonSocial?: string;
            nombreComercial?: string;
            direccion?: string;
            distrito?: string;
            provincia?: string;
            departamento?: string;
            telefonos?: string[];
            estado?: string;
            condicion?: string;
            tipo?: string;
          };

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

          const telefono =
            rucResponse.telefonos && rucResponse.telefonos.length > 0
              ? rucResponse.telefonos[0]
              : undefined;

          let descripcion: string | undefined = undefined;
          if (rucResponse.estado || rucResponse.condicion) {
            const partesDesc: string[] = [];
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

    this.crmCompaniesApi.list(params).subscribe({
      next: (companies) => {
        this.items.set(companies ?? []);
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

  editItem(item: CrmCompany) {
    this.selectedLogoFile.set(null);
    this.logoPreviewUrl.set(item.logo || null);
    this.editing.set({ ...item });
    this.showDialog.set(true);
  }

  viewDetails(item: CrmCompany) {
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

  onEditChange<K extends keyof CrmCompany>(key: K, value: CrmCompany[K]) {
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

    const updatePayload = this.buildUpdatePayload(item);
    const logoFile = this.selectedLogoFile();

    if (item._id) {
      // Actualizar empresa existente
      if (logoFile) {
        this.crmCompaniesApi.uploadLogo(item._id, logoFile).subscribe({
          next: () => {
            const patch = { ...updatePayload };
            delete patch.logo;
            this.crmCompaniesApi.update(item._id!, patch).subscribe({
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
        const patch = { ...updatePayload };
        const logoUrl = this.trimOrUndefined(item.logo);
        if (logoUrl !== undefined) {
          patch.logo = logoUrl;
        }
        this.crmCompaniesApi.update(item._id, patch).subscribe({
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
      const createPayload = this.buildCreatePayload(item);
      this.crmCompaniesApi.create(createPayload).subscribe({
        next: (company) => {
          if (logoFile && company._id) {
            this.crmCompaniesApi.uploadLogo(company._id, logoFile).subscribe({
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

  remove(item: CrmCompany) {
    if (!item._id) return;

    this.confirmationService.confirm({
      message: `¿Estás seguro de que quieres eliminar la empresa "${item.name}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.crmCompaniesApi.delete(item._id!).subscribe({
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

  activate(item: CrmCompany) {
    if (!item._id) return;

    this.crmCompaniesApi.activate(item._id).subscribe({
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

  deactivate(item: CrmCompany) {
    if (!item._id) return;

    this.crmCompaniesApi.deactivate(item._id).subscribe({
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

  private validateForm(item: Partial<CrmCompany>): string[] {
    const errors: string[] = [];

    if (!item.name || item.name.trim() === '') {
      errors.push('El nombre de la empresa es requerido');
    }

    if (item.name && (item.name.length < 2 || item.name.length > 120)) {
      errors.push('El nombre debe tener entre 2 y 120 caracteres');
    }

    const ruc = item.taxId?.trim() ?? '';
    if (!ruc) {
      errors.push('El RUC es obligatorio');
    } else if (!/^\d{11}$/.test(ruc)) {
      errors.push('El RUC debe tener exactamente 11 dígitos');
    }

    const email = this.trimOrUndefined(item.email);
    if (email !== undefined && !this.isValidEmail(email)) {
      errors.push('El email no tiene un formato válido');
    }

    const phone = this.trimOrUndefined(item.phone);
    if (phone !== undefined && (phone.length < 5 || phone.length > 20)) {
      errors.push('Si ingresa teléfono, debe tener entre 5 y 20 caracteres');
    }

    const website = this.trimOrUndefined(item.website);
    if (website !== undefined && (website.length < 5 || website.length > 200)) {
      errors.push('Si ingresa sitio web, debe tener entre 5 y 200 caracteres');
    }

    const address = this.trimOrUndefined(item.address);
    if (address !== undefined && (address.length < 5 || address.length > 200)) {
      errors.push('Si ingresa dirección, debe tener entre 5 y 200 caracteres');
    }

    const description = this.trimOrUndefined(item.description);
    if (description !== undefined && description.length > 500) {
      errors.push('La descripción no puede exceder 500 caracteres');
    }

    return errors;
  }

  /**
   * Solo obligatorios: nombre y RUC. El resto se envía solo si tiene texto (evita "" en el API).
   */
  private buildCreatePayload(item: Partial<CrmCompany>): CreateCrmCompanyRequest {
    const payload: CreateCrmCompanyRequest = {
      name: item.name!.trim(),
      taxId: item.taxId!.trim(),
      isActive: item.isActive ?? true,
    };
    const d = this.trimOrUndefined(item.description);
    if (d !== undefined) payload.description = d;
    const e = this.trimOrUndefined(item.email);
    if (e !== undefined) payload.email = e;
    const p = this.trimOrUndefined(item.phone);
    if (p !== undefined) payload.phone = p;
    const w = this.trimOrUndefined(item.website);
    if (w !== undefined) payload.website = w;
    const a = this.trimOrUndefined(item.address);
    if (a !== undefined) payload.address = a;
    return payload;
  }

  private buildUpdatePayload(item: Partial<CrmCompany>): UpdateCrmCompanyRequest {
    const payload: UpdateCrmCompanyRequest = {
      name: item.name!.trim(),
      taxId: item.taxId!.trim(),
    };
    if (item.isActive !== undefined) {
      payload.isActive = item.isActive;
    }
    const d = this.trimOrUndefined(item.description);
    if (d !== undefined) payload.description = d;
    const e = this.trimOrUndefined(item.email);
    if (e !== undefined) payload.email = e;
    const p = this.trimOrUndefined(item.phone);
    if (p !== undefined) payload.phone = p;
    const w = this.trimOrUndefined(item.website);
    if (w !== undefined) payload.website = w;
    const a = this.trimOrUndefined(item.address);
    if (a !== undefined) payload.address = a;
    return payload;
  }

  private trimOrUndefined(value: string | undefined): string | undefined {
    if (value === undefined || value === null) return undefined;
    const t = String(value).trim();
    return t.length > 0 ? t : undefined;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const httpError = error as {
        error?: { message?: string | string[]; error?: string };
        message?: string;
      };
      const msg = httpError.error?.message;
      if (Array.isArray(msg)) {
        return msg.map(String).join('. ');
      }
      if (msg) {
        return String(msg);
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
