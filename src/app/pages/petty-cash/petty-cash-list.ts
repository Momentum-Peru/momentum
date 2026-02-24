import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { PettyCashApiService } from '../../shared/services/petty-cash-api.service';
import { PettyCashBox } from '../../shared/interfaces/petty-cash.interface';

/**
 * Página de listado de Cajas Chicas.
 * Muestra las cajas del tenant y permite crear nuevas (solo administrador).
 * Al crear una caja, redirige a la vista de esa caja.
 */
@Component({
  selector: 'app-petty-cash-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    InputTextModule,
    ToastModule,
    DialogModule,
  ],
  templateUrl: './petty-cash-list.html',
  styleUrl: './petty-cash-list.scss',
  providers: [MessageService],
})
export class PettyCashListPage implements OnInit {
  private readonly api = inject(PettyCashApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  boxes = signal<PettyCashBox[]>([]);
  loading = signal(false);
  showCreateDialog = signal(false);
  newBoxName = signal('');
  creating = signal(false);

  ngOnInit(): void {
    this.loadBoxes();
  }

  loadBoxes(): void {
    this.loading.set(true);
    this.api.getBoxes().subscribe({
      next: (list) => {
        this.boxes.set(list ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las cajas chicas',
        });
        this.loading.set(false);
      },
    });
  }

  openCreateDialog(): void {
    this.newBoxName.set('');
    this.showCreateDialog.set(true);
  }

  closeCreateDialog(): void {
    this.showCreateDialog.set(false);
  }

  createBox(): void {
    const name = this.newBoxName()?.trim();
    if (!name) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campo requerido',
        detail: 'Ingrese el nombre de la caja chica',
      });
      return;
    }
    this.creating.set(true);
    this.api.createBox(name).subscribe({
      next: (box) => {
        this.creating.set(false);
        this.closeCreateDialog();
        this.messageService.add({
          severity: 'success',
          summary: 'Caja creada',
          detail: `"${box.name}" creada correctamente`,
        });
        this.router.navigate(['/petty-cash', 'box', box._id]);
      },
      error: (err) => {
        this.creating.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message ?? 'No se pudo crear la caja chica',
        });
      },
    });
  }

  trackByBoxId(_index: number, box: PettyCashBox): string {
    return box._id;
  }
}
