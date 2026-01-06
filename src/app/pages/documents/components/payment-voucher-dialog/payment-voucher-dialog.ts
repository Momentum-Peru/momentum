import {
  Component,
  input,
  output,
  signal,
  inject,
  ChangeDetectionStrategy,
  ViewChild,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import {
  DocumentsApiService,
  PaymentVoucher,
} from '../../../../shared/services/documents-api.service';
import { Document } from '../../../../shared/interfaces/document.interface';
import {
  compressImage,
  ImageCompressionOptions,
} from '../../../../shared/utils/image-compression.util';

/**
 * Componente para capturar voucher de pago
 */
@Component({
  selector: 'app-payment-voucher-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    FileUploadModule,
    ProgressBarModule,
    DialogModule,
    CardModule,
    TooltipModule,
    ToastModule,
    InputTextModule,
  ],
  templateUrl: './payment-voucher-dialog.html',
  styleUrl: './payment-voucher-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentVoucherDialogComponent {
  private readonly documentsApi = inject(DocumentsApiService);
  private readonly messageService = inject(MessageService);

  private readonly compressionOptions: ImageCompressionOptions = {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.75,
    maxSizeMB: 1.5,
    outputType: 'image/jpeg',
  };
  private readonly compressionThresholdBytes = 1 * 1024 * 1024; // Comprimir archivos mayores a 1MB

  @ViewChild('fileUpload') fileUpload!:
    | {
        fileInput?: { nativeElement?: HTMLInputElement };
        input?: { nativeElement?: HTMLInputElement };
        el?: { nativeElement?: HTMLElement };
      }
    | undefined;

  // Inputs
  visible = input.required<boolean>();
  documentId = input.required<string>();

  // Outputs
  voucherUploaded = output<{ voucher: PaymentVoucher; document: Document }>();
  canceled = output<void>();
  visibleChange = output<boolean>();

  // Estado interno
  uploading = signal(false);
  progress = signal(0);
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  numeroOperacion = signal<string>('');

  constructor() {
    // Effect para agregar atributo capture cuando el diálogo se abre y es móvil
    effect(() => {
      if (this.visible() && this.isMobileDevice()) {
        setTimeout(() => {
          this.addCaptureToFileInput();
        }, 150);
      }
    });

    // Effect para limpiar campos cuando el modal se cierra
    effect(() => {
      if (!this.visible()) {
        this.clearFields();
      }
    });
  }

  /**
   * Agrega el atributo capture al input nativo del FileUpload
   */
  private addCaptureToFileInput(): void {
    let fileInput: HTMLInputElement | null = null;

    if (this.fileUpload) {
      const component = this.fileUpload;
      if (component.fileInput?.nativeElement) {
        fileInput = component.fileInput.nativeElement;
      } else if (component.input?.nativeElement) {
        fileInput = component.input.nativeElement;
      } else if (component.el?.nativeElement) {
        fileInput = component.el.nativeElement.querySelector('input[type="file"]');
      }
    }

    if (!fileInput) {
      const dialogs = document.querySelectorAll('p-dialog');
      for (const dialog of Array.from(dialogs)) {
        const input = dialog.querySelector('p-fileUpload input[type="file"]') as HTMLInputElement;
        if (input) {
          fileInput = input;
          break;
        }
      }
    }

    if (!fileInput) {
      fileInput = document.querySelector('p-fileUpload input[type="file"]') as HTMLInputElement;
    }

    if (fileInput && fileInput instanceof HTMLInputElement && !fileInput.hasAttribute('capture')) {
      const isIOS = this.isIOSDevice();
      if (isIOS) {
        fileInput.setAttribute('capture', '');
        fileInput.setAttribute('accept', 'image/*');
      } else {
        fileInput.setAttribute('capture', '');
        fileInput.setAttribute('accept', 'image/*');
      }
    }
  }

  /**
   * Detecta si el dispositivo es móvil
   */
  private isMobileDevice(): boolean {
    return (
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      (window.innerWidth <= 768 && 'ontouchstart' in window)
    );
  }

  /**
   * Detecta si el dispositivo es iOS
   */
  private isIOSDevice(): boolean {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  /**
   * Maneja la selección de archivo
   */
  onFileSelect(event: { files?: File[] }): void {
    try {
      const file = event.files?.[0] as File | undefined;

      if (!file) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo obtener el archivo. Por favor, intente nuevamente.',
        });
        return;
      }

      // Validar tipo de archivo (solo imágenes)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

      const fileName = file.name.toLowerCase();
      const fileExtension = fileName.substring(fileName.lastIndexOf('.'));

      const isValidType = file.type && allowedTypes.includes(file.type);
      const isValidExtension = allowedExtensions.includes(fileExtension);

      if (!file.type || file.type === '') {
        if (!isValidExtension) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Formato de archivo no soportado (${fileExtension}). Use JPEG, PNG o WebP`,
          });
          return;
        }
      } else if (!isValidType && !isValidExtension) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Formato de archivo no soportado (${
            file.type || fileExtension
          }). Use JPEG, PNG o WebP`,
        });
        return;
      }

      // Validar tamaño (10MB máximo)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'El archivo es demasiado grande. Máximo 10MB',
        });
        return;
      }

      if (file.size === 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'El archivo está vacío. Por favor, seleccione otro archivo.',
        });
        return;
      }

      const normalizedFile = this.normalizeFileType(file, fileExtension);
      this.selectedFile.set(normalizedFile);

      // Crear preview
      const reader = new FileReader();
      reader.onerror = () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo leer el archivo. Por favor, intente con otro archivo.',
        });
        this.removeFile();
      };
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          if (e.target?.result) {
            this.previewUrl.set(e.target.result as string);
          }
        } catch (error) {
          console.error('Error al crear preview:', error);
        }
      };
      reader.readAsDataURL(normalizedFile);
    } catch (error: unknown) {
      console.error('Error en onFileSelect:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al procesar el archivo',
      });
      this.removeFile();
    }
  }

  /**
   * Normaliza el tipo MIME del archivo cuando está vacío
   */
  private normalizeFileType(file: File, extension: string): File {
    try {
      if (file.type && file.type !== '' && file.type !== 'application/octet-stream') {
        return file;
      }

      const extensionToMime: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
      };

      const normalizedExtension = extension.toLowerCase();
      const mimeType = extensionToMime[normalizedExtension];

      if (mimeType) {
        return new File([file], file.name, {
          type: mimeType,
          lastModified: file.lastModified,
        });
      }

      if (this.isMobileDevice() && !mimeType) {
        return new File([file], file.name, {
          type: 'image/jpeg',
          lastModified: file.lastModified,
        });
      }

      return file;
    } catch (error: unknown) {
      console.error('Error al normalizar el tipo de archivo:', error);
      return file;
    }
  }

  /**
   * Elimina el archivo seleccionado
   */
  removeFile(): void {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
  }

  /**
   * Limpia todos los campos del componente
   */
  private clearFields(): void {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.numeroOperacion.set('');
    this.uploading.set(false);
    this.progress.set(0);
  }

  /**
   * Sube el voucher de pago
   */
  async uploadVoucher(): Promise<void> {
    const file = this.selectedFile();
    const documentId = this.documentId();
    const numeroOperacionValue = this.numeroOperacion()?.trim() || undefined;

    // Validar que al menos uno de los dos campos esté presente
    if (!file && !numeroOperacionValue) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor, seleccione una imagen del voucher o ingrese un número de operación',
      });
      return;
    }

    if (!documentId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo determinar el documento',
      });
      return;
    }

    if (this.uploading()) {
      return;
    }

    let fileToUpload: File | undefined = file || undefined;

    // Si hay archivo, optimizarlo si es necesario
    if (fileToUpload) {
      try {
        // Optimizar archivo si es necesario
        if (this.shouldCompress(fileToUpload)) {
          fileToUpload = await this.optimizeFileForUpload(fileToUpload);
        }
      } catch (error) {
        console.error('Error durante la optimización:', error);
        fileToUpload = file || undefined;
      }
    }

    this.uploading.set(true);
    this.progress.set(0);

    const progressInterval = setInterval(() => {
      const currentProgress = this.progress();
      if (currentProgress < 90) {
        this.progress.set(currentProgress + 10);
      }
    }, 300);

    this.documentsApi.uploadPaymentVoucher(documentId, fileToUpload, numeroOperacionValue).subscribe({
      next: (response: { voucher: PaymentVoucher; document: Document }) => {
        clearInterval(progressInterval);
        this.progress.set(100);

        setTimeout(() => {
          this.voucherUploaded.emit(response);
          this.closeDialog();

          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Voucher de pago subido correctamente',
          });
        }, 500);
      },
      error: (error: unknown) => {
        clearInterval(progressInterval);
        this.uploading.set(false);
        this.progress.set(0);

        const errorMessage = this.getErrorMessage(error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error al subir voucher',
          detail: errorMessage,
          life: 7000,
        });
      },
    });
  }

  /**
   * Determina si se debe comprimir el archivo
   */
  private shouldCompress(file: File): boolean {
    const isImage = file.type?.startsWith('image/');
    if (!isImage) {
      return false;
    }
    const isLargeFormat = ['image/png', 'image/heic', 'image/heif'].includes(file.type);
    return file.size > this.compressionThresholdBytes || isLargeFormat;
  }

  /**
   * Optimiza el archivo para subir
   */
  private async optimizeFileForUpload(file: File): Promise<File> {
    if (!this.shouldCompress(file)) {
      return file;
    }

    try {
      const compressed = await compressImage(file, this.compressionOptions);
      if (compressed.size < file.size) {
        return compressed;
      }
      return file;
    } catch (error) {
      console.error('Error al comprimir:', error);
      return file;
    }
  }

  /**
   * Cierra el diálogo
   */
  closeDialog(): void {
    this.clearFields();
    this.visibleChange.emit(false);
    this.canceled.emit();
  }

  /**
   * Formatea el tamaño del archivo
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Trunca el nombre del archivo si es muy largo
   */
  truncateFileName(fileName: string | undefined | null, maxLength = 25): string {
    if (!fileName) return '';
    if (fileName.length <= maxLength) return fileName;

    const lastDot = fileName.lastIndexOf('.');
    if (lastDot > 0) {
      const extension = fileName.substring(lastDot);
      const nameWithoutExt = fileName.substring(0, lastDot);
      const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 3) + '...';
      return truncatedName + extension;
    }

    return fileName.substring(0, maxLength - 3) + '...';
  }

  /**
   * Obtiene el mensaje de error
   */
  private getErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    if (!error || typeof error !== 'object') {
      return 'Ha ocurrido un error al subir el voucher. Por favor, intente nuevamente.';
    }

    const errorObject = error as { message?: unknown; error?: unknown; status?: unknown };
    const status = typeof errorObject.status === 'number' ? errorObject.status : undefined;

    if (status === 400) {
      const serverError = errorObject.error;
      if (serverError && typeof serverError === 'object' && 'message' in serverError) {
        return (serverError as { message: string }).message;
      }
      return 'Error en los datos enviados. Verifique que el archivo sea una imagen válida.';
    }

    if (status === 404) {
      return 'La factura no fue encontrada.';
    }

    const message = typeof errorObject.message === 'string' ? errorObject.message : undefined;
    if (message) {
      return message;
    }

    return 'Ha ocurrido un error al subir el voucher. Por favor, intente nuevamente.';
  }
}
