import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';

import { DocumentFilters } from '../../../../shared/interfaces/document.interface';
import { ProjectsApiService } from '../../../../shared/services/projects-api.service';

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
    DividerModule,
    ToastModule,
  ],
  templateUrl: './document-filters.html',
  styleUrl: './document-filters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
})
export class DocumentFiltersComponent implements OnInit {
  @Input({ required: true }) loading = false;
  @Output() filtersApplied = new EventEmitter<DocumentFilters>();

  private readonly fb = inject(FormBuilder);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly messageService = inject(MessageService);

  filtersForm!: FormGroup;
  showAdvancedFilters = signal(false);
  projectOptions = signal<{ label: string; value: string }[]>([]);

  // Opciones para categorías
  categoryOptions = [
    { label: 'Todas las categorías', value: '' },
    { label: 'Factura', value: 'Factura' },
    { label: 'Boleta', value: 'Boleta' },
    { label: 'Nota de Crédito', value: 'Nota de Crédito' },
    { label: 'Nota de Débito', value: 'Nota de Débito' },
    { label: 'Recibo por Honorarios', value: 'Recibo por Honorarios' },
    { label: 'Otros', value: 'Otros' },
  ];

  // Opciones para estado
  statusOptions = [
    { label: 'Todos', value: '' },
    { label: 'Activos', value: 'true' },
    { label: 'Inactivos', value: 'false' },
  ];

  ngOnInit(): void {
    this.initializeForm();
    this.loadProjects();
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
      isActive: ['true'],
    });
  }

  /**
   * Cargar proyectos desde el backend
   */
  private loadProjects(): void {
    this.projectsApi.listActive().subscribe({
      next: (projects) => {
        const options = [{ label: 'Todos los proyectos', value: '' }];
        projects.forEach((project) => {
          options.push({
            label: `${project.name} (${project.code})`,
            value: project._id!,
          });
        });
        this.projectOptions.set(options);
      },
      error: (error: unknown) => {
        console.error('Error al cargar proyectos:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los proyectos',
        });
      },
    });
  }

  /**
   * Aplicar filtros
   */
  applyFilters(): void {
    const formValue = this.filtersForm.value;
    const filters: DocumentFilters = {};

    // Procesar cada campo del formulario
    const numericKeys: (keyof Pick<DocumentFilters, 'numeroDocumento' | 'totalMinimo' | 'totalMaximo'>)[] = [
      'numeroDocumento',
      'totalMinimo',
      'totalMaximo',
    ];
    const stringKeys: (keyof Pick<DocumentFilters, 'proyectoId' | 'categoria' | 'serie'>)[] = [
      'proyectoId',
      'categoria',
      'serie',
    ];

    Object.entries(formValue).forEach(([key, value]) => {
      // Manejar estado activo - siempre incluir si tiene un valor válido
      if (key === 'isActive') {
        if (value === '' || value === null || value === undefined) {
          // Si está vacío, usar el valor por defecto 'true'
          filters[key] = true;
        } else {
          filters[key] = value === 'true' || value === true;
        }
        return;
      }

      // Ignorar campos vacíos, null o undefined (excepto isActive)
      if (value === '' || value === null || value === undefined) {
        return;
      }

      // Convertir fechas a formato ISO string (YYYY-MM-DD)
      if (key.includes('fecha') && value instanceof Date) {
        const dateString = value.toISOString().split('T')[0];
        (filters as Record<string, string | number | boolean>)[key] = dateString;
        return;
      }

      // Convertir números (numeroDocumento, totalMinimo, totalMaximo)
      if (numericKeys.includes(key as typeof numericKeys[number])) {
        const typedKey = key as typeof numericKeys[number];
        const numValue = typeof value === 'number' ? value : Number(value);
        if (!Number.isNaN(numValue) && numValue >= 0) {
          filters[typedKey] = numValue;
        }
        return;
      }

      // Para proyectoId, categoria y serie, solo incluir si tiene valor
      if (stringKeys.includes(key as typeof stringKeys[number])) {
        const typedKey = key as typeof stringKeys[number];
        const stringValue = String(value ?? '').trim();
        if (stringValue) {
          filters[typedKey] = stringValue;
        }
        return;
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
    this.showAdvancedFilters.update((show) => !show);
  }

  /**
   * Verificar si hay filtros aplicados
   */
  hasActiveFilters(): boolean {
    const formValue = this.filtersForm.value;
    return Object.values(formValue).some(
      (value) => value !== '' && value !== null && value !== undefined && value !== 'true'
    );
  }
}
