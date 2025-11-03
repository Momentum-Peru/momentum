import { Component, input, output, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { DocumentsApiService, ScanInvoiceResponse } from '../../../../shared/services/documents-api.service';

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
export class DocumentScannerComponent {
  private readonly documentsApi = inject(DocumentsApiService);
  private readonly messageService = inject(MessageService);

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

  /**
   * Maneja la selección de archivo
   */
  onFileSelect(event: any): void {
    const file = event.files?.[0] as File | undefined;
    
    if (!file) {
      return;
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Formato de archivo no soportado. Use JPEG, PNG o WebP',
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

