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
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { CompaniesApiService } from '../../shared/services/companies-api.service';
import { AuthService } from '../../pages/login/services/auth.service';
import {
    Company,
    CreateCompanyRequest,
    UpdateCompanyRequest,
    CompanyQueryParams,
} from '../../shared/interfaces/company.interface';

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

    // Signals
    items = signal<Company[]>([]);
    query = signal<string>('');
    isActiveFilter = signal<boolean | null>(null);
    showDialog = signal<boolean>(false);
    showDetailsDialog = signal<boolean>(false);
    editing = signal<Partial<Company> | null>(null);
    viewingCompany = signal<Company | null>(null);
    expandedRows = signal<Set<string>>(new Set());

    ngOnInit() {
        this.load();
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
                const filtered = !tenantIds || tenantIds.length === 0
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
        this.editing.set({
            name: '',
            code: '',
            taxId: '',
            description: '',
            email: '',
            phone: '',
            website: '',
            address: '',
            isActive: true,
        });
        this.showDialog.set(true);
    }

    editItem(item: Company) {
        this.editing.set({ ...item });
        this.showDialog.set(true);
    }

    viewDetails(item: Company) {
        this.viewingCompany.set(item);
        this.showDetailsDialog.set(true);
    }

    closeDialog() {
        this.showDialog.set(false);
    }

    closeDetails() {
        this.showDetailsDialog.set(false);
    }

    onEditChange<K extends keyof Company>(key: K, value: Company[K]) {
        const cur = this.editing();
        if (!cur) return;
        this.editing.set({ ...cur, [key]: value });
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

        if (item._id) {
            // Actualizar empresa existente
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
        if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
            return error.message;
        }
        return 'Ha ocurrido un error inesperado';
    }
}

