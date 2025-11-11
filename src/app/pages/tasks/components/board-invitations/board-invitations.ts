import { Component, OnInit, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Components
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';

// Services
import { BoardsApiService } from '../../../../shared/services/boards-api.service';
import { MessageService } from 'primeng/api';
import { take } from 'rxjs';

// Interfaces
import { Board, UpdateInvitationRequest } from '../../../../shared/interfaces/board.interface';

/**
 * Componente para mostrar y gestionar invitaciones pendientes a tableros
 */
@Component({
  selector: 'app-board-invitations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    ProgressSpinnerModule,
    MessageModule,
    BadgeModule,
    TooltipModule,
  ],
  template: `
    <div class="space-y-4">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Invitaciones Pendientes</h2>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            Tienes {{ pendingInvitations().length }} invitación(es) pendiente(s)
          </p>
        </div>
        <div class="flex items-center gap-2">
          <p-button
            icon="pi pi-refresh"
            [text]="true"
            severity="secondary"
            (onClick)="loadInvitations()"
            [loading]="loading()"
            pTooltip="Actualizar invitaciones"
          ></p-button>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
      <div class="flex justify-center items-center py-12">
        <p-progressSpinner></p-progressSpinner>
      </div>
      }

      <!-- Empty State -->
      @if (!loading() && pendingInvitations().length === 0) {
      <div class="text-center py-12">
        <i class="pi pi-inbox text-6xl text-gray-400 dark:text-gray-600 mb-4"></i>
        <p class="text-gray-600 dark:text-gray-400 text-lg">No tienes invitaciones pendientes</p>
      </div>
      }

      <!-- Invitations List -->
      @if (!loading() && pendingInvitations().length > 0) {
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (board of pendingInvitations(); track board._id) {
        <p-card
          class="hover:shadow-lg transition-shadow duration-200"
          [style]="{ 'min-height': '200px' }"
        >
          <ng-template pTemplate="header">
            <div class="p-4 bg-gradient-to-r from-blue-500 to-purple-500">
              <h3 class="text-white font-semibold text-lg">{{ board.title }}</h3>
            </div>
          </ng-template>

          <div class="space-y-3">
            <!-- Board Description -->
            @if (board.description) {
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              {{ board.description }}
            </p>
            }

            <!-- Owner Info -->
            <div class="flex items-center gap-2 text-sm">
              <i class="pi pi-user text-gray-500"></i>
              <span class="text-gray-700 dark:text-gray-300">
                Propietario: <strong>{{ board.owner.name }}</strong>
              </span>
            </div>

            <!-- Invitation Info -->
            @for (invitation of getPendingInvitationsForBoard(board); track invitation._id) {
            <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <div class="flex items-center justify-between mb-2">
                <p-badge
                  value="Pendiente"
                  severity="warn"
                  [style]="{ 'font-size': '0.75rem' }"
                ></p-badge>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatDate(invitation.createdAt) }}
                </span>
              </div>
              <p class="text-xs text-gray-600 dark:text-gray-400">
                Invitado el {{ formatDate(invitation.createdAt) }}
              </p>
            </div>
            }

            <!-- Actions -->
            <div class="flex gap-2 pt-2">
              <p-button
                label="Aceptar"
                icon="pi pi-check"
                severity="success"
                [outlined]="true"
                [loading]="processingInvitation() === getInvitationId(board)"
                (onClick)="acceptInvitation(board)"
                [disabled]="!!processingInvitation()"
                styleClass="flex-1"
              ></p-button>
              <p-button
                label="Rechazar"
                icon="pi pi-times"
                severity="danger"
                [outlined]="true"
                [loading]="processingInvitation() === getInvitationId(board)"
                (onClick)="rejectInvitation(board)"
                [disabled]="!!processingInvitation()"
                styleClass="flex-1"
              ></p-button>
            </div>
          </div>
        </p-card>
        }
      </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class BoardInvitationsComponent implements OnInit {
  private readonly boardsApiService = inject(BoardsApiService);
  private readonly messageService = inject(MessageService);

  // Inputs/Outputs
  public readonly visible = input<boolean>(false);
  public readonly invitationAccepted = output<Board>();
  public readonly invitationRejected = output<Board>();

  // Signals
  public readonly pendingInvitations = signal<Board[]>([]);
  public readonly loading = signal<boolean>(false);
  public readonly processingInvitation = signal<string | null>(null);

  ngOnInit(): void {
    this.loadInvitations();
  }

  /**
   * Carga las invitaciones pendientes
   */
  public loadInvitations(): void {
    this.loading.set(true);
    this.boardsApiService
      .getPendingInvitations()
      .pipe(take(1))
      .subscribe({
        next: (boards) => {
          this.pendingInvitations.set(boards || []);
          this.loading.set(false);
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error?.error?.message || 'No se pudieron cargar las invitaciones',
          });
          this.loading.set(false);
        },
      });
  }

  /**
   * Obtiene las invitaciones pendientes para un board específico
   */
  public getPendingInvitationsForBoard(board: Board) {
    return board.invitations?.filter((inv) => inv.status === 'pending') || [];
  }

  /**
   * Obtiene el ID de la invitación pendiente de un board
   */
  public getInvitationId(board: Board): string | null {
    const pendingInv = this.getPendingInvitationsForBoard(board)[0];
    return pendingInv?._id || null;
  }

  /**
   * Acepta una invitación
   */
  public acceptInvitation(board: Board): void {
    const invitationId = this.getInvitationId(board);
    if (!invitationId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No se encontró la invitación',
      });
      return;
    }

    this.processingInvitation.set(invitationId);
    const updateData: UpdateInvitationRequest = { status: 'accepted' };

    this.boardsApiService
      .updateInvitation(board._id, invitationId, updateData)
      .pipe(take(1))
      .subscribe({
        next: (updatedBoard) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Invitación aceptada. Ahora eres miembro del tablero "${board.title}"`,
          });
          this.processingInvitation.set(null);
          this.invitationAccepted.emit(updatedBoard);
          // Recargar invitaciones
          this.loadInvitations();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error?.error?.message || 'No se pudo aceptar la invitación',
          });
          this.processingInvitation.set(null);
        },
      });
  }

  /**
   * Rechaza una invitación
   */
  public rejectInvitation(board: Board): void {
    const invitationId = this.getInvitationId(board);
    if (!invitationId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No se encontró la invitación',
      });
      return;
    }

    this.processingInvitation.set(invitationId);
    const updateData: UpdateInvitationRequest = { status: 'rejected' };

    this.boardsApiService
      .updateInvitation(board._id, invitationId, updateData)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'info',
            summary: 'Invitación rechazada',
            detail: `Has rechazado la invitación al tablero "${board.title}"`,
          });
          this.processingInvitation.set(null);
          this.invitationRejected.emit(board);
          // Recargar invitaciones
          this.loadInvitations();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error?.error?.message || 'No se pudo rechazar la invitación',
          });
          this.processingInvitation.set(null);
        },
      });
  }

  /**
   * Formatea una fecha para mostrar
   */
  public formatDate(date: Date | string | undefined): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }
}
