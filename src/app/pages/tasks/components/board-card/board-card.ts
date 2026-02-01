import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ColorPickerModule } from 'primeng/colorpicker';
import { Board } from '../../../../shared/interfaces/board.interface';

/**
 * Componente de tarjeta de tablero
 * Principio de Responsabilidad Única: Solo renderiza una tarjeta de tablero
 */
@Component({
  selector: 'app-board-card',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    DialogModule,
    ColorPickerModule,
  ],
  templateUrl: './board-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      :host ::ng-deep .responsive-button .p-button-label {
        display: none;
      }
      @media (min-width: 640px) {
        :host ::ng-deep .responsive-button .p-button-label {
          display: inline-block;
        }
      }
      :host ::ng-deep .p-card {
        border-radius: 0.75rem;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      :host ::ng-deep .p-card-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      :host ::ng-deep .p-card-content {
        flex: 1;
        min-height: 0;
      }
      :host ::ng-deep .p-card-header {
        display: flex;
        align-items: stretch;
        flex-shrink: 0;
      }
      :host ::ng-deep .p-card-header > div {
        display: flex;
        align-items: center;
        width: 100%;
      }
      /* Asegurar que los footers estén siempre en la parte inferior */
      :host ::ng-deep .p-card-footer {
        flex-shrink: 0;
        margin-top: auto;
      }
    `,
  ],
})
export class BoardCardComponent {
  @Input({ required: true }) board!: Board;
  @Input() isOwner = false;
  @Input() isSelected = false;
  @Input() currentUserId = '';
  @Input() isGerencia = false;
  @Output() view = new EventEmitter<Board>();
  @Output() edit = new EventEmitter<Board>();
  @Output() invite = new EventEmitter<Board>();
  @Output() delete = new EventEmitter<Board>();
  @Output() removeMember = new EventEmitter<{ board: Board; memberId: string }>();
  @Output() leaveBoard = new EventEmitter<Board>();
  @Output() colorChange = new EventEmitter<{ board: Board; color: string }>();

  showMembersDialog = signal(false);
  showColorPicker = signal(false);

  // Color del tablero con valor por defecto
  boardColor = computed(() => this.board.color || '#3b82f6');

  // Color temporal para previsualización - se actualiza cuando cambia el board
  previewColor = computed(() => {
    // Si el color picker está abierto, mantener el color de previsualización
    if (this.showColorPicker()) {
      return this._previewColorValue();
    }
    // Si no está abierto, usar el color del board
    return this.boardColor();
  });

  private _previewColorValue = signal<string>('#3b82f6');

  get pendingInvitationsCount(): number {
    return (this.board.invitations || []).filter((inv) => inv.status === 'pending').length;
  }

  getPendingInvitations() {
    return (this.board.invitations || []).filter((inv) => inv.status === 'pending');
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

  onRemoveMember(memberId: string, event: Event): void {
    event.stopPropagation();
    this.removeMember.emit({ board: this.board, memberId });
  }

  onLeaveBoard(event: Event): void {
    event.stopPropagation();
    this.leaveBoard.emit(this.board);
  }

  isCurrentUserMember(): boolean {
    if (!this.currentUserId) return false;
    return (this.board.members || []).some((member) => member._id === this.currentUserId);
  }

  /**
   * Verifica si el usuario actual es miembro del tablero (propietario o miembro)
   */
  isBoardMember(): boolean {
    if (!this.currentUserId) return false;
    // Verificar si es propietario
    if (this.isOwner || (this.board.owner && this.board.owner._id === this.currentUserId)) {
      return true;
    }
    // Verificar si es miembro
    return this.isCurrentUserMember();
  }

  isCurrentUser(memberId: string): boolean {
    return this.currentUserId === memberId;
  }

  onColorChange(event: { value: string | object }): void {
    // El evento puede tener value como string o object, extraer el string
    let newColor = '#3b82f6';
    if (typeof event.value === 'string') {
      newColor = event.value;
    } else if (event.value && typeof event.value === 'object' && 'hex' in event.value) {
      newColor = (event.value as { hex: string }).hex;
    }
    this._previewColorValue.set(newColor);
  }

  onColorApply(event: Event): void {
    event.stopPropagation();
    const color = this._previewColorValue();
    this.colorChange.emit({ board: this.board, color });
    this.showColorPicker.set(false);
  }

  onColorCancel(event: Event): void {
    event.stopPropagation();
    this._previewColorValue.set(this.boardColor());
    this.showColorPicker.set(false);
  }

  openColorPicker(event: Event): void {
    event.stopPropagation();
    this._previewColorValue.set(this.boardColor());
    this.showColorPicker.set(true);
  }

  // Getter para acceder al valor de preview en el template
  get previewColorValue(): string {
    return this._previewColorValue();
  }

  set previewColorValue(value: string) {
    this._previewColorValue.set(value);
  }
}
