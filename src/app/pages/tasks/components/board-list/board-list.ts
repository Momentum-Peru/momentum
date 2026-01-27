import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { BoardCardComponent } from '../board-card/board-card';
import { Board } from '../../../../shared/interfaces/board.interface';

/**
 * Componente de lista de tableros
 * Principio de Responsabilidad Única: Solo renderiza la lista de tableros
 * Usa Angular 20 con signals y sintaxis moderna
 */
@Component({
  selector: 'app-board-list',
  standalone: true,
  imports: [ProgressSpinnerModule, MessageModule, ButtonModule, BoardCardComponent],
  templateUrl: './board-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      /* Asegurar que todas las tarjetas en el grid tengan la misma altura */
      :host ::ng-deep .grid {
        align-items: stretch;
      }
      :host ::ng-deep .grid > div {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      :host ::ng-deep .grid > div > app-board-card {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
    `,
  ],
})
export class BoardListComponent {
  // Inputs usando signal-based inputs (Angular 20)
  readonly boards = input.required<Board[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly currentUserId = input('');
  readonly selectedBoardId = input<string | undefined>(undefined);

  // Outputs usando signal-based outputs (Angular 20)
  readonly createBoard = output<void>();
  readonly viewBoard = output<Board>();
  readonly editBoard = output<Board>();
  readonly inviteUser = output<Board>();
  readonly deleteBoard = output<Board>();
  readonly changeColor = output<{ board: Board; color: string }>();

  // Método para verificar si un tablero pertenece al usuario actual
  isBoardOwner(board: Board): boolean {
    return board.owner?._id === this.currentUserId();
  }
}
