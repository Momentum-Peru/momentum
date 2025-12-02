import { Component, OnInit, signal, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToolbarModule } from 'primeng/toolbar';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmationService } from 'primeng/api';

import {
  DocumentsApiService,
  ScanInvoiceResponse,
  PaymentVoucher,
} from '../../shared/services/documents-api.service';
import { Document, DocumentFilters } from '../../shared/interfaces/document.interface';
import { DocumentFormComponent } from './components/document-form/document-form';
import { DocumentListComponent } from './components/document-list/document-list';
import { DocumentFiltersComponent } from './components/document-filters/document-filters';
import { DocumentScannerComponent } from './components/document-scanner/document-scanner';
import { PaymentVoucherDialogComponent } from './components/payment-voucher-dialog/payment-voucher-dialog';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MenuService } from '../../shared/services/menu.service';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    ToolbarModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    InputTextModule,
    DocumentFormComponent,
    DocumentListComponent,
    DocumentFiltersComponent,
    DocumentScannerComponent,
    PaymentVoucherDialogComponent,
  ],
  templateUrl: './documents.html',
  styleUrl: './documents.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService, ConfirmationService],
})
export class DocumentsPage implements OnInit {
  private readonly documentsApi = inject(DocumentsApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly menuService = inject(MenuService);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // Verificar si el usuario tiene permiso de edición para este módulo
  readonly canEdit = computed(() => this.menuService.canEdit('/documents'));

  // Estado de la página
  documents = signal<Document[]>([]);
  loading = signal(false);
  showFormDialog = signal(false);
  showDetailsDialog = signal(false);
  showFilesDialog = signal(false);
  showScannerDialog = signal(false);
  showVoucherDialog = signal(false);
  editingDocument = signal<Document | null>(null);
  viewingDocument = signal<Document | null>(null);
  filesViewingDocument = signal<Document | null>(null);
  selectedFiles = signal<File[]>([]);
  currentFilters = signal<DocumentFilters>({});
  scannedInvoiceId = signal<string | null>(null);
  paymentVouchers = signal<PaymentVoucher[]>([]);
  editingVoucherId = signal<string | null>(null);
  editingVoucherNumeroOperacion = signal<string>('');

  // Paginación
  totalRecords = signal(0);
  currentPage = signal(1);
  pageSize = signal(10);
  first = signal(0);

  ngOnInit(): void {
    this.loadDocuments();
  }

  /**
   * Cargar documentos con filtros actuales
   */
  loadDocuments(): void {
    this.loading.set(true);

    const filters: DocumentFilters = {
      ...this.currentFilters(),
      page: this.currentPage(),
      limit: this.pageSize(),
    };

    this.documentsApi.list(filters).subscribe({
      next: (response) => {
        this.documents.set(response.documents);
        this.totalRecords.set(response.total);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        console.error('Error al cargar documentos:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los documentos',
        });
        this.loading.set(false);
      },
    });
  }

  /**
   * Manejar filtros aplicados
   */
  onFiltersApplied(filters: DocumentFilters): void {
    this.currentFilters.set(filters);
    this.currentPage.set(1);
    this.first.set(0);
    this.loadDocuments();
  }

  /**
   * Manejar cambio de página
   */
  onPageChange(event: { page: number; first: number; rows: number }): void {
    // event.page ya es 0-based desde el cálculo en document-list
    this.currentPage.set(event.page + 1);
    this.pageSize.set(event.rows);
    this.first.set(event.first);
    this.loadDocuments();
  }

  /**
   * Abrir formulario para crear documento
   */
  openCreateForm(): void {
    this.editingDocument.set(null);
    this.showFormDialog.set(true);
  }

  /**
   * Abrir diálogo de escaneo
   */
  openScannerDialog(): void {
    this.showScannerDialog.set(true);
  }

  /**
   * Cerrar diálogo de escaneo
   */
  closeScannerDialog(): void {
    this.showScannerDialog.set(false);
  }

  /**
   * Cerrar diálogo de voucher
   */
  closeVoucherDialog(): void {
    this.showVoucherDialog.set(false);
    this.scannedInvoiceId.set(null);
  }

  /**
   * Manejar voucher subido
   */
  onVoucherUploaded(response: { voucher: PaymentVoucher; document: Document }): void {
    this.closeVoucherDialog();
    this.loadDocuments(); // Recargar documentos para mostrar el voucher en los adjuntos

    // Si hay un documento en la respuesta, actualizar el documento actual si está siendo visualizado
    if (response.document && this.filesViewingDocument()?._id === response.document._id) {
      this.filesViewingDocument.set(response.document);
    }

    // Si el diálogo de detalles está abierto y es el mismo documento, recargar los vouchers
    if (response.document?._id && this.viewingDocument()?._id === response.document._id) {
      this.loadPaymentVouchers(response.document._id);
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: 'Voucher de pago subido correctamente y agregado a los documentos adjuntos',
    });
  }

  /**
   * Manejar escaneo completado
   */
  onScanComplete(response: ScanInvoiceResponse): void {
    this.closeScannerDialog();
    this.loadDocuments();

    // Verificar si es una factura y si se creó el documento
    const categoria = response.scannedData.categoria?.toLowerCase() || '';
    const isFactura = categoria.includes('factura');

    if (response.document && response.document._id) {
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: `Documento ${response.scannedData.categoria} creado correctamente`,
      });

      // Si es una factura, mostrar el diálogo para subir voucher
      if (isFactura) {
        this.scannedInvoiceId.set(response.document._id);
        this.showVoucherDialog.set(true);
      }
    } else {
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: `Documento ${response.scannedData.categoria} escaneado correctamente`,
      });
    }
  }

  /**
   * Abrir formulario para editar documento
   */
  openEditForm(document: Document): void {
    if (!document._id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El documento no tiene un ID válido',
      });
      return;
    }

    // Cargar el documento completo desde el backend para asegurar que tenga todos los datos
    this.loading.set(true);
    this.documentsApi.getById(document._id).subscribe({
      next: (fullDocument) => {
        this.editingDocument.set(fullDocument);
        this.showFormDialog.set(true);
        this.loading.set(false);
        // Cargar vouchers del documento para edición
        if (fullDocument._id) {
          this.loadPaymentVouchers(fullDocument._id);
        }
      },
      error: (error: unknown) => {
        console.error('Error al cargar documento:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el documento para editar',
        });
        this.loading.set(false);
      },
    });
  }

  /**
   * Cerrar formulario
   */
  closeFormDialog(): void {
    this.showFormDialog.set(false);
    this.editingDocument.set(null);
    this.paymentVouchers.set([]);
    this.editingVoucherId.set(null);
    this.editingVoucherNumeroOperacion.set('');
  }

  /**
   * Manejar documento guardado
   */
  onDocumentSaved(savedDocument: Document | null): void {
    const wasEditing = !!this.editingDocument();
    this.closeFormDialog();
    this.loadDocuments();
    
    // Si se creó un nuevo documento (no edición) y es factura, boleta o recibo por honorarios, mostrar diálogo de voucher
    if (savedDocument && savedDocument._id && !wasEditing) {
      const categoria = savedDocument.categoria?.toLowerCase() || '';
      const isFactura = categoria.includes('factura');
      const isBoleta = categoria.includes('boleta');
      const isReciboHonorarios = categoria.includes('recibo') && categoria.includes('honorario');
      
      if (isFactura || isBoleta || isReciboHonorarios) {
        this.scannedInvoiceId.set(savedDocument._id);
        this.showVoucherDialog.set(true);
      }
    }
  }

  /**
   * Confirmar eliminación de documento
   */
  confirmDelete(document: Document): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar el documento ${document.numeroDocumento}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.deleteDocument(document._id!);
      },
    });
  }

  /**
   * Eliminar documento
   */
  private deleteDocument(id: string): void {
    this.documentsApi.delete(id).subscribe({
      next: () => {
        this.loadDocuments();
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Documento eliminado correctamente',
        });
      },
      error: (error: unknown) => {
        console.error('Error al eliminar documento:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar el documento',
        });
      },
    });
  }

  /**
   * TrackBy function para optimizar renderizado de lista
   */
  trackByDocumentId(index: number, document: Document): string {
    return document._id || index.toString();
  }

  /**
   * Ver detalles del documento
   */
  viewDocumentDetails(document: Document): void {
    this.viewingDocument.set(document);
    this.showDetailsDialog.set(true);
    // Cargar vouchers del documento solo para visualización
    if (document._id) {
      this.loadPaymentVouchers(document._id);
    }
  }

  /**
   * Cargar vouchers de pago de un documento
   */
  loadPaymentVouchers(documentId: string): void {
    this.documentsApi.getPaymentVouchers(documentId).subscribe({
      next: (vouchers) => {
        this.paymentVouchers.set(vouchers);
      },
      error: (error: unknown) => {
        console.error('Error al cargar vouchers:', error);
        this.paymentVouchers.set([]);
      },
    });
  }

  /**
   * Cerrar modal de detalles
   */
  closeDetailsDialog(): void {
    this.showDetailsDialog.set(false);
    this.viewingDocument.set(null);
    this.paymentVouchers.set([]);
    this.editingVoucherId.set(null);
    this.editingVoucherNumeroOperacion.set('');
  }

  /**
   * Iniciar edición del número de operación de un voucher
   */
  startEditingVoucher(voucher: PaymentVoucher): void {
    this.editingVoucherId.set(voucher._id);
    this.editingVoucherNumeroOperacion.set(voucher.numeroOperacion || '');
  }

  /**
   * Cancelar edición del voucher
   */
  cancelEditingVoucher(): void {
    this.editingVoucherId.set(null);
    this.editingVoucherNumeroOperacion.set('');
  }

  /**
   * Guardar número de operación del voucher
   */
  saveVoucherNumeroOperacion(voucherId: string): void {
    const numeroOperacion = this.editingVoucherNumeroOperacion()?.trim() || undefined;
    
    this.documentsApi.updatePaymentVoucher(voucherId, numeroOperacion).subscribe({
      next: (updatedVoucher) => {
        // Actualizar el voucher en la lista
        const vouchers = this.paymentVouchers();
        const index = vouchers.findIndex(v => v._id === voucherId);
        if (index !== -1) {
          vouchers[index] = updatedVoucher;
          this.paymentVouchers.set([...vouchers]);
        }
        this.editingVoucherId.set(null);
        this.editingVoucherNumeroOperacion.set('');
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Número de operación actualizado correctamente',
        });
      },
      error: (error: unknown) => {
        console.error('Error al actualizar voucher:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el número de operación',
        });
      },
    });
  }

  /**
   * Eliminar voucher de pago
   */
  deletePaymentVoucher(voucherId: string): void {
    this.confirmationService.confirm({
      message: '¿Está seguro de que desea eliminar este voucher de pago?',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.documentsApi.deletePaymentVoucher(voucherId).subscribe({
          next: () => {
            // Remover el voucher de la lista
            const vouchers = this.paymentVouchers();
            this.paymentVouchers.set(vouchers.filter(v => v._id !== voucherId));
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Voucher eliminado correctamente',
            });
          },
          error: (error: unknown) => {
            console.error('Error al eliminar voucher:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar el voucher',
            });
          },
        });
      },
    });
  }

  /**
   * Abrir gestión de archivos
   */
  openFilesManagement(document: Document): void {
    this.filesViewingDocument.set(document);
    this.showFilesDialog.set(true);
  }

  /**
   * Cerrar modal de archivos
   */
  closeFilesDialog(): void {
    this.showFilesDialog.set(false);
    this.filesViewingDocument.set(null);
    this.selectedFiles.set([]);
  }

  /**
   * Manejar selección de archivos
   */
  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);

    // Validar tamaño de archivos (10MB máximo)
    const maxSize = 10 * 1024 * 1024; // 10MB en bytes
    const validFiles = files.filter((file) => {
      if (file.size > maxSize) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error de validación',
          detail: `El archivo ${file.name} es demasiado grande. Máximo 10MB.`,
        });
        return false;
      }
      return true;
    });

    this.selectedFiles.set(validFiles);
  }

  /**
   * Formatear tamaño de archivo
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Remover archivo seleccionado
   */
  removeSelectedFile(fileToRemove: File): void {
    const currentFiles = this.selectedFiles();
    const updatedFiles = currentFiles.filter((file) => file !== fileToRemove);
    this.selectedFiles.set(updatedFiles);
  }

  /**
   * Limpiar archivos seleccionados
   */
  clearSelectedFiles(): void {
    this.selectedFiles.set([]);
  }

  /**
   * Subir archivos seleccionados
   */
  uploadSelectedFiles(): void {
    const files = this.selectedFiles();
    const documentId = this.filesViewingDocument()?._id;

    if (!documentId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El documento debe estar guardado antes de subir archivos',
      });
      return;
    }

    if (!files || !files.length) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No hay archivos seleccionados para subir',
      });
      return;
    }

    // Subir todos los archivos en una sola request
    const formData = new FormData();
    files.forEach((file: File) => {
      formData.append('files', file);
    });

    this.http.post<Document>(`${this.baseUrl}/documents/${documentId}/upload`, formData).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `${files.length} archivo(s) subido(s) correctamente`,
        });
        this.loadDocuments(); // Recargar para obtener archivos actualizados
        // Actualizar el documento en el diálogo si está abierto
        const currentDocument = this.filesViewingDocument();
        if (currentDocument) {
          this.filesViewingDocument.set(response);
        }
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Error al subir archivos: ${this.getErrorMessage(error)}`,
        });
      },
    });

    this.clearSelectedFiles();
  }

  /**
   * Descargar archivo
   */
  downloadFile(url: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = url.split('/').pop() || 'archivo';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Ver archivo
   */
  viewFile(url: string): void {
    const newWindow = window.open(url, '_blank');
    if (!newWindow) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No se puede abrir el archivo directamente. Usa el botón de descarga.',
      });
    }
  }

  /**
   * Obtener icono de archivo
   */
  getFileIcon(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'pi pi-file-pdf';
      case 'doc':
      case 'docx':
        return 'pi pi-file-word';
      case 'xls':
      case 'xlsx':
        return 'pi pi-file-excel';
      case 'txt':
        return 'pi pi-file';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return 'pi pi-image';
      default:
        return 'pi pi-file';
    }
  }

  /**
   * Obtener color del tipo de archivo
   */
  getFileTypeColor(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'text-red-500';
      case 'doc':
      case 'docx':
        return 'text-blue-500';
      case 'xls':
      case 'xlsx':
        return 'text-green-500';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  }

  /**
   * Eliminar archivo
   */
  removeFile(url: string): void {
    const document = this.filesViewingDocument();
    if (!document || !document._id) {
      return;
    }

    if (!confirm('¿Estás seguro de eliminar este archivo?')) {
      return;
    }

    // Eliminar archivo usando el endpoint específico
    const payload = {
      fileUrl: url,
    };

    this.http
      .delete<Document>(`${this.baseUrl}/documents/${document._id}/files`, { body: payload })
      .subscribe({
        next: (updatedDocument) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Archivo eliminado correctamente',
          });
          this.loadDocuments();
          // Actualizar el documento en el diálogo si está abierto
          const currentDocument = this.filesViewingDocument();
          if (currentDocument) {
            this.filesViewingDocument.set(updatedDocument);
          }
        },
        error: (error: unknown) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getErrorMessage(error),
          });
        },
      });
  }

  /**
   * Obtener nombre del proyecto para mostrar en detalles
   */
  getProjectNameForDetails(document: Document | null): string {
    if (!document?.proyectoId) return 'No especificado';
    if (typeof document.proyectoId === 'string') {
      return 'Proyecto no encontrado';
    }
    return document.proyectoId.name;
  }

  /**
   * Serializa valores para mostrar en mensajes de error
   */
  private safeStringify(value: unknown): string | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return '[No se pudo serializar el valor del error]';
    }
  }

  /**
   * Obtener mensaje de error
   */
  private getErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    if (!error || typeof error !== 'object') {
      return 'Ha ocurrido un error inesperado';
    }

    const errorObject = error as { message?: unknown; error?: unknown };
    const message = typeof errorObject.message === 'string' ? errorObject.message : undefined;

    if (errorObject.error && typeof errorObject.error === 'object') {
      const nested = errorObject.error as { message?: unknown; error?: unknown };
      if (typeof nested.message === 'string') {
        return nested.message;
      }
      if (nested.error !== undefined) {
        const serialized = this.safeStringify(nested.error);
        if (serialized) {
          return serialized;
        }
      }
    } else if (typeof errorObject.error === 'string') {
      return errorObject.error;
    }

    if (message) {
      return message;
    }

    return 'Ha ocurrido un error inesperado';
  }
}
