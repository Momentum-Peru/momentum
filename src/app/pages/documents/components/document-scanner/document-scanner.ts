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
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import {
  DocumentsApiService,
  ScanInvoiceResponse,
} from '../../../../shared/services/documents-api.service';

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
    ConfirmDialogModule,
    ToastModule,
  ],
  templateUrl: './document-scanner.html',
  styleUrl: './document-scanner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
})
export class DocumentScannerComponent implements AfterViewInit {
  private readonly documentsApi = inject(DocumentsApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  @ViewChild('fileUpload') fileUpload!: any;

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
      const component = this.fileUpload as any;

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
  onFileSelect(event: any): void {
    try {
      const file = event.files?.[0] as File | undefined;

      if (!file) {
        const errorMsg = 'No se pudo obtener el archivo. Por favor, intente nuevamente.';
        this.showErrorAlert('Error al seleccionar archivo', errorMsg, {
          event: event,
          files: event.files,
        });
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
        this.showErrorAlert('Error al leer archivo', errorMsg, {
          error: error,
          fileName: normalizedFile.name,
          fileType: normalizedFile.type,
          fileSize: normalizedFile.size,
        });
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMsg,
        });
        this.removeFile();
      };
      reader.onload = (e: any) => {
        try {
          this.previewUrl.set(e.target.result);
          console.log('Preview creado exitosamente para:', normalizedFile.name);
        } catch (error) {
          console.error('Error al crear preview:', error);
          this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'No se pudo generar la vista previa, pero el archivo se procesará.',
          });
        }
      };
      // Usar el archivo normalizado para el preview
      reader.readAsDataURL(normalizedFile);
    } catch (error: any) {
      // Capturar cualquier error no manejado en el proceso
      const errorMsg = `Error inesperado al procesar el archivo: ${error?.message || 'Error desconocido'}`;
      console.error('Error general en onFileSelect:', {
        error: error,
        errorMessage: error?.message,
        errorStack: error?.stack,
        isMobile: this.isMobileDevice(),
      });
      this.showErrorAlert('Error al procesar archivo', errorMsg, {
        error: error,
        errorMessage: error?.message,
        errorStack: error?.stack,
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
    } catch (error: any) {
      console.error('Error al normalizar el tipo de archivo:', {
        error: error,
        fileName: file.name,
        extension: extension,
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
        this.fileUpload.clear();
      } catch (error) {
        // Si el método clear no está disponible, intentar limpiar manualmente
        console.warn('No se pudo limpiar el FileUpload:', error);
      }
    }
  }

  /**
   * Inicia el proceso de escaneo
   */
  startScan(): void {
    const file = this.selectedFile();

    if (!file) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor, seleccione un archivo',
      });
      return;
    }

    // Validar archivo antes de enviar
    if (file.size === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El archivo está vacío. Por favor, seleccione otro archivo.',
      });
      return;
    }

    // Log información del archivo para debugging
    console.log('Iniciando escaneo de archivo:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      lastModified: new Date(file.lastModified),
      proyectoId: this.proyectoId(),
    });

    this.scanning.set(true);
    this.progress.set(0);

    // Simular progreso
    const progressInterval = setInterval(() => {
      const currentProgress = this.progress();
      if (currentProgress < 90) {
        this.progress.set(currentProgress + 10);
      }
    }, 500);

    // Realizar escaneo
    this.documentsApi.scanInvoice(file, this.proyectoId(), true).subscribe({
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
      error: (error: any) => {
        clearInterval(progressInterval);
        this.scanning.set(false);
        this.progress.set(0);

        // Log detallado del error para debugging
        const errorDetails = {
          error: error,
          errorMessage: error?.message,
          errorStatus: error?.status,
          errorStatusText: error?.statusText,
          errorResponse: error?.error,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          isMobile: this.isMobileDevice(),
          userAgent: navigator.userAgent,
        };

        console.error('Error al escanear documento:', errorDetails);

        const errorMessage = this.getErrorMessage(error);
        
        // Mostrar alerta con detalles del error
        this.showErrorAlert('Error al escanear documento', errorMessage, errorDetails);

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
  truncateFileName(fileName: string | undefined | null, maxLength: number = 25): string {
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
  private getErrorMessage(error: any): string {
    // Errores de timeout o conexión
    if (error.status === 0 || error.isTimeout || error.name === 'TimeoutError') {
      // Si el error tiene un mensaje personalizado de timeout, usarlo
      if (error.message && error.message.includes('demasiado grande')) {
        return error.message;
      }
      return 'El archivo es demasiado grande o la conexión es lenta. Por favor, intente con una imagen más pequeña (máximo 5MB recomendado) o verifique su conexión a internet.';
    }

    // Errores HTTP 4xx
    if (error.status >= 400 && error.status < 500) {
      if (error.status === 413) {
        return 'El archivo es demasiado grande. Por favor, use un archivo más pequeño (máximo 10MB).';
      }
      if (error.status === 415) {
        return 'Formato de archivo no soportado. Use JPEG, PNG, WebP o PDF.';
      }
      if (error.error?.message) {
        return error.error.message;
      }
      if (error.error?.error) {
        return typeof error.error.error === 'string'
          ? error.error.error
          : JSON.stringify(error.error.error);
      }
      return `Error al procesar el archivo (${error.status}). Por favor, verifique el formato y vuelva a intentar.`;
    }

    // Errores HTTP 5xx
    if (error.status >= 500) {
      return 'Error en el servidor. Por favor, intente nuevamente más tarde.';
    }

    // Mensajes de error específicos
    if (error.error?.message) {
      return error.error.message;
    }
    if (error.error?.error) {
      return typeof error.error.error === 'string'
        ? error.error.error
        : JSON.stringify(error.error.error);
    }
    if (error.message) {
      return error.message;
    }

    // Mensaje por defecto
    return 'Ha ocurrido un error al escanear el documento. Por favor, intente nuevamente.';
  }

  /**
   * Muestra un diálogo de confirmación con detalles del error
   * Esto ayuda a diagnosticar problemas, especialmente en móviles
   */
  private showErrorAlert(title: string, message: string, details?: any): void {
    // Construir mensaje detallado
    let detailedMessage = message;
    
    if (details) {
      const detailsStr = JSON.stringify(details, null, 2);
      detailedMessage += `\n\nDetalles técnicos:\n${detailsStr}`;
    }

    // Usar confirmación de PrimeNG para mostrar el error
    this.confirmationService.confirm({
      message: detailedMessage,
      header: title,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Entendido',
      rejectVisible: false,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        console.log('Usuario confirmó el error');
      },
    });
  }
}
