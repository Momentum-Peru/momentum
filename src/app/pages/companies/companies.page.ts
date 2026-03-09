import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CompaniesApiService } from '../../shared/services/companies-api.service';
import { Company, CreateCompanyRequest, UpdateCompanyRequest } from '../../shared/interfaces/company.interface';

@Component({
    selector: 'app-companies',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        InputTextModule,
        ButtonModule,
        TableModule,
        DialogModule,
        ToastModule,
        ConfirmDialogModule,
        TooltipModule,
        ToggleButtonModule,
        SelectModule,
        TextareaModule,
    ],
    templateUrl: './companies.page.html', // trigger rebuild
    providers: [MessageService, ConfirmationService],
})
export class CompaniesPage implements OnInit {
    private readonly companiesApi = inject(CompaniesApiService);
    private readonly messageService = inject(MessageService);
    private readonly confirmationService = inject(ConfirmationService);

    items = signal<Company[]>([]);
    query = signal('');
    filterActive = signal<boolean | null>(null);
    showDialog = signal(false);
    showViewDialog = signal(false);
    editing = signal<Company | null>(null);
    viewing = signal<Company | null>(null);
    loading = signal(false);

    filterActiveOptions = [
        { label: 'Todas', value: null },
        { label: 'Activas', value: true },
        { label: 'Inactivas', value: false },
    ];

    private expandedRowKeys = signal<Set<string>>(new Set());

    filteredItems = computed(() => {
        const searchQuery = this.query().toLowerCase().trim();
        const isActiveFilter = this.filterActive();
        let list = this.items()
            .slice()
            .sort((a, b) => {
                const aDate = new Date(a.createdAt || 0).getTime();
                const bDate = new Date(b.createdAt || 0).getTime();
                return bDate - aDate;
            });

        if (isActiveFilter !== null) {
            list = list.filter((item) => item.isActive === isActiveFilter);
        }

        if (!searchQuery) return list;
        return list.filter((item) => {
            const nombreMatch = item.name?.toLowerCase().includes(searchQuery) ?? false;
            const codigoMatch = item.code?.toLowerCase().includes(searchQuery) ?? false;
            const rucMatch = item.taxId?.toLowerCase().includes(searchQuery) ?? false;
            return nombreMatch || codigoMatch || rucMatch;
        });
    });

    ngOnInit() {
        this.load();
    }

    load() {
        this.loading.set(true);
        const params: { search?: string; isActive?: boolean } = {};
        if (this.query()) params.search = this.query();
        const active = this.filterActive();
        if (active !== null) params.isActive = active;

        this.companiesApi.list(params).subscribe({
            next: (data) => {
                this.items.set(data);
                this.loading.set(false);
            },
            error: () => {
                this.toastError('Error al cargar empresas');
                this.loading.set(false);
            },
        });
    }

    buildRowKey(item: Company, index: number): string {
        return item._id ? String(item._id) : `${item.name}#${index}`;
    }

    isRowExpandedByKey(key: string): boolean {
        return this.expandedRowKeys().has(key);
    }

    toggleRowByKey(key: string): void {
        const set = new Set(this.expandedRowKeys());
        if (set.has(key)) set.delete(key);
        else set.add(key);
        this.expandedRowKeys.set(set);
    }

    setQuery(value: string) {
        this.query.set(value);
        this.load();
    }

    setFilterActive(value: boolean | null) {
        this.filterActive.set(value);
        this.load();
    }

    newItem() {
        this.editing.set({
            _id: '',
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
        this.editing.set({ ...item });
        this.showDialog.set(true);
    }

    closeDialog() {
        this.showDialog.set(false);
        this.editing.set(null);
    }

    viewItem(item: Company) {
        this.viewing.set(item);
        this.showViewDialog.set(true);
    }

    closeViewDialog() {
        this.showViewDialog.set(false);
    }

    onEditChange(field: keyof Company, value: any) {
        const current = this.editing();
        if (current) {
            this.editing.set({ ...current, [field]: value });
        }
    }

    toggleActive(item: Company, event: Event) {
        event.stopPropagation();
        if (!item._id) return;

        const newStatus = !item.isActive;
        const action = newStatus ? 'activar' : 'desactivar';

        this.confirmationService.confirm({
            message: `¿Está seguro de que desea ${action} la empresa "${item.name}"?`,
            header: `Confirmar ${action === 'activar' ? 'Activación' : 'Desactivación'}`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: `Sí, ${action}`,
            rejectLabel: 'Cancelar',
            accept: () => {
                this.loading.set(true);
                const request = newStatus
                    ? this.companiesApi.activate(item._id!)
                    : this.companiesApi.deactivate(item._id!);

                request.subscribe({
                    next: () => {
                        this.toastSuccess(`Empresa ${action === 'activar' ? 'activada' : 'desactivada'} exitosamente`);
                        this.load();
                    },
                    error: (err) => {
                        const message = err.error?.message || `Error al ${action} la empresa`;
                        this.toastError(message);
                        this.loading.set(false);
                    },
                });
            },
        });
    }

    save() {
        const item = this.editing();
        if (!item) return;

        const errors = this.validateForm(item);
        if (errors.length) {
            errors.forEach((e) => this.toastError(e));
            return;
        }

        this.loading.set(true);

        if (item._id) {
            const updateData: UpdateCompanyRequest = {
                name: item.name,
                code: item.code || undefined,
                taxId: item.taxId || undefined,
                description: item.description || undefined,
                email: item.email || undefined,
                phone: item.phone || undefined,
                website: item.website || undefined,
                address: item.address || undefined,
                logo: item.logo || undefined,
                isActive: item.isActive,
            };

            this.companiesApi.update(item._id, updateData).subscribe({
                next: () => {
                    this.toastSuccess('Empresa actualizada exitosamente');
                    this.closeDialog();
                    this.load();
                },
                error: (err) => {
                    const message = err.error?.message || 'Error al actualizar la empresa';
                    this.toastError(message);
                    this.loading.set(false);
                },
            });
        } else {
            const createData: CreateCompanyRequest = {
                name: item.name,
                code: item.code || undefined,
                taxId: item.taxId || undefined,
                description: item.description || undefined,
                email: item.email || undefined,
                phone: item.phone || undefined,
                website: item.website || undefined,
                address: item.address || undefined,
                logo: item.logo || undefined,
                isActive: item.isActive ?? true,
            };

            this.companiesApi.create(createData).subscribe({
                next: () => {
                    this.toastSuccess('Empresa creada exitosamente');
                    this.closeDialog();
                    this.load();
                },
                error: (err) => {
                    const message = err.error?.message || 'Error al crear la empresa';
                    this.toastError(message);
                    this.loading.set(false);
                },
            });
        }
    }

    remove(item: Company) {
        if (!item._id) return;

        this.confirmationService.confirm({
            message: `¿Está seguro de que desea eliminar la empresa "${item.name}"?`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            accept: () => {
                this.loading.set(true);
                this.companiesApi.delete(item._id!).subscribe({
                    next: () => {
                        this.toastSuccess('Empresa eliminada exitosamente');
                        this.load();
                    },
                    error: (err) => {
                        const message = err.error?.message || 'Error al eliminar la empresa';
                        this.toastError(message);
                        this.loading.set(false);
                    },
                });
            },
        });
    }

    validateForm(item: Company): string[] {
        const errors: string[] = [];
        if (!item.name || item.name.trim().length < 2) {
            errors.push('El nombre debe tener al menos 2 caracteres');
        }
        return errors;
    }

    toastSuccess(message: string) {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: message });
    }

    toastError(message: string) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: message });
    }
}
