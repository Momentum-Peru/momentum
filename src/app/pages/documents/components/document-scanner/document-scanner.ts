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
  ],
  templateUrl: './document-scanner.html',
  styleUrl: './document-scanner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentScannerComponent implements AfterViewInit {
  private readonly documentsApi = inject(DocumentsApiService);
  private readonly messageService = inject(MessageService);

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
    const file = event.files?.[0] as File | undefined;

    if (!file) {
      return;
    }

    // Validar tipo de archivo (imágenes y PDFs)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Formato de archivo no soportado. Use JPEG, PNG, WebP o PDF',
      });
      return;
    }

    // Si es PDF, mostrar advertencia
    if (file.type === 'application/pdf') {
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

    this.selectedFile.set(file);

    // Crear preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.previewUrl.set(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  /**
   * Elimina el archivo seleccionado
   */
  removeFile(): void {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
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

        setTimeout(() => {
          this.scanning.set(false);
          this.progress.set(0);
          this.selectedFile.set(null);
          this.previewUrl.set(null);
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

        const errorMessage = this.getErrorMessage(error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error al escanear',
          detail: errorMessage,
        });
      },
    });
  }

  /**
   * Cierra el diálogo
   */
  closeDialog(): void {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.scanning.set(false);
    this.progress.set(0);
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
   * Obtiene el mensaje de error
   */
  private getErrorMessage(error: any): string {
    if (error.error?.message) {
      return error.error.message;
    }
    if (error.error?.error) {
      return error.error.error;
    }
    if (error.message) {
      return error.message;
    }
    return 'Ha ocurrido un error al escanear el documento. Por favor, intente nuevamente.';
  }
}
