import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  effect,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { UploadService } from '../../shared/services/upload.service';
import { ClientsApiService, ClientOption } from '../../shared/services/clients-api.service';
import { MenuService } from '../../shared/services/menu.service';

interface Person {
  nombre: string;
  codigo: string;
  cargo: string;
}

interface Client {
  _id: string;
  name: string;
}

interface RequirementItem {
  _id?: string;
  codigo: string;
  title: string;
  descripcion: string;
  fechaAprobacion?: string | Date;
  fechaRequerimiento: string | Date;
  estado: 'VIGENTE' | 'ANULADO' | 'ACTIVACIÓN';
  documentos?: string[];
  solicitante?: Person;
  aprobador?: Person;
  clientId?: Client;
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-requirements',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    TableModule,
    DialogModule,
    FileUploadModule,
    DatePickerModule,
    SelectModule,
    TooltipModule,
    ToastModule,
  ],
  templateUrl: './requirements.html',
  styleUrls: ['./requirements.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequirementsPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly upload = inject(UploadService);
  private readonly baseUrl = environment.apiUrl;
  private readonly clientsApi = inject(ClientsApiService);
  private readonly messageService = inject(MessageService);
  private readonly menuService = inject(MenuService);

  // Verificar si el usuario tiene permiso de edición para este módulo
  readonly canEdit = computed(() => this.menuService.canEdit('/requirements'));

  items = signal<RequirementItem[]>([]);
  clients = signal<ClientOption[]>([]);
  query = signal<string>('');
  showDialog = signal<boolean>(false);
  showDocumentsDialog = signal<boolean>(false);
  showDetailsDialog = signal<boolean>(false);
  editing = signal<RequirementItem | null>(null);
  documentsViewing = signal<RequirementItem | null>(null);
  viewingRequirement = signal<RequirementItem | null>(null);
  selectedFiles = signal<File[]>([]);
  expandedRows = signal<Set<string>>(new Set());
  isDragging = signal<boolean>(false);
  uploading = signal<boolean>(false);
  uploadProgress = signal<Record<string, number>>({});

  // Opciones para dropdowns
  estados = [
    { label: 'Vigente', value: 'VIGENTE' },
    { label: 'Anulado', value: 'ANULADO' },
    { label: 'Activación', value: 'ACTIVACIÓN' },
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
        this.viewingRequirement.set(null);
      }
    });
  }

  load() {
    const q = this.query();
    const url = q
      ? `${this.baseUrl}/requirements?q=${encodeURIComponent(q)}`
      : `${this.baseUrl}/requirements`;
    this.http.get<RequirementItem[]>(url).subscribe({
      next: (v) => this.items.set(v),
      error: (error) => {
        console.error('Error loading requirements:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los requerimientos',
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
      codigo: '',
      title: '',
      descripcion: '',
      fechaRequerimiento: new Date().toISOString().split('T')[0],
      estado: 'VIGENTE',
      documentos: [],
      solicitante: {
        nombre: '',
        codigo: '',
        cargo: '',
      },
      aprobador: {
        nombre: '',
        codigo: '',
        cargo: '',
      },
    });
    this.showDialog.set(true);
  }

  editItem(item: RequirementItem) {
    // Convertir las fechas de string a Date para el datepicker
    const editedItem = {
      ...item,
      fechaAprobacion: item.fechaAprobacion ? new Date(item.fechaAprobacion) : undefined,
      fechaRequerimiento: item.fechaRequerimiento ? new Date(item.fechaRequerimiento) : new Date(),
    };
    this.editing.set(editedItem);
    this.showDialog.set(true);
  }
  closeDialog() {
    this.showDialog.set(false);
  }

  onEditChange<K extends keyof RequirementItem>(key: K, value: RequirementItem[K]) {
    const cur = this.editing();
    if (!cur) return;
    this.editing.set({ ...cur, [key]: value });
  }

  onClientChange(clientId: string) {
    const client = this.clients().find((c) => c._id === clientId);
    this.onEditChange('clientId', client ? { _id: client._id, name: client.name } : undefined);
  }

  onPersonChange(personType: 'solicitante' | 'aprobador', field: keyof Person, value: string) {
    const cur = this.editing();
    if (!cur) return;

    const person = cur[personType] || { nombre: '', codigo: '', cargo: '' };
    const updatedPerson = { ...person, [field]: value };

    this.editing.set({ ...cur, [personType]: updatedPerson });
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

    // Convertir fechas de Date a string ISO si es necesario
    const formatDate = (date: string | Date | undefined): string | undefined => {
      if (!date) return undefined;
      if (date instanceof Date) {
        return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
      }
      return date;
    };

    // Limpiar y validar datos antes de enviar
    const cleanSolicitante = item.solicitante
      ? {
          nombre: item.solicitante.nombre?.trim() || '',
          ...(item.solicitante.codigo?.trim() && { codigo: item.solicitante.codigo.trim() }),
          cargo: item.solicitante.cargo?.trim() || '',
        }
      : undefined;

    // El aprobador es completamente opcional, solo se incluye si tiene al menos un campo con valor
    const cleanAprobador =
      item.aprobador &&
      (item.aprobador.nombre?.trim() ||
        item.aprobador.codigo?.trim() ||
        item.aprobador.cargo?.trim())
        ? {
            ...(item.aprobador.nombre?.trim() && { nombre: item.aprobador.nombre.trim() }),
            ...(item.aprobador.codigo?.trim() && { codigo: item.aprobador.codigo.trim() }),
            ...(item.aprobador.cargo?.trim() && { cargo: item.aprobador.cargo.trim() }),
          }
        : undefined;

    // Construir payload limpio sin campos de solo lectura
    const payload = {
      codigo: item.codigo?.trim(),
      title: item.title?.trim(),
      descripcion: item.descripcion?.trim(),
      fechaAprobacion: formatDate(item.fechaAprobacion),
      fechaRequerimiento: formatDate(item.fechaRequerimiento),
      estado: item.estado,
      solicitante: cleanSolicitante,
      aprobador: cleanAprobador,
      clientId: item.clientId?._id,
    };

    console.log('Payload enviado:', payload); // Debug

    const req = item._id
      ? this.http.patch<RequirementItem>(`${this.baseUrl}/requirements/${item._id}`, payload)
      : this.http.post<RequirementItem>(`${this.baseUrl}/requirements`, payload);
    req.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: item._id
            ? 'Requerimiento actualizado correctamente'
            : 'Requerimiento creado correctamente',
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

  remove(item: RequirementItem) {
    if (confirm('¿Estás seguro de eliminar este requerimiento?')) {
      this.http.delete(`${this.baseUrl}/requirements/${item._id}`).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Requerimiento eliminado correctamente',
          });
          this.load();
        },
        error: (error) => {
          console.error('Error al eliminar requerimiento:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getErrorMessage(error),
          });
        },
      });
    }
  }

  openDocuments(item: RequirementItem) {
    this.documentsViewing.set(item);
    this.showDocumentsDialog.set(true);
  }

  closeDocuments() {
    this.showDocumentsDialog.set(false);
  }

  viewDetails(requirement: RequirementItem) {
    this.viewingRequirement.set(requirement);
    this.showDetailsDialog.set(true);
  }

  closeDetails() {
    this.showDetailsDialog.set(false);
  }

  onFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    this.processFiles(files);
    // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
    input.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length > 0) {
      this.processFiles(files);
    }
  }

  private processFiles(files: File[]) {
    console.log('Archivos seleccionados:', files);

    // Validar tamaño de archivos (200MB máximo)
    const maxSize = 200 * 1024 * 1024; // 200MB en bytes
    const validFiles: File[] = [];
    const invalidFiles: File[] = [];

    files.forEach((file) => {
      if (file.size > maxSize) {
        invalidFiles.push(file);
      } else {
        validFiles.push(file);
      }
    });

    // Mostrar errores para archivos inválidos
    if (invalidFiles.length > 0) {
      invalidFiles.forEach((file) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error de validación',
          detail: `El archivo ${file.name} es demasiado grande. Máximo 200MB.`,
        });
      });
    }

    // Agregar archivos válidos a la lista
    if (validFiles.length > 0) {
      const currentFiles = this.selectedFiles();
      const updatedFiles = [...currentFiles, ...validFiles];
      this.selectedFiles.set(updatedFiles);

      this.messageService.add({
        severity: 'success',
        summary: 'Archivos agregados',
        detail: `${validFiles.length} archivo(s) agregado(s) correctamente`,
      });
    }
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
    const requirementId = this.documentsViewing()?._id;

    console.log('Subiendo archivos:', files);
    console.log('Requirement ID:', requirementId);

    if (!requirementId) {
      console.error('No se puede subir documento: el requerimiento no tiene ID');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El requerimiento debe estar guardado antes de subir documentos',
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

    this.uploading.set(true);
    this.uploadProgress.set({});

    // Subir cada archivo individualmente usando el endpoint de la API
    const uploadPromises = files.map((file: File, index: number) => {
      return new Promise<void>((resolve, reject) => {
        console.log(`Subiendo archivo ${index + 1}:`, file.name);
        const formData = new FormData();
        formData.append('file', file);

        // Inicializar progreso
        this.uploadProgress.update((progress) => ({
          ...progress,
          [file.name]: 0,
        }));

        this.http
          .post(`${this.baseUrl}/requirements/${requirementId}/documents`, formData)
          .subscribe({
            next: (response) => {
              console.log(`Documento ${file.name} subido exitosamente:`, response);
              // Marcar como completado
              this.uploadProgress.update((progress) => ({
                ...progress,
                [file.name]: 100,
              }));
              resolve();
            },
            error: (error) => {
              console.error(`Error al subir documento ${file.name}:`, error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: `Error al subir ${file.name}: ${this.getErrorMessage(error)}`,
              });
              reject(error);
            },
          });
      });
    });

    // Esperar a que todos los archivos se suban
    Promise.allSettled(uploadPromises).then(() => {
      this.uploading.set(false);
      this.uploadProgress.set({});
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: `${files.length} archivo(s) procesado(s)`,
      });
      this.clearSelectedFiles();
      
      // Recargar el requerimiento específico para obtener los documentos actualizados
      if (requirementId) {
        this.http.get<RequirementItem>(`${this.baseUrl}/requirements/${requirementId}`).subscribe({
          next: (updatedRequirement) => {
            // Actualizar el requerimiento en la lista
            this.items.update((items) =>
              items.map((item) => (item._id === requirementId ? updatedRequirement : item))
            );
            // Actualizar el requerimiento que se está viendo en el modal
            this.documentsViewing.set(updatedRequirement);
          },
          error: (error) => {
            console.error('Error al recargar el requerimiento:', error);
            // Si falla, al menos recargar la lista completa
            this.load();
          },
        });
      } else {
        this.load(); // Recargar para obtener documentos actualizados
      }
    });
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
    const requirement = this.documentsViewing();
    if (!requirement || !requirement._id) {
      console.error('No se puede eliminar documento: el requerimiento no tiene ID');
      return;
    }

    if (!confirm('¿Estás seguro de eliminar este documento?')) {
      return;
    }

    // Filtrar el documento del array
    const updatedDocuments = requirement.documentos?.filter((doc) => doc !== url) || [];

    // Actualizar el requirement con la nueva lista de documentos
    const payload = {
      documentos: updatedDocuments,
    };

    this.http
      .patch<RequirementItem>(`${this.baseUrl}/requirements/${requirement._id}`, payload)
      .subscribe({
        next: () => {
          console.log('Documento eliminado exitosamente');
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Documento eliminado correctamente',
          });
          this.load(); // Recargar para obtener la lista actualizada
          // Actualizar el requirement en el diálogo si está abierto
          const currentRequirement = this.documentsViewing();
          if (currentRequirement) {
            this.documentsViewing.set({
              ...currentRequirement,
              documentos: updatedDocuments,
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
  private validateForm(item: RequirementItem): string[] {
    const errors: string[] = [];

    // Validar código
    if (!item.codigo || item.codigo.trim() === '') {
      errors.push('El código del requerimiento es requerido');
    }

    // Validar título
    if (!item.title || item.title.trim() === '') {
      errors.push('El título del requerimiento es requerido');
    }

    // Validar descripción
    if (!item.descripcion || item.descripcion.trim() === '') {
      errors.push('La descripción del requerimiento es requerida');
    }

    // Validar fecha de requerimiento
    if (!item.fechaRequerimiento) {
      errors.push('La fecha de requerimiento es requerida');
    }

    // Validar solicitante
    if (!item.solicitante) {
      errors.push('La información del solicitante es requerida');
    } else {
      if (!item.solicitante.nombre || item.solicitante.nombre.trim() === '') {
        errors.push('El nombre del solicitante es requerido');
      }
      // El código del solicitante ya no es obligatorio
      if (!item.solicitante.cargo || item.solicitante.cargo.trim() === '') {
        errors.push('El cargo del solicitante es requerido');
      }
    }

    // El aprobador es completamente opcional, no se valida

    return errors;
  }

  // Método para obtener mensaje de error de la API
  private getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const httpError = error as { error?: { message?: string | string[] }; message?: string };
      if (httpError.error?.message) {
        const message = httpError.error.message;
        if (Array.isArray(message)) {
          return message.join(', ');
        }
        if (typeof message === 'string') {
          // Traducir mensajes comunes de validación
          if (message.includes('codigo should not be empty')) {
            return 'El código del requerimiento es requerido';
          }
          if (message.includes('title should not be empty')) {
            return 'El título del requerimiento es requerido';
          }
          if (message.includes('descripcion should not be empty')) {
            return 'La descripción del requerimiento es requerida';
          }
          if (message.includes('fechaRequerimiento should not be empty')) {
            return 'La fecha de requerimiento es requerida';
          }
          if (message.includes('solicitante should not be empty')) {
            return 'La información del solicitante es requerida';
          }
          if (message.includes('solicitante.nombre should not be empty')) {
            return 'El nombre del solicitante es requerido';
          }
          if (message.includes('solicitante.cargo should not be empty')) {
            return 'El cargo del solicitante es requerido';
          }
          return message;
        }
      }
      if (
        httpError.error &&
        typeof httpError.error === 'object' &&
        'error' in httpError.error &&
        typeof httpError.error.error === 'string'
      ) {
        return httpError.error.error;
      }
    }
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
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
