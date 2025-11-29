import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Board } from '../../../../shared/interfaces/board.interface';

/**
 * Componente de tarjeta de tablero
 * Principio de Responsabilidad Única: Solo renderiza una tarjeta de tablero
 */
@Component({
  selector: 'app-board-card',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TagModule, TooltipModule],
  templateUrl: './board-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host ::ng-deep .responsive-button .p-button-label {
        display: none;
      }
      @media (min-width: 640px) {
        :host ::ng-deep .responsive-button .p-button-label {
          display: inline-block;
        }
      }
    `,
  ],
})
export class BoardCardComponent {
  @Input({ required: true }) board!: Board;
  @Input() isOwner = false;
  @Input() isSelected = false;
  @Output() view = new EventEmitter<Board>();
  @Output() edit = new EventEmitter<Board>();
  @Output() invite = new EventEmitter<Board>();
  @Output() delete = new EventEmitter<Board>();

  get pendingInvitationsCount(): number {
    return this.board.invitations.filter((inv) => inv.status === 'pending').length;
  }

  onView(event: Event): void {
    event.stopPropagation();
    this.view.emit(this.board);
  }

  onEdit(event: Event): void {
    this.edit.emit(this.board);
    event.stopPropagation();
  }

  onInvite(event: Event): void {
    event.stopPropagation();
    this.invite.emit(this.board);
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    this.delete.emit(this.board);
  }
}
