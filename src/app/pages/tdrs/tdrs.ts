import { ChangeDetectionStrategy, Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ClientsApiService, ClientOption } from '../../shared/services/clients-api.service';
import { SelectModule } from 'primeng/select';

interface Client {
  _id: string;
  name: string;
}

interface TdrItem {
  _id?: string;
  clientId?: Client;
  type: 'client' | 'tecmeing';
  summary?: string;
  approved?: boolean;
  documents?: string[];
}

@Component({
  selector: 'app-tdrs',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    DialogModule,
    SelectButtonModule,
    SelectModule,
    TooltipModule,
    ToastModule,
  ],
  templateUrl: './tdrs.html',
  styleUrls: ['./tdrs.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TdrsPage {
  private readonly http = inject(HttpClient);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly baseUrl = environment.apiUrl;
  private readonly messageService = inject(MessageService);

  items = signal<TdrItem[]>([]);
  query = signal<string>('');
  showDialog = signal<boolean>(false);
  showDocumentsDialog = signal<boolean>(false);
  editing = signal<TdrItem | null>(null);
  documentsViewing = signal<TdrItem | null>(null);
  selectedFiles = signal<File[]>([]);
  clients = signal<ClientOption[]>([]);
  tdrTypeOptions = [
    { label: 'Cliente', value: 'client' },
    { label: 'Tecmeing', value: 'tecmeing' },
  ];

  ngOnInit() {
    this.load();
    this.clientsApi.list().subscribe((v) => this.clients.set(v));
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
  }
  load() {
    const q = this.query();
    const url = q ? `${this.baseUrl}/tdrs?q=${encodeURIComponent(q)}` : `${this.baseUrl}/tdrs`;
    this.http.get<TdrItem[]>(url).subscribe({
      next: (v) => this.items.set(v),
      error: (error) => {
        console.error('Error loading TDRs:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los TDRs',
        });
      },
    });
  }
  setQuery(v: string) {
    this.query.set(v);
    this.load();
  }
  newItem() {
    this.editing.set({ type: 'client' });
    this.showDialog.set(true);
  }
  editItem(item: TdrItem) {
    this.editing.set({ ...item });
    this.showDialog.set(true);
  }
  closeDialog() {
    this.showDialog.set(false);
  }
  onEditChange<K extends keyof TdrItem>(key: K, value: TdrItem[K]) {
    const cur = this.editing();
    if (!cur) return;
    this.editing.set({ ...cur, [key]: value });
  }
  onClientChange(clientId: string) {
    const client = this.clients().find((c) => c._id === clientId);
    this.onEditChange('clientId', client ? { _id: client._id, name: client.name } : undefined);
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

    // Preparar payload limpio
    const payload = {
      clientId:
        typeof item.clientId === 'object' && item.clientId?._id ? item.clientId._id : item.clientId,
      type: item.type,
      summary: item.summary?.trim(),
    };

    const req = item._id
      ? this.http.patch<TdrItem>(`${this.baseUrl}/tdrs/${item._id}`, payload)
      : this.http.post<TdrItem>(`${this.baseUrl}/tdrs`, payload);

    req.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: item._id ? 'TDR actualizado correctamente' : 'TDR creado correctamente',
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
  remove(item: TdrItem) {
    if (confirm('¿Estás seguro de eliminar este TDR?')) {
      this.http.delete(`${this.baseUrl}/tdrs/${item._id}`).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'TDR eliminado correctamente',
          });
          this.load();
        },
        error: (error) => {
          console.error('Error al eliminar TDR:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getErrorMessage(error),
          });
        },
      });
    }
  }

  approve(item: TdrItem) {
    this.http.post(`${this.baseUrl}/tdrs/${item._id}/approve`, {}).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'TDR aprobado correctamente',
        });
        this.load();
      },
      error: (error) => {
        console.error('Error al aprobar TDR:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.getErrorMessage(error),
        });
      },
    });
  }

  // Gestión de documentos
  openDocuments(item: TdrItem) {
    this.documentsViewing.set(item);
    this.showDocumentsDialog.set(true);
  }

  closeDocuments() {
    this.showDocumentsDialog.set(false);
  }

  onFileInputChange(event: Event) {
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
    const tdrId = this.documentsViewing()?._id;

    if (!tdrId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El TDR debe estar guardado antes de subir documentos',
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

    // Subir cada archivo individualmente
    files.forEach((file: File, index: number) => {
      const formData = new FormData();
      formData.append('file', file);

      this.http.post(`${this.baseUrl}/tdrs/${tdrId}/documents`, formData).subscribe({
        next: (response) => {
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

    this.clearSelectedFiles();
  }

  downloadDocument(url: string) {
    const link = document.createElement('a');
    link.href = url;
    link.download = url.split('/').pop() || 'documento';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  viewDocument(url: string) {
    const newWindow = window.open(url, '_blank');
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
    const tdr = this.documentsViewing();
    if (!tdr || !tdr._id) {
      return;
    }

    if (!confirm('¿Estás seguro de eliminar este documento?')) {
      return;
    }

    const updatedDocuments = tdr.documents?.filter((doc) => doc !== url) || [];
    const payload = { documents: updatedDocuments };

    this.http.patch<TdrItem>(`${this.baseUrl}/tdrs/${tdr._id}`, payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Documento eliminado correctamente',
        });
        this.load();
        const currentTdr = this.documentsViewing();
        if (currentTdr) {
          this.documentsViewing.set({ ...currentTdr, documents: updatedDocuments });
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

  // Validaciones
  private validateForm(item: TdrItem): string[] {
    const errors: string[] = [];

    if (!item.clientId) {
      errors.push('El cliente es requerido');
    }

    if (!item.type) {
      errors.push('El tipo de TDR es requerido');
    }

    return errors;
  }

  private getErrorMessage(error: any): string {
    if (error.error?.message) {
      const message = error.error.message;
      if (Array.isArray(message)) {
        return message.join(', ');
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
}
