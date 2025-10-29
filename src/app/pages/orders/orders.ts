import { ChangeDetectionStrategy, Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { UploadService } from '../../shared/services/upload.service';
import { ClientsApiService, ClientOption } from '../../shared/services/clients-api.service';
import { SelectModule } from 'primeng/select';

interface OrderItem {
  _id?: string;
  clientId: string;
  clientName: string;
  number: string;
  type: 'purchase' | 'service';
  documents?: string[];
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    DialogModule,
    FileUploadModule,
    TooltipModule,
    ToastModule,
    SelectModule,
  ],
  templateUrl: './orders.html',
  styleUrls: ['./orders.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersPage {
  private readonly http = inject(HttpClient);
  private readonly upload = inject(UploadService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly baseUrl = environment.apiUrl;
  private readonly messageService = inject(MessageService);

  items = signal<OrderItem[]>([]);
  clients = signal<ClientOption[]>([]);
  query = signal<string>('');
  showDialog = signal<boolean>(false);
  showDocumentsDialog = signal<boolean>(false);
  showDetailsDialog = signal<boolean>(false);
  editing = signal<OrderItem | null>(null);
  documentsViewing = signal<OrderItem | null>(null);
  viewingOrder = signal<OrderItem | null>(null);
  selectedFiles = signal<File[]>([]);
  expandedRows = signal<Set<string>>(new Set());

  // Opciones para dropdowns
  tipos = [
    { label: 'Compra', value: 'purchase' },
    { label: 'Servicio', value: 'service' },
  ];

  ngOnInit() {
    this.load();
    this.clientsApi.list().subscribe({
      next: (v) => this.clients.set(v),
      error: (error) => {
        console.error('Error loading clients:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los clientes',
        });
      },
    });
  }

  constructor() {
    // Efecto para manejar el cierre del diálogo principal
    effect(() => {
      if (!this.showDialog()) {
        this.editing.set(null);
      }
    });

    // Efecto para manejar el cierre del diálogo de documentos
    effect(() => {
      if (!this.showDocumentsDialog()) {
        this.documentsViewing.set(null);
        this.selectedFiles.set([]);
      }
    });

    // Efecto para manejar el cierre del diálogo de detalles
    effect(() => {
      if (!this.showDetailsDialog()) {
        this.viewingOrder.set(null);
      }
    });
  }
  load() {
    const q = this.query();
    const url = q ? `${this.baseUrl}/orders?q=${encodeURIComponent(q)}` : `${this.baseUrl}/orders`;
    this.http.get<OrderItem[]>(url).subscribe({
      next: (v) => this.items.set(v),
      error: (error) => {
        console.error('Error loading orders:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar las órdenes',
        });
      },
    });
  }
  setQuery(v: string) {
    this.query.set(v);
    this.load();
  }
  newItem() {
    this.editing.set({
      clientId: '',
      clientName: '',
      number: '',
      type: 'purchase',
      documents: [],
    });
    this.showDialog.set(true);
  }

  editItem(item: OrderItem) {
    this.editing.set({ ...item });
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  onEditChange<K extends keyof OrderItem>(key: K, value: OrderItem[K]) {
    const cur = this.editing();
    if (!cur) return;
    this.editing.set({ ...cur, [key]: value });
  }

  onClientChange(clientId: string) {
    const client = this.clients().find((c) => c._id === clientId);
    this.onEditChange('clientId', clientId);
    this.onEditChange('clientName', client ? client.name : '');
  }

  save() {
    const item = this.editing();
    if (!item) return;

    // Validar campos requeridos
    const validationErrors = this.validateForm(item);
    if (validationErrors.length > 0) {
      validationErrors.forEach((error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error de validación',
          detail: error,
        });
      });
      return;
    }

    // Limpiar datos antes de enviar
    const payload = {
      clientId: item.clientId?.trim(),
      clientName: item.clientName?.trim(),
      number: item.number?.trim(),
      type: item.type,
    };

    console.log('Payload enviado:', payload); // Debug

    const req = item._id
      ? this.http.patch<OrderItem>(`${this.baseUrl}/orders/${item._id}`, payload)
      : this.http.post<OrderItem>(`${this.baseUrl}/orders`, payload);

    req.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: item._id ? 'Orden actualizada correctamente' : 'Orden creada correctamente',
        });
        this.closeDialog();
        this.load();
      },
      error: (error) => {
        console.error('Error al guardar:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.getErrorMessage(error),
        });
      },
    });
  }

  remove(item: OrderItem) {
    if (confirm('¿Estás seguro de eliminar esta orden?')) {
      this.http.delete(`${this.baseUrl}/orders/${item._id}`).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Orden eliminada correctamente',
          });
          this.load();
        },
        error: (error) => {
          console.error('Error al eliminar orden:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getErrorMessage(error),
          });
        },
      });
    }
  }

  openDocuments(item: OrderItem) {
    this.documentsViewing.set(item);
    this.showDocumentsDialog.set(true);
  }

  closeDocuments() {
    this.showDocumentsDialog.set(false);
  }

  viewDetails(order: OrderItem) {
    this.viewingOrder.set(order);
    this.showDetailsDialog.set(true);
  }

  closeDetails() {
    this.showDetailsDialog.set(false);
  }

  onFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);

    console.log('Archivos seleccionados:', files);

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

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  removeSelectedFile(fileToRemove: File) {
    const currentFiles = this.selectedFiles();
    const updatedFiles = currentFiles.filter((file) => file !== fileToRemove);
    this.selectedFiles.set(updatedFiles);
  }

  clearSelectedFiles() {
    this.selectedFiles.set([]);
  }

  uploadSelectedFiles() {
    const files = this.selectedFiles();
    const orderId = this.documentsViewing()?._id;

    console.log('Subiendo archivos:', files);
    console.log('Order ID:', orderId);

    if (!orderId) {
      console.error('No se puede subir documento: la orden no tiene ID');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'La orden debe estar guardada antes de subir documentos',
      });
      return;
    }

    if (!files || !files.length) {
      console.error('No se pueden subir documentos: no hay archivos seleccionados');
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No hay archivos seleccionados para subir',
      });
      return;
    }

    // Subir cada archivo individualmente usando el endpoint de la API
    files.forEach((file: File, index: number) => {
      console.log(`Subiendo archivo ${index + 1}:`, file.name);
      const formData = new FormData();
      formData.append('file', file);

      this.http.post(`${this.baseUrl}/orders/${orderId}/documents`, formData).subscribe({
        next: (response) => {
          console.log(`Documento ${file.name} subido exitosamente:`, response);
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Documento ${file.name} subido correctamente`,
          });
          this.load(); // Recargar para obtener documentos actualizados
        },
        error: (error) => {
          console.error(`Error al subir documento ${file.name}:`, error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Error al subir ${file.name}: ${this.getErrorMessage(error)}`,
          });
        },
      });
    });

    // Limpiar archivos seleccionados después de la subida
    this.clearSelectedFiles();
  }

  downloadDocument(url: string) {
    console.log('Descargando documento:', url);

    // Crear un enlace temporal para descargar el archivo
    const link = document.createElement('a');
    link.href = url;
    link.download = url.split('/').pop() || 'documento';
    link.target = '_blank';

    // Agregar al DOM temporalmente y hacer clic
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  viewDocument(url: string) {
    console.log('Viendo documento:', url);

    // Intentar abrir en una nueva pestaña
    const newWindow = window.open(url, '_blank');

    // Si no se puede abrir (por ejemplo, por políticas de CORS), mostrar mensaje
    if (!newWindow) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No se puede abrir el documento directamente. Usa el botón de descarga.',
      });
    }
  }

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

  removeDocument(url: string) {
    const order = this.documentsViewing();
    if (!order || !order._id) {
      console.error('No se puede eliminar documento: la orden no tiene ID');
      return;
    }

    if (!confirm('¿Estás seguro de eliminar este documento?')) {
      return;
    }

    // Filtrar el documento del array
    const updatedDocuments = order.documents?.filter((doc) => doc !== url) || [];

    // Actualizar la orden con la nueva lista de documentos
    const payload = {
      documents: updatedDocuments,
    };

    this.http.patch<OrderItem>(`${this.baseUrl}/orders/${order._id}`, payload).subscribe({
      next: () => {
        console.log('Documento eliminado exitosamente');
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Documento eliminado correctamente',
        });
        this.load(); // Recargar para obtener la lista actualizada
        // Actualizar la orden en el diálogo si está abierto
        const currentOrder = this.documentsViewing();
        if (currentOrder) {
          this.documentsViewing.set({
            ...currentOrder,
            documents: updatedDocuments,
          });
        }
      },
      error: (error) => {
        console.error('Error al eliminar documento:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.getErrorMessage(error),
        });
      },
    });
  }

  // Método para validar el formulario
  private validateForm(item: OrderItem): string[] {
    const errors: string[] = [];

    // Validar cliente
    if (!item.clientId || item.clientId.trim() === '') {
      errors.push('El cliente es requerido');
    }

    // Validar nombre del cliente
    if (!item.clientName || item.clientName.trim() === '') {
      errors.push('El nombre del cliente es requerido');
    }

    // Validar número
    if (!item.number || item.number.trim() === '') {
      errors.push('El número de orden es requerido');
    }

    // Validar tipo
    if (!item.type || (item.type !== 'purchase' && item.type !== 'service')) {
      errors.push('El tipo debe ser "purchase" o "service"');
    }

    return errors;
  }

  // Método para obtener mensaje de error de la API
  private getErrorMessage(error: any): string {
    // Manejar errores de validación específicos
    if (error.error?.message) {
      const message = error.error.message;

      // Si es un array de mensajes, unirlos
      if (Array.isArray(message)) {
        return message.join(', ');
      }

      // Traducir mensajes comunes de validación
      if (message.includes('clientId should not be empty')) {
        return 'El cliente es requerido';
      }
      if (message.includes('clientName should not be empty')) {
        return 'El nombre del cliente es requerido';
      }
      if (message.includes('number should not be empty')) {
        return 'El número de orden es requerido';
      }
      if (message.includes('type must be one of the following values')) {
        return 'El tipo debe ser "purchase" o "service"';
      }

      return message;
    }

    if (error.error?.error) {
      return error.error.error;
    }

    if (error.message) {
      return error.message;
    }

    return 'Ha ocurrido un error inesperado';
  }

  /**
   * Alterna la expansión de una fila del accordion
   */
  toggleRow(rowId: string | undefined): void {
    if (!rowId) return;
    const expanded = new Set(this.expandedRows());
    if (expanded.has(rowId)) {
      expanded.delete(rowId);
    } else {
      expanded.add(rowId);
    }
    this.expandedRows.set(expanded);
  }

  /**
   * Verifica si una fila está expandida
   */
  isRowExpanded(rowId: string | undefined): boolean {
    if (!rowId) return false;
    return this.expandedRows().has(rowId);
  }
}
