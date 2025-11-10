import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import {
  Board,
  CreateBoardRequest,
  UpdateBoardRequest,
} from '../../../../shared/interfaces/board.interface';

/**
 * Componente de formulario de tablero
 * Principio de Responsabilidad Única: Solo maneja el formulario de crear/editar tablero
 */
@Component({
  selector: 'app-board-form',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, TextareaModule, ButtonModule],
  templateUrl: './board-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardFormComponent implements OnInit, OnChanges {
  @Input() board: Board | null = null;
  @Input() loading = signal<boolean>(false);
  @Output() save = new EventEmitter<CreateBoardRequest | UpdateBoardRequest>();
  @Output() cancelled = new EventEmitter<void>();

  public readonly isEditing = signal<boolean>(false);
  public formData: { title: string; description?: string } = {
    title: '',
    description: '',
  };

  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.updateFormData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['board']) {
      this.updateFormData();
    }
  }

  private updateFormData(): void {
    if (this.board) {
      this.isEditing.set(true);
      this.formData = {
        title: this.board.title,
        description: this.board.description || '',
      };
    } else {
      this.isEditing.set(false);
      this.formData = {
        title: '',
        description: '',
      };
    }
    // Forzar detección de cambios con OnPush
    this.cdr.markForCheck();
  }

  onSubmit(): void {
    if (!this.formData.title.trim()) {
      return;
    }

    const data: CreateBoardRequest | UpdateBoardRequest = {
      title: this.formData.title.trim(),
      description: this.formData.description?.trim() || undefined,
    };

    this.save.emit(data);
  }
}
