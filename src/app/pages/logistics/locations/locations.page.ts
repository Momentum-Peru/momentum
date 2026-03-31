import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { WarehouseLocationsService, WarehouseLocation } from '../../../shared/services/warehouse-locations.service';

@Component({
  selector: 'app-locations-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CardModule, ButtonModule, InputTextModule,
    TableModule, TooltipModule, IconFieldModule, InputIconModule,
    DialogModule, ToastModule, ConfirmDialogModule, CheckboxModule, TextareaModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './locations.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationsPage implements OnInit {
  private readonly locationsService = inject(WarehouseLocationsService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);

  locations = signal<WarehouseLocation[]>([]);
  loading = signal(false);
  showDialog = signal(false);
  saving = signal(false);
  editingId = signal<string | null>(null);

  form = signal<{ name: string; description: string; isActive: boolean }>({
    name: '',
    description: '',
    isActive: true,
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.locationsService.getLocations().subscribe({
      next: (data) => { this.locations.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openNew() {
    this.editingId.set(null);
    this.form.set({ name: '', description: '', isActive: true });
    this.showDialog.set(true);
  }

  openEdit(loc: WarehouseLocation) {
    this.editingId.set(loc._id!);
    this.form.set({ name: loc.name, description: loc.description ?? '', isActive: loc.isActive });
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  updateForm(field: 'name' | 'description' | 'isActive', value: any) {
    this.form.set({ ...this.form(), [field]: value });
  }

  save() {
    const f = this.form();
    if (!f.name.trim()) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'El nombre es obligatorio' });
      return;
    }
    this.saving.set(true);
    const id = this.editingId();
    const req = id
      ? this.locationsService.updateLocation(id, f)
      : this.locationsService.createLocation(f);

    req.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: id ? 'Ubicación actualizada' : 'Ubicación creada' });
        this.saving.set(false);
        this.showDialog.set(false);
        this.load();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar' });
        this.saving.set(false);
      },
    });
  }

  confirmDelete(loc: WarehouseLocation) {
    this.confirmationService.confirm({
      message: `¿Eliminar la ubicación "${loc.name}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-trash',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.locationsService.deleteLocation(loc._id!).subscribe({
          next: () => { this.messageService.add({ severity: 'success', summary: 'Eliminado' }); this.load(); },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' }),
        });
      },
    });
  }

  viewLocation(loc: WarehouseLocation) {
    this.router.navigate(['/logistics/locations', loc._id]);
  }
}
