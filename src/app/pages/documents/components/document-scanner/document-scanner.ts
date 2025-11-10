import {
  Component,
  input,
  output,
  signal,
  inject,
  ChangeDetectionStrategy,
  ViewChild,
  AfterViewInit,
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
import {
  DocumentsApiService,
  ScanInvoiceResponse,
} from '../../../../shared/services/documents-api.service';
import {
  compressImage,
  ImageCompressionOptions,
} from '../../../../shared/utils/image-compression.util';

/**
 * Componente para escanear documentos usando LangChain
 * Principio de Responsabilidad Única: Solo maneja la funcionalidad de escaneo
 */
@Component({
  selector: 'app-document-scanner',
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
  ],
  templateUrl: './document-scanner.html',
  styleUrl: './document-scanner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentScannerComponent implements AfterViewInit {
  private readonly documentsApi = inject(DocumentsApiService);
  private readonly messageService = inject(MessageService);

  private readonly compressionOptions: ImageCompressionOptions = {
    maxWidth: 2000,
    maxHeight: 2000,
    quality: 0.82,
    maxSizeMB: 2.5,
    outputType: 'image/jpeg',
  };
  private readonly compressionThresholdBytes = 2.5 * 1024 * 1024;

  @ViewChild('fileUpload') fileUpload!: { fileInput?: { nativeElement?: HTMLInputElement }; input?: { nativeElement?: HTMLInputElement }; el?: { nativeElement?: HTMLElement } } | undefined;

  // Inputs
  visible = input.required<boolean>();
  proyectoId = input<string | undefined>(undefined);

  // Outputs
  scanComplete = output<ScanInvoiceResponse>();
  scanCancel = output<void>();
  visibleChange = output<boolean>();

  // Estado interno
  scanning = signal(false);
  progress = signal(0);
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);

  constructor() {
    // Effect para agregar atributo capture cuando el diálogo se abre y es móvil
    effect(() => {
      if (this.visible() && this.isMobileDevice()) {
        // Esperar a que el componente esté completamente renderizado
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

  ngAfterViewInit(): void {
    // Si el diálogo ya está visible al inicializar, agregar capture
    if (this.visible() && this.isMobileDevice()) {
      setTimeout(() => {
        this.addCaptureToFileInput();
      }, 200);
    }
  }

  /**
   * Agrega el atributo capture al input nativo del FileUpload
   */
  private addCaptureToFileInput(): void {
    // Intentar múltiples métodos para encontrar el input nativo
    // PrimeNG 20 puede tener diferentes estructuras internas según la versión

    let fileInput: HTMLInputElement | null = null;

    // Método 1: Acceder a través de ViewChild si está disponible
    if (this.fileUpload) {
      // Intentar diferentes propiedades internas del componente FileUpload
      const component = this.fileUpload;

      if (component.fileInput?.nativeElement) {
        fileInput = component.fileInput.nativeElement;
      } else if (component.input?.nativeElement) {
        fileInput = component.input.nativeElement;
      } else if (component.el?.nativeElement) {
        fileInput = component.el.nativeElement.querySelector('input[type="file"]');
      }
    }

    // Método 2: Buscar en el DOM dentro del diálogo visible
    if (!fileInput) {
      // Buscar todos los diálogos y encontrar el que contiene nuestro FileUpload
      const dialogs = document.querySelectorAll('p-dialog');
      for (const dialog of Array.from(dialogs)) {
        const input = dialog.querySelector('p-fileUpload input[type="file"]') as HTMLInputElement;
        if (input) {
          fileInput = input;
          break;
        }
      }
    }

    // Método 3: Buscar directamente en el body (último recurso)
    if (!fileInput) {
      fileInput = document.querySelector('p-fileUpload input[type="file"]') as HTMLInputElement;
    }

    // Agregar el atributo capture si encontramos el input y es móvil
    if (fileInput && fileInput instanceof HTMLInputElement && !fileInput.hasAttribute('capture')) {
      const isIOS = this.isIOSDevice();

      // En iOS, el atributo capture funciona mejor sin valor específico
      // Esto permite tanto cámara como selección de archivos/galería
      if (isIOS) {
        // Para iOS, usar capture sin valor permite más opciones
        fileInput.setAttribute('capture', '');
        // En iOS, Safari limita el accept, así que usamos solo image/* para mejor compatibilidad
        // pero permitiremos PDFs mediante validación en el código
        fileInput.setAttribute('accept', 'image/*,application/pdf');
      } else {
        // Para Android, también usar capture sin valor
        fileInput.setAttribute('capture', '');
        fileInput.setAttribute('accept', 'image/*,application/pdf');
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
   * Detecta si el dispositivo es iOS (iPhone/iPad)
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
        const errorMsg = 'No se pudo obtener el archivo. Por favor, intente nuevamente.';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMsg,
        });
        return;
      }

      console.log('Archivo seleccionado (móvil):', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: new Date(file.lastModified),
        isMobile: this.isMobileDevice(),
      });

    // Validar tipo de archivo (imágenes y PDFs)
    // Nota: En móviles, el tipo MIME puede estar vacío, así que validamos también por extensión
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

    // Obtener extensión del archivo
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));

    // Validar por tipo MIME o por extensión (para casos donde el tipo MIME está vacío)
    const isValidType = file.type && allowedTypes.includes(file.type);
    const isValidExtension = allowedExtensions.includes(fileExtension);

    // Si el tipo MIME está vacío (común en fotos tomadas desde móvil), validar por extensión
    if (!file.type || file.type === '') {
      if (!isValidExtension) {
        console.error('Formato de archivo no soportado:', {
          fileName: file.name,
          fileType: file.type,
          fileExtension: fileExtension,
          fileSize: file.size,
        });
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Formato de archivo no soportado (${fileExtension}). Use JPEG, PNG, WebP o PDF`,
        });
        return;
      }
      // Si la extensión es válida pero el tipo MIME está vacío, intentar corregirlo
      // Esto es común en fotos tomadas directamente desde el celular
      console.warn('Archivo con tipo MIME vacío detectado:', {
        fileName: file.name,
        fileExtension: fileExtension,
        fileSize: file.size,
      });
    } else if (!isValidType && !isValidExtension) {
      console.error('Formato de archivo no soportado:', {
        fileName: file.name,
        fileType: file.type,
        fileExtension: fileExtension,
        fileSize: file.size,
      });
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Formato de archivo no soportado (${
          file.type || fileExtension
        }). Use JPEG, PNG, WebP o PDF`,
      });
      return;
    }

    // Si es PDF, mostrar advertencia
    if (file.type === 'application/pdf' || fileExtension === '.pdf') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Los PDFs pueden tener menor precisión en el escaneo. Se recomienda usar imágenes.',
      });
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

    // Validar que el archivo no esté vacío
    if (file.size === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El archivo está vacío. Por favor, seleccione otro archivo.',
      });
      return;
    }

    // Normalizar el archivo si el tipo MIME está vacío (común en fotos desde móvil)
    const normalizedFile = this.normalizeFileType(file, fileExtension);
    this.selectedFile.set(normalizedFile);

      // Crear preview con manejo de errores usando el archivo normalizado
      const reader = new FileReader();
      reader.onerror = (error) => {
        const errorMsg = 'No se pudo leer el archivo. Por favor, intente con otro archivo.';
        console.error('Error al leer el archivo:', {
          error: error,
          fileName: normalizedFile.name,
          fileType: normalizedFile.type,
          fileSize: normalizedFile.size,
          isMobile: this.isMobileDevice(),
        });
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMsg,
        });
        this.removeFile();
      };
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          if (e.target?.result) {
            this.previewUrl.set(e.target.result as string);
            console.log('Preview creado exitosamente para:', normalizedFile.name);
          }
        } catch (error) {
          console.error('Error al crear preview:', error);
          this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'No se pudo generar la vista previa, pero el archivo se procesará.',
          });
        } finally {
          if (!this.scanning()) {
            void this.startScan();
          }
        }
      };
      // Usar el archivo normalizado para el preview
      reader.readAsDataURL(normalizedFile);
    } catch (error: unknown) {
      // Capturar cualquier error no manejado en el proceso
      const errorInfo = this.extractErrorInfo(error);
      const errorMsg = `Error inesperado al procesar el archivo: ${errorInfo.message || 'Error desconocido'}`;
      const details: Record<string, unknown> = {
        isMobile: this.isMobileDevice(),
      };
      if (errorInfo.message) {
        details['errorMessage'] = errorInfo.message;
      }
      if (errorInfo.stack) {
        details['errorStack'] = errorInfo.stack;
      }
      if (errorInfo.status !== undefined) {
        details['status'] = errorInfo.status;
      }
      if (errorInfo.statusText) {
        details['statusText'] = errorInfo.statusText;
      }

      console.error('Error general en onFileSelect:', {
        ...details,
        rawError: this.safeStringify(error),
      });
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMsg,
      });
      this.removeFile();
    }
  }

  /**
   * Normaliza el tipo MIME del archivo cuando está vacío
   * Esto es necesario para fotos tomadas directamente desde el celular
   */
  private normalizeFileType(file: File, extension: string): File {
    try {
      // Si el archivo ya tiene un tipo MIME válido, retornarlo sin cambios
      if (file.type && file.type !== '' && file.type !== 'application/octet-stream') {
        return file;
      }

      // Mapeo de extensiones a tipos MIME
      const extensionToMime: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf',
      };

      const normalizedExtension = extension.toLowerCase();
      const mimeType = extensionToMime[normalizedExtension];

      if (mimeType) {
        // Crear un nuevo File con el tipo MIME correcto
        // Nota: No podemos cambiar el tipo MIME de un File existente, así que creamos uno nuevo
        const normalizedFile = new File([file], file.name, {
          type: mimeType,
          lastModified: file.lastModified,
        });
        
        console.log('Archivo normalizado:', {
          originalName: file.name,
          originalType: file.type,
          normalizedType: normalizedFile.type,
          extension: normalizedExtension,
          size: normalizedFile.size,
        });
        
        return normalizedFile;
      }

      // Si no encontramos el tipo MIME, intentar inferirlo del contenido
      // Para imágenes desde móvil, asumir JPEG si no hay extensión clara
      if (this.isMobileDevice() && !mimeType) {
        console.warn('No se pudo determinar el tipo MIME, usando image/jpeg por defecto para móvil:', {
          fileName: file.name,
          extension: normalizedExtension,
        });
        return new File([file], file.name, {
          type: 'image/jpeg',
          lastModified: file.lastModified,
        });
      }

      // Si no encontramos el tipo MIME, retornar el archivo original
      // El backend debería poder manejar esto
      console.warn('No se pudo normalizar el tipo MIME del archivo:', {
        fileName: file.name,
        extension: normalizedExtension,
        originalType: file.type,
      });
      return file;
    } catch (error: unknown) {
      const errorInfo = this.extractErrorInfo(error);
      console.error('Error al normalizar el tipo de archivo:', {
        errorMessage: errorInfo.message,
        errorStack: errorInfo.stack,
        fileName: file.name,
        extension,
        originalType: file.type,
      });
      // En caso de error, retornar el archivo original
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

  private shouldCompress(file: File): boolean {
    const isImage = file.type?.startsWith('image/');
    if (!isImage) {
      return false;
    }
    return file.size > this.compressionThresholdBytes;
  }

  private async optimizeFileForScan(file: File): Promise<File> {
    if (!this.shouldCompress(file)) {
      return file;
    }

    const originalSize = file.size;

    try {
      const compressed = await compressImage(file, this.compressionOptions);

      if (compressed.size < originalSize) {
        console.log('Imagen optimizada antes del escaneo:', {
          originalSize: this.formatFileSize(originalSize),
          compressedSize: this.formatFileSize(compressed.size),
          originalName: file.name,
          compressedName: compressed.name,
        });

        this.messageService.add({
          severity: 'info',
          summary: 'Imagen optimizada',
          detail: `Tamaño reducido de ${this.formatFileSize(originalSize)} a ${this.formatFileSize(
            compressed.size
          )}`,
          life: 4000,
        });

        return compressed;
      }

      return file;
    } catch (error) {
      const errorInfo = this.extractErrorInfo(error);
      console.error('Fallo al comprimir la imagen:', {
        errorMessage: errorInfo.message,
        errorStack: errorInfo.stack,
        fileName: file.name,
      });
      throw error;
    }
  }

  /**
   * Limpia todos los campos del componente
   */
  private clearFields(): void {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.scanning.set(false);
    this.progress.set(0);

    // Limpiar el componente FileUpload si está disponible
    if (this.fileUpload) {
      try {
        (this.fileUpload as { clear?: () => void }).clear?.();
      } catch (error) {
        // Si el método clear no está disponible, intentar limpiar manualmente
        console.warn('No se pudo limpiar el FileUpload:', error);
      }
    }
  }

  /**
   * Inicia el proceso de escaneo
   */
  async startScan(): Promise<void> {
    const file = this.selectedFile();

    if (!file) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor, seleccione un archivo',
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

    if (this.scanning()) {
      this.messageService.add({
        severity: 'info',
        summary: 'Escaneo en progreso',
        detail: 'Ya estamos procesando el documento seleccionado.',
        life: 4000,
      });
      return;
    }

    console.log('Iniciando escaneo de archivo:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      lastModified: new Date(file.lastModified),
      proyectoId: this.proyectoId(),
    });

    let fileToUpload = file;

    try {
      fileToUpload = await this.optimizeFileForScan(file);
      if (fileToUpload !== file) {
        this.selectedFile.set(fileToUpload);
      }
    } catch (error) {
      const errorInfo = this.extractErrorInfo(error);
      console.error('Error durante la optimización del archivo:', {
        errorMessage: errorInfo.message,
        errorStack: errorInfo.stack,
        fileName: file.name,
      });
      this.messageService.add({
        severity: 'warn',
        summary: 'Compresión omitida',
        detail: 'No se pudo optimizar la imagen, se enviará el archivo original.',
        life: 5000,
      });
      fileToUpload = file;
    }

    const finalFile = fileToUpload;

    this.scanning.set(true);
    this.progress.set(0);

    const progressInterval = setInterval(() => {
      const currentProgress = this.progress();
      if (currentProgress < 90) {
        this.progress.set(currentProgress + 10);
      }
    }, 500);

    this.documentsApi.scanInvoice(finalFile, this.proyectoId(), true).subscribe({
      next: (response: ScanInvoiceResponse) => {
        clearInterval(progressInterval);
        this.progress.set(100);

        console.log('Escaneo completado exitosamente:', response);

        setTimeout(() => {
          this.scanComplete.emit(response);
          this.closeDialog();

          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Documento ${response.scannedData.categoria} escaneado correctamente`,
          });
        }, 500);
      },
      error: (error: unknown) => {
        clearInterval(progressInterval);
        this.scanning.set(false);
        this.progress.set(0);

        // Log detallado del error para debugging
        const errorInfo = this.extractErrorInfo(error);
        const errorDetails: Record<string, unknown> = {
          fileName: finalFile.name,
          fileType: finalFile.type,
          fileSize: finalFile.size,
          isMobile: this.isMobileDevice(),
          userAgent: navigator.userAgent,
        };
        if (errorInfo.message) {
          errorDetails['errorMessage'] = errorInfo.message;
        }
        if (errorInfo.status !== undefined) {
          errorDetails['errorStatus'] = errorInfo.status;
        }
        if (errorInfo.statusText) {
          errorDetails['errorStatusText'] = errorInfo.statusText;
        }
        if (errorInfo.stack) {
          errorDetails['errorStack'] = errorInfo.stack;
        }
        const errorPayload = (error && typeof error === 'object' && 'error' in (error as Record<string, unknown>))
          ? (error as { error?: unknown }).error
          : undefined;
        const serializedPayload = this.safeStringify(errorPayload);
        if (serializedPayload) {
          errorDetails['errorResponse'] = serializedPayload;
        }

        console.error('Error al escanear documento:', {
          ...errorDetails,
          rawError: this.safeStringify(error),
        });

        const errorMessage = this.getErrorMessage(error);

        this.messageService.add({
          severity: 'error',
          summary: 'Error al escanear',
          detail: errorMessage,
          life: 7000, // Mostrar el mensaje por 7 segundos
        });
      },
    });
  }

  /**
   * Cierra el diálogo
   */
  closeDialog(): void {
    this.clearFields();
    this.visibleChange.emit(false);
    this.scanCancel.emit();
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

    // Si el archivo tiene extensión, preservarla
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot > 0) {
      const extension = fileName.substring(lastDot);
      const nameWithoutExt = fileName.substring(0, lastDot);
      const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 3) + '...';
      return truncatedName + extension;
    }

    // Si no tiene extensión, truncar directamente
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
      return 'Ha ocurrido un error al escanear el documento. Por favor, intente nuevamente.';
    }

    const errorObject = error as {
      status?: unknown;
      isTimeout?: unknown;
      name?: unknown;
      message?: unknown;
      error?: unknown;
    };

    const status = typeof errorObject.status === 'number' ? errorObject.status : undefined;
    const isTimeout = errorObject.isTimeout === true;
    const name = typeof errorObject.name === 'string' ? errorObject.name : undefined;
    const directMessage = typeof errorObject.message === 'string' ? errorObject.message : undefined;

    // Errores de timeout o conexión
    if (status === 0 || isTimeout || name === 'TimeoutError') {
      if (directMessage && directMessage.includes('demasiado grande')) {
        return directMessage;
      }
      return 'El archivo es demasiado grande o la conexión es lenta. Por favor, intente con una imagen más pequeña (máximo 5MB recomendado) o verifique su conexión a internet.';
    }

    const serverError = errorObject.error;
    const serverMessage = this.extractErrorInfo(serverError).message;
    const serverNestedError =
      serverError && typeof serverError === 'object' && 'error' in (serverError as Record<string, unknown>)
        ? (serverError as { error?: unknown }).error
        : undefined;

    if (status !== undefined && status >= 400 && status < 500) {
      if (status === 413) {
        return 'El archivo es demasiado grande. Por favor, use un archivo más pequeño (máximo 10MB).';
      }
      if (status === 415) {
        return 'Formato de archivo no soportado. Use JPEG, PNG, WebP o PDF.';
      }
      if (serverMessage) {
        return serverMessage;
      }
      if (serverNestedError) {
        const nestedMessage = this.extractErrorInfo(serverNestedError).message;
        if (nestedMessage) {
          return nestedMessage;
        }
        const serializedNested = this.safeStringify(serverNestedError);
        if (serializedNested) {
          return serializedNested;
        }
      }
      return `Error al procesar el archivo (${status}). Por favor, verifique el formato y vuelva a intentar.`;
    }

    if (status !== undefined && status >= 500) {
      return 'Error en el servidor. Por favor, intente nuevamente más tarde.';
    }

    if (serverMessage) {
      return serverMessage;
    }

    if (serverNestedError) {
      const nestedMessage = this.extractErrorInfo(serverNestedError).message;
      if (nestedMessage) {
        return nestedMessage;
      }
      const serializedNested = this.safeStringify(serverNestedError);
      if (serializedNested) {
        return serializedNested;
      }
    }

    if (directMessage) {
      return directMessage;
    }

    return 'Ha ocurrido un error al escanear el documento. Por favor, intente nuevamente.';
  }

  private safeStringify(value: unknown): string | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[No se pudo serializar el valor]';
    }
  }

  private extractErrorInfo(error: unknown): {
    message?: string;
    stack?: string;
    status?: number;
    statusText?: string;
    name?: string;
  } {
    if (typeof error === 'string') {
      return { message: error };
    }

    if (!error || typeof error !== 'object') {
      return {};
    }

    const errorObject = error as {
      message?: unknown;
      stack?: unknown;
      status?: unknown;
      statusText?: unknown;
      name?: unknown;
    };

    return {
      message: typeof errorObject.message === 'string' ? errorObject.message : undefined,
      stack: typeof errorObject.stack === 'string' ? errorObject.stack : undefined,
      status: typeof errorObject.status === 'number' ? errorObject.status : undefined,
      statusText: typeof errorObject.statusText === 'string' ? errorObject.statusText : undefined,
      name: typeof errorObject.name === 'string' ? errorObject.name : undefined,
    };
  }
}
