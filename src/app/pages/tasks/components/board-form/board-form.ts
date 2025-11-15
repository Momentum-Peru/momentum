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
  @Input() visible = false;
  @Output() save = new EventEmitter<CreateBoardRequest | UpdateBoardRequest>();
  @Output() cancelled = new EventEmitter<void>();

  public readonly isEditing = signal<boolean>(false);
  public formData: { title: string; description?: string } = {
    title: '',
    description: '',
  };

  private readonly cdr = inject(ChangeDetectorRef);
  private previousVisible = false;

  ngOnInit(): void {
    this.updateFormData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Limpiar el formulario cuando el diálogo se abre para crear un nuevo tablero
    if (changes['visible']) {
      const currentVisible = this.visible;
      const previousVisible = changes['visible'].previousValue ?? false;

      // Si el diálogo se abre (visible cambia de false a true) y no hay board para editar
      if (currentVisible && !previousVisible && !this.board) {
        this.formData = {
          title: '',
          description: '',
        };
        this.isEditing.set(false);
        this.cdr.markForCheck();
        // Si también cambió board, no procesarlo porque estamos creando
        if (changes['board']) {
          return;
        }
      }

      this.previousVisible = currentVisible;
    }

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

    const wasEditing = this.isEditing();

    this.save.emit(data);

    // Limpiar el formulario después de crear (no después de editar)
    if (!wasEditing) {
      this.formData = {
        title: '',
        description: '',
      };
      this.cdr.markForCheck();
    }
  }
}
