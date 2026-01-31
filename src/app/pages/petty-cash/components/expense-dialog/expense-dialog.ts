import {
  Component,
  output,
  input,
  signal,
  inject,
  effect,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { EXPENSE_CATEGORIES } from '../../../../shared/interfaces/petty-cash.interface';
import { CreateExpenseRequest } from '../../../../shared/interfaces/petty-cash.interface';
import { PresignedUploadService } from '../../../../shared/services/presigned-upload.service';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPT_TYPES =
  'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Diálogo de Nuevo Gasto.
 * Incluye subida de comprobante: fotos, videos, documentos; drag-and-drop en todo el modal; captura en móvil.
 */
@Component({
  selector: 'app-expense-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    ProgressBarModule,
  ],
  templateUrl: './expense-dialog.html',
  styleUrl: './expense-dialog.scss',
})
export class ExpenseDialogComponent {
  private readonly messageService = inject(MessageService);
  private readonly presignedUpload = inject(PresignedUploadService);

  visible = input.required<boolean>();
  closeDialog = output<void>();
  expenseSubmitted = output<CreateExpenseRequest>();

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  amount = signal(0);
  description = signal('');
  category = signal<string | undefined>(undefined);
  documentNumber = signal('');

  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  isDragging = signal(false);
  uploading = signal(false);
  uploadProgress = signal(0);

  readonly categoryOptions = EXPENSE_CATEGORIES.map((c) => ({ label: c, value: c }));

  constructor() {
    effect(() => {
      if (this.visible() && this.isMobileDevice()) {
        setTimeout(() => this.addCaptureToFileInput(), 200);
      }
    });
  }

  onClose(): void {
    this.closeDialog.emit();
  }

  async onSubmit(): Promise<void> {
    const desc = this.description().trim();
    if (!desc) return;
    if (this.amount() <= 0) return;

    const file = this.selectedFile();
    let receiptAttachmentUrl: string | undefined;

    if (file) {
      this.uploading.set(true);
      this.uploadProgress.set(0);
      try {
        const result = await this.presignedUpload.uploadFile(file, {
          prefix: 'petty-cash/receipts',
          onProgress: (p) => this.uploadProgress.set(p),
        });
        receiptAttachmentUrl = result.publicUrl;
      } catch (err) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err instanceof Error ? err.message : 'No se pudo subir el comprobante',
        });
        this.uploading.set(false);
        this.uploadProgress.set(0);
        return;
      }
      this.uploading.set(false);
      this.uploadProgress.set(0);
    }

    this.expenseSubmitted.emit({
      amount: this.amount(),
      description: desc,
      category: this.category() || undefined,
      documentNumber: this.documentNumber().trim() || undefined,
      receiptAttachmentUrl,
    });
  }

  reset(): void {
    this.amount.set(0);
    this.description.set('');
    this.category.set(undefined);
    this.documentNumber.set('');
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.uploading.set(false);
    this.uploadProgress.set(0);
  }

  // ——— Drag and drop (todo el modal) ———
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length > 0) this.processFiles(files);
  }

  onPaste(event: ClipboardEvent): void {
    const target = event.target as HTMLElement;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target as HTMLElement).isContentEditable
    ) {
      return;
    }
    const items = event.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      event.preventDefault();
      this.processFiles(files);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      this.processFiles(Array.from(input.files));
      input.value = '';
    }
  }

  triggerFileSelect(): void {
    this.fileInputRef?.nativeElement?.click();
  }

  private processFiles(files: File[]): void {
    const file = files[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      this.messageService.add({
        severity: 'error',
        summary: 'Archivo muy grande',
        detail: `Máximo ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
      return;
    }
    this.selectedFile.set(file);
    this.createPreview(file);
  }

  private createPreview(file: File): void {
    const type = this.getFileType(file.name);
    if (type !== 'image' && type !== 'video') {
      this.previewUrl.set(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (e.target?.result) this.previewUrl.set(e.target.result as string);
    };
    reader.readAsDataURL(file);
  }

  removeFile(): void {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileType(fileName: string): 'image' | 'video' | 'document' {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const image = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic'];
    const video = ['mp4', 'avi', 'mov', 'wmv', 'webm', 'mkv'];
    if (image.includes(ext)) return 'image';
    if (video.includes(ext)) return 'video';
    return 'document';
  }

  getFileIcon(fileName: string): string {
    switch (this.getFileType(fileName)) {
      case 'image':
        return 'pi pi-image';
      case 'video':
        return 'pi pi-video';
      default:
        return 'pi pi-file';
    }
  }

  get acceptTypes(): string {
    return ACCEPT_TYPES;
  }

  private isMobileDevice(): boolean {
    return (
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      (typeof window !== 'undefined' && window.innerWidth <= 768 && 'ontouchstart' in window)
    );
  }

  private addCaptureToFileInput(): void {
    const el = this.fileInputRef?.nativeElement;
    if (el && el instanceof HTMLInputElement && !el.hasAttribute('capture')) {
      el.setAttribute('capture', '');
    }
  }
}
