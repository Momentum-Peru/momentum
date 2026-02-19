import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';
import { WorkShiftsApiService } from '../../shared/services/work-shifts-api.service';
import { MenuService } from '../../shared/services/menu.service';
import { WorkShift, CreateWorkShiftRequest, UpdateWorkShiftRequest } from '../../shared/interfaces/work-shift.interface';

@Component({
  selector: 'app-work-shifts',
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
    CheckboxModule,
    InputNumberModule,
    MultiSelectModule,
    TagModule,
  ],
  templateUrl: './work-shifts.html',
  styleUrl: './work-shifts.scss',
  providers: [MessageService, ConfirmationService],
})
export class WorkShiftsPage implements OnInit {
  private readonly workShiftsApi = inject(WorkShiftsApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly menuService = inject(MenuService);

  // Check if user handles edit permission for this module
  readonly canEdit = computed(() => this.menuService.canEdit('/work-shifts'));

  items = signal<WorkShift[]>([]);
  query = signal('');
  showDialog = signal(false);
  editing = signal<WorkShift | null>(null);
  loading = signal(false);

  // Constants
  readonly daysOptions = [
    { label: 'Lunes', value: 'Lunes' },
    { label: 'Martes', value: 'Martes' },
    { label: 'Miércoles', value: 'Miércoles' },
    { label: 'Jueves', value: 'Jueves' },
    { label: 'Viernes', value: 'Viernes' },
    { label: 'Sábado', value: 'Sábado' },
    { label: 'Domingo', value: 'Domingo' },
  ];

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.workShiftsApi.list({ q: this.query() || undefined }).subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.toastError('Error al cargar turnos');
        this.loading.set(false);
      },
    });
  }

  setQuery(value: string) {
    this.query.set(value);
    this.load();
  }

  newItem() {
    this.editing.set({
      name: '',
      startTime: '',
      endTime: '',
      toleranceMinutes: 0,
      breakMinutes: 0,
      days: [],
      isActive: true,
    } as WorkShift);
    this.showDialog.set(true);
  }

  editItem(item: WorkShift) {
    this.editing.set({ ...item });
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
    this.editing.set(null);
  }

  onEditChange(field: keyof WorkShift, value: any) {
    const current = this.editing();
    if (current) {
      this.editing.set({ ...current, [field]: value });
    }
  }

  save() {
    const item = this.editing();
    if (!item) return;

    if (!item.name || !item.startTime || !item.endTime) {
      this.toastError('Complete los campos obligatorios (Nombre, Inicio, Fin)');
      return;
    }

    this.loading.set(true);

    if (item._id) {
      // Update
      const updateData: UpdateWorkShiftRequest = {
        name: item.name,
        startTime: item.startTime,
        endTime: item.endTime,
        toleranceMinutes: item.toleranceMinutes,
        breakMinutes: item.breakMinutes,
        days: item.days,
        isActive: item.isActive,
      };

      this.workShiftsApi.update(item._id, updateData).subscribe({
        next: () => {
          this.toastSuccess('Turno actualizado exitosamente');
          this.loading.set(false);
          this.closeDialog();
          this.load();
        },
        error: (err) => {
          const message = err.error?.message || 'Error al actualizar el turno';
          this.toastError(message);
          this.loading.set(false);
        },
      });
    } else {
      // Create
      const createData: CreateWorkShiftRequest = {
        name: item.name,
        startTime: item.startTime,
        endTime: item.endTime,
        toleranceMinutes: item.toleranceMinutes,
        breakMinutes: item.breakMinutes,
        days: item.days,
        isActive: item.isActive,
      };

      this.workShiftsApi.create(createData).subscribe({
        next: () => {
          this.toastSuccess('Turno creado exitosamente');
          this.loading.set(false);
          this.closeDialog();
          this.load();
        },
        error: (err) => {
          const message = err.error?.message || 'Error al crear el turno';
          this.toastError(message);
          this.loading.set(false);
        },
      });
    }
  }

  remove(item: WorkShift) {
    if (!item._id) return;

    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar el turno ${item.name}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.loading.set(true);
        this.workShiftsApi.delete(item._id!).subscribe({
          next: () => {
            this.toastSuccess('Turno eliminado exitosamente');
            this.load();
          },
          error: (err) => {
            const message = err.error?.message || 'Error al eliminar el turno';
            this.toastError(message);
            this.loading.set(false);
          },
        });
      },
    });
  }

  private toastSuccess(detail: string) {
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail, life: 3000 });
  }

  private toastError(detail: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 3000 });
  }
}
