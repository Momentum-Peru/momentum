import { Component, Input, Output, EventEmitter, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';

import { DocumentFilters } from '../../../../shared/interfaces/document.interface';
import { Project } from '../../../../shared/interfaces/project.interface';

@Component({
    selector: 'app-document-filters',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        DatePickerModule,
        CardModule,
        DividerModule
    ],
    templateUrl: './document-filters.html',
    styleUrl: './document-filters.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentFiltersComponent implements OnInit {
    @Input({ required: true }) projects: Project[] = [];
    @Input({ required: true }) loading: boolean = false;
    @Output() filtersApplied = new EventEmitter<DocumentFilters>();

    private readonly fb = inject(FormBuilder);

    filtersForm!: FormGroup;
    showAdvancedFilters = signal(false);

    // Opciones para categorías
    categoryOptions = [
        { label: 'Todas las categorías', value: '' },
        { label: 'Factura', value: 'Factura' },
        { label: 'Boleta', value: 'Boleta' },
        { label: 'Nota de Crédito', value: 'Nota de Crédito' },
        { label: 'Nota de Débito', value: 'Nota de Débito' },
        { label: 'Recibo por Honorarios', value: 'Recibo por Honorarios' },
        { label: 'Otros', value: 'Otros' }
    ];

    // Opciones para estado
    statusOptions = [
        { label: 'Todos', value: '' },
        { label: 'Activos', value: 'true' },
        { label: 'Inactivos', value: 'false' }
    ];

    ngOnInit(): void {
        this.initializeForm();
    }

    /**
     * Inicializar formulario de filtros
     */
    private initializeForm(): void {
        this.filtersForm = this.fb.group({
            proyectoId: [''],
            categoria: [''],
            numeroDocumento: [''],
            serie: [''],
            fechaEmisionDesde: [''],
            fechaEmisionHasta: [''],
            fechaVencimientoDesde: [''],
            fechaVencimientoHasta: [''],
            totalMinimo: [''],
            totalMaximo: [''],
            isActive: ['true']
        });
    }

    /**
     * Obtener opciones de proyectos para el dropdown
     */
    get projectOptions() {
        const options = [{ label: 'Todos los proyectos', value: '' }];
        this.projects.forEach(project => {
            options.push({
                label: `${project.name} (${project.code})`,
                value: project._id!
            });
        });
        return options;
    }

    /**
     * Aplicar filtros
     */
    applyFilters(): void {
        const formValue = this.filtersForm.value;
        const filters: DocumentFilters = {};

        // Solo incluir campos que tienen valor
        Object.entries(formValue).forEach(([key, value]) => {
            if (value !== '' && value !== null && value !== undefined) {
                if (key === 'isActive') {
                    filters[key] = value === 'true';
                } else {
                    (filters as any)[key] = value;
                }
            }
        });

        this.filtersApplied.emit(filters);
    }

    /**
     * Limpiar filtros
     */
    clearFilters(): void {
        this.filtersForm.reset();
        this.filtersForm.patchValue({ isActive: 'true' });
        this.showAdvancedFilters.set(false);
        this.filtersApplied.emit({});
    }

    /**
     * Alternar filtros avanzados
     */
    toggleAdvancedFilters(): void {
        this.showAdvancedFilters.update(show => !show);
    }

    /**
     * Verificar si hay filtros aplicados
     */
    hasActiveFilters(): boolean {
        const formValue = this.filtersForm.value;
        return Object.values(formValue).some(value =>
            value !== '' && value !== null && value !== undefined && value !== 'true'
        );
    }
}
