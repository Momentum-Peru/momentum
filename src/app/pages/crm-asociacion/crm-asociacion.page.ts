import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { AssociationMembersApiService } from '../../shared/services/association-members-api.service';
import { AssociationMember } from '../../shared/interfaces/association-member.interface';

@Component({
  selector: 'app-crm-asociacion-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    InputTextModule,
    ButtonModule,
    CardModule,
    ToastModule,
    DialogModule,
  ],
  providers: [MessageService],
  templateUrl: './crm-asociacion.page.html',
  styleUrl: './crm-asociacion.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrmAsociacionPage implements OnInit {
  private readonly api = inject(AssociationMembersApiService);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<AssociationMember[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly editVisible = signal(false);
  readonly editingId = signal<string | null>(null);

  readonly searchCtrl = new FormControl('', { nonNullable: true });
  readonly dniCtrl = new FormControl('', { nonNullable: true });
  readonly emailCtrl = new FormControl('', { nonNullable: true });
  readonly telefonoCtrl = new FormControl('', { nonNullable: true });
  readonly dateFromCtrl = new FormControl('', { nonNullable: true });
  readonly dateToCtrl = new FormControl('', { nonNullable: true });
  readonly editNombreCtrl = new FormControl('', { nonNullable: true });
  readonly editDniCtrl = new FormControl('', { nonNullable: true });
  readonly editTelefonoCtrl = new FormControl('', { nonNullable: true });
  readonly editEmailCtrl = new FormControl('', { nonNullable: true });
  readonly editDireccionCtrl = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    [
      this.searchCtrl,
      this.dniCtrl,
      this.emailCtrl,
      this.telefonoCtrl,
      this.dateFromCtrl,
      this.dateToCtrl,
    ].forEach((ctrl) => {
      ctrl.valueChanges
        .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.load());
    });

    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api
      .list({
        search: this.searchCtrl.value.trim() || undefined,
        dni: this.dniCtrl.value.trim() || undefined,
        email: this.emailCtrl.value.trim() || undefined,
        telefono: this.telefonoCtrl.value.trim() || undefined,
        dateFrom: this.dateFromCtrl.value || undefined,
        dateTo: this.dateToCtrl.value || undefined,
      })
      .subscribe({
        next: (rows) => {
          this.items.set(rows);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.messages.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los registros. Verifica tu sesión.',
          });
        },
      });
  }

  clearFilters(): void {
    const silent = { emitEvent: false } as const;
    this.searchCtrl.setValue('', silent);
    this.dniCtrl.setValue('', silent);
    this.emailCtrl.setValue('', silent);
    this.telefonoCtrl.setValue('', silent);
    this.dateFromCtrl.setValue('', silent);
    this.dateToCtrl.setValue('', silent);
    this.load();
  }

  displayName(row: AssociationMember): string {
    if (row.nombreCompleto?.trim()) return row.nombreCompleto.trim();
    const p = [row.nombres, row.apellidos].filter(Boolean).join(' ').trim();
    return p || '—';
  }

  displayCell(v: string | undefined): string {
    return v?.trim() ? v : '—';
  }

  openEdit(row: AssociationMember): void {
    this.editingId.set(row._id);
    this.editNombreCtrl.setValue(this.displayName(row) === '—' ? '' : this.displayName(row), {
      emitEvent: false,
    });
    this.editDniCtrl.setValue(row.dni ?? '', { emitEvent: false });
    this.editTelefonoCtrl.setValue(row.telefono ?? '', { emitEvent: false });
    this.editEmailCtrl.setValue(row.email ?? '', { emitEvent: false });
    this.editDireccionCtrl.setValue(row.direccion ?? '', { emitEvent: false });
    this.editVisible.set(true);
  }

  closeEdit(): void {
    this.editVisible.set(false);
    this.editingId.set(null);
  }

  saveEdit(): void {
    const id = this.editingId();
    if (!id) return;

    this.saving.set(true);
    this.api
      .update(id, {
        nombreCompleto: this.editNombreCtrl.value.trim() || undefined,
        dni: this.editDniCtrl.value.trim() || undefined,
        telefono: this.editTelefonoCtrl.value.trim() || undefined,
        email: this.editEmailCtrl.value.trim() || undefined,
        direccion: this.editDireccionCtrl.value.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.closeEdit();
          this.messages.add({
            severity: 'success',
            summary: 'Actualizado',
            detail: 'Registro actualizado correctamente.',
          });
          this.load();
        },
        error: () => {
          this.saving.set(false);
          this.messages.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el registro.',
          });
        },
      });
  }

  remove(row: AssociationMember): void {
    if (!confirm(`¿Eliminar registro de ${this.displayName(row)}?`)) {
      return;
    }

    this.api.remove(row._id).subscribe({
      next: () => {
        this.messages.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: 'Registro eliminado correctamente.',
        });
        this.load();
      },
      error: () => {
        this.messages.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar el registro.',
        });
      },
    });
  }
}
