import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FiApiService } from '../../shared/services/fi-api.service';
import { Fi, CreateFiRequest } from '../../shared/interfaces/fi';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Dialog } from 'primeng/dialog';
import { Textarea } from 'primeng/textarea';
import { DatePicker } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-fi-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    Button,
    InputText,
    ToggleSwitch,
    Dialog,
    Textarea,
    DatePicker,
    TableModule,
    ToastModule,
  ],
  templateUrl: './fi-list.page.html',
  styleUrl: './fi-list.page.scss',
})
export class FiListPage implements OnInit {
  private readonly api = inject(FiApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  fiList = signal<Fi[]>([]);
  q = '';
  filterActive = true;
  expandedRows = signal<Set<string>>(new Set());

  createOpen = false;
  createForm: CreateFiRequest = {
    titulo: '',
    atravesar: '',
    plan: { descripcion: '', fechaInicio: '', fechaFin: '' },
    isActive: true,
  };
  startDate?: Date;
  endDate?: Date;
  dateRange: Date[] = [];

  // Responsive config for DatePicker
  isSmallScreen = window.matchMedia('(max-width: 640px)').matches;
  isLargeScreen = window.matchMedia('(min-width: 1024px)').matches;

  constructor() {
    // Actualizar flags responsive on resize
    const mmSmall = window.matchMedia('(max-width: 640px)');
    const mmLarge = window.matchMedia('(min-width: 1024px)');
    const update = () => {
      this.isSmallScreen = mmSmall.matches;
      this.isLargeScreen = mmLarge.matches;
    };
    mmSmall.addEventListener('change', update);
    mmLarge.addEventListener('change', update);
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.api
      .list({ q: this.q || undefined, isActive: this.filterActive })
      .subscribe((items) => this.fiList.set(items));
  }

  openCreate(): void {
    this.createForm = {
      titulo: '',
      atravesar: '',
      plan: { descripcion: '', fechaInicio: '', fechaFin: '' },
      isActive: true,
    };
    this.startDate = undefined;
    this.endDate = undefined;
    this.dateRange = [];
    this.createOpen = true;
  }

  submitCreate(): void {
    if (!this.startDate || !this.endDate) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'Debe seleccionar un rango de fechas',
      });
      return;
    }
    if (!this.createForm.titulo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'El título es requerido',
      });
      return;
    }
    if (!this.createForm.atravesar) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'El atravesar es requerido',
      });
      return;
    }
    if (!this.createForm.plan.descripcion) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'La descripción del plan es requerida',
      });
      return;
    }
    const toIso = (d: Date) => d.toISOString().slice(0, 10);
    this.createForm.plan.fechaInicio = toIso(this.startDate);
    this.createForm.plan.fechaFin = toIso(this.endDate);
    this.api.create(this.createForm).subscribe({
      next: (created) => {
        this.createOpen = false;
        this.refresh();
        this.goDetail(created);
      },
    });
  }

  goDetail(item: Fi): void {
    this.router.navigate(['/fi', item._id]);
  }

  // Range change handler from DatePicker
  onRangeChange(range: Date[] | null): void {
    this.dateRange = Array.isArray(range) ? range : [];
    this.startDate = this.dateRange[0];
    this.endDate = this.dateRange[1];
  }

  // Formatear rango de fechas para Perú
  formatDateRange(fechaInicio: string, fechaFin: string): string {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const inicioFormatted = inicio.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const finFormatted = fin.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return `${inicioFormatted} → ${finFormatted}`;
  }

  // Toggle para filas expandidas en mobile
  toggleRow(id: string): void {
    const expanded = this.expandedRows();
    if (expanded.has(id)) {
      expanded.delete(id);
    } else {
      expanded.add(id);
    }
    this.expandedRows.set(new Set(expanded));
  }

  isRowExpanded(id: string): boolean {
    return this.expandedRows().has(id);
  }
}
