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
import { SelectModule } from 'primeng/select';
import {
  Board,
  CreateBoardRequest,
  UpdateBoardRequest,
} from '../../../../shared/interfaces/board.interface';
import { Area } from '../../../../shared/interfaces/area.interface';

/**
 * Componente de formulario de tablero
 * Principio de Responsabilidad Única: Solo maneja el formulario de crear/editar tablero
 */
@Component({
  selector: 'app-board-form',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, TextareaModule, ButtonModule, SelectModule],
  templateUrl: './board-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardFormComponent implements OnInit, OnChanges {
  @Input() board: Board | null = null;
  @Input() loading = signal<boolean>(false);
  @Input() visible = false;
  @Input() areas: Area[] = [];
  /** ID de área pre-seleccionada al crear desde la vista de área */
  @Input() defaultAreaId: string | undefined = undefined;
  @Output() save = new EventEmitter<CreateBoardRequest | UpdateBoardRequest>();
  @Output() cancelled = new EventEmitter<void>();

  public readonly isEditing = signal<boolean>(false);
  public formData: { title: string; description?: string; areaId?: string | null } = {
    title: '',
    description: '',
    areaId: null,
  };

  /** Opciones para el dropdown de áreas */
  get areaOptions(): { label: string; value: string | null }[] {
    return [
      { label: 'Sin área', value: null },
      ...this.areas.map(a => ({ label: a.nombre, value: a._id ?? null })),
    ];
  }

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

      if (currentVisible && !previousVisible && !this.board) {
        this.formData = {
          title: '',
          description: '',
          areaId: this.defaultAreaId ?? null,
        };
        this.isEditing.set(false);
        this.cdr.markForCheck();
        if (changes['board']) {
          return;
        }
      }

      this.previousVisible = currentVisible;
    }

    if (changes['board']) {
      this.updateFormData();
    }

    if (changes['defaultAreaId'] && !this.board) {
      this.formData = { ...this.formData, areaId: this.defaultAreaId ?? null };
      this.cdr.markForCheck();
    }
  }

  private updateFormData(): void {
    if (this.board) {
      this.isEditing.set(true);
      // Extraer areaId ya sea string u objeto populado
      let areaId: string | null = null;
      if (this.board.areaId) {
        areaId = typeof this.board.areaId === 'string'
          ? this.board.areaId
          : this.board.areaId._id;
      }
      this.formData = {
        title: this.board.title,
        description: this.board.description || '',
        areaId,
      };
    } else {
      this.isEditing.set(false);
      this.formData = {
        title: '',
        description: '',
        areaId: this.defaultAreaId ?? null,
      };
    }
    this.cdr.markForCheck();
  }

  onSubmit(): void {
    if (!this.formData.title.trim()) {
      return;
    }

    const data: CreateBoardRequest | UpdateBoardRequest = {
      title: this.formData.title.trim(),
      description: this.formData.description?.trim() || undefined,
      areaId: this.formData.areaId ?? undefined,
    };

    const wasEditing = this.isEditing();

    this.save.emit(data);

    if (!wasEditing) {
      this.formData = {
        title: '',
        description: '',
        areaId: this.defaultAreaId ?? null,
      };
      this.cdr.markForCheck();
    }
  }
}
