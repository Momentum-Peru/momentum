import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
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
import { UploadService } from '../../shared/services/upload.service';
import { ClientsApiService, ClientOption } from '../../shared/services/clients-api.service';

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
    fechaEmision: string;
    centroCosto: string;
    fechaAprobacion?: string;
    fechaRequerimiento: string;
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
    imports: [CommonModule, HttpClientModule, FormsModule, InputTextModule, TextareaModule, ButtonModule, TableModule, DialogModule, FileUploadModule, DatePickerModule, SelectModule, TooltipModule],
    templateUrl: './requirements.html',
    styleUrls: ['./requirements.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequirementsPage {
    private readonly http = inject(HttpClient);
    private readonly upload = inject(UploadService);
    private readonly baseUrl = environment.apiUrl;
    private readonly clientsApi = inject(ClientsApiService);

    items = signal<RequirementItem[]>([]);
    clients = signal<ClientOption[]>([]);
    query = signal<string>('');
    showDialog = signal<boolean>(false);
    showDocumentsDialog = signal<boolean>(false);
    editing = signal<RequirementItem | null>(null);
    documentsViewing = signal<RequirementItem | null>(null);
    selectedFiles = signal<File[]>([]);

    // Opciones para dropdowns
    estados = [
        { label: 'Vigente', value: 'VIGENTE' },
        { label: 'Anulado', value: 'ANULADO' },
        { label: 'Activación', value: 'ACTIVACIÓN' }
    ];

    ngOnInit() {
        this.load();
        this.clientsApi.list().subscribe(v => this.clients.set(v));
    }

    load() {
        const q = this.query();
        const url = q ? `${this.baseUrl}/requirements?q=${encodeURIComponent(q)}` : `${this.baseUrl}/requirements`;
        this.http.get<RequirementItem[]>(url).subscribe(v => this.items.set(v));
    }

    setQuery(v: string) { this.query.set(v); this.load(); }

    newItem() {
        this.editing.set({
            codigo: '',
            title: '',
            descripcion: '',
            fechaEmision: new Date().toISOString().split('T')[0],
            centroCosto: '',
            fechaRequerimiento: new Date().toISOString().split('T')[0],
            estado: 'VIGENTE',
            documentos: [],
            solicitante: {
                nombre: '',
                codigo: '',
                cargo: ''
            },
            aprobador: {
                nombre: '',
                codigo: '',
                cargo: ''
            }
        });
        this.showDialog.set(true);
    }

    editItem(item: RequirementItem) { this.editing.set({ ...item }); this.showDialog.set(true); }
    closeDialog() { this.showDialog.set(false); this.editing.set(null); }

    onEditChange<K extends keyof RequirementItem>(key: K, value: RequirementItem[K]) {
        const cur = this.editing(); if (!cur) return;
        this.editing.set({ ...cur, [key]: value });
    }

    onClientChange(clientId: string) {
        const client = this.clients().find(c => c._id === clientId);
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
        const item = this.editing(); if (!item) return;

        // Limpiar y validar datos antes de enviar
        const cleanSolicitante = item.solicitante ? {
            nombre: item.solicitante.nombre?.trim() || '',
            codigo: item.solicitante.codigo?.trim() || '',
            cargo: item.solicitante.cargo?.trim() || ''
        } : undefined;

        const cleanAprobador = item.aprobador ? {
            nombre: item.aprobador.nombre?.trim() || '',
            codigo: item.aprobador.codigo?.trim() || '',
            cargo: item.aprobador.cargo?.trim() || ''
        } : undefined;

        // Construir payload limpio sin campos de solo lectura
        const payload = {
            codigo: item.codigo?.trim(),
            title: item.title?.trim(),
            descripcion: item.descripcion?.trim(),
            fechaEmision: item.fechaEmision,
            centroCosto: item.centroCosto?.trim(),
            fechaAprobacion: item.fechaAprobacion,
            fechaRequerimiento: item.fechaRequerimiento,
            estado: item.estado,
            solicitante: cleanSolicitante,
            aprobador: cleanAprobador,
            clientId: item.clientId?._id
        };

        console.log('Payload enviado:', payload); // Debug

        const req = item._id
            ? this.http.patch<RequirementItem>(`${this.baseUrl}/requirements/${item._id}`, payload)
            : this.http.post<RequirementItem>(`${this.baseUrl}/requirements`, payload);
        req.subscribe({
            next: () => {
                this.closeDialog();
                this.load();
            },
            error: (error) => {
                console.error('Error al guardar:', error);
                if (error.error?.message) {
                    alert(`Error: ${error.error.message.join('\n')}`);
                } else {
                    alert('Error al guardar el requerimiento');
                }
            }
        });
    }

    remove(item: RequirementItem) {
        this.http.delete(`${this.baseUrl}/requirements/${item._id}`).subscribe(() => this.load());
    }

    openDocuments(item: RequirementItem) {
        this.documentsViewing.set(item);
        this.showDocumentsDialog.set(true);
    }

    closeDocuments() {
        this.showDocumentsDialog.set(false);
        this.documentsViewing.set(null);
    }

    onFileInputChange(event: Event) {
        const input = event.target as HTMLInputElement;
        const files = Array.from(input.files || []);

        console.log('Archivos seleccionados:', files);

        // Validar tamaño de archivos (10MB máximo)
        const maxSize = 10 * 1024 * 1024; // 10MB en bytes
        const validFiles = files.filter(file => {
            if (file.size > maxSize) {
                alert(`El archivo ${file.name} es demasiado grande. Máximo 10MB.`);
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
        const updatedFiles = currentFiles.filter(file => file !== fileToRemove);
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
            alert('Error: El requerimiento debe estar guardado antes de subir documentos');
            return;
        }

        if (!files || !files.length) {
            console.error('No se pueden subir documentos: no hay archivos seleccionados');
            return;
        }

        // Subir cada archivo individualmente usando el endpoint de la API
        files.forEach((file: File, index: number) => {
            console.log(`Subiendo archivo ${index + 1}:`, file.name);
            const formData = new FormData();
            formData.append('file', file);

            this.http.post(`${this.baseUrl}/requirements/${requirementId}/documents`, formData)
                .subscribe({
                    next: (response) => {
                        console.log(`Documento ${file.name} subido exitosamente:`, response);
                        this.load(); // Recargar para obtener documentos actualizados
                    },
                    error: (error) => {
                        console.error(`Error al subir documento ${file.name}:`, error);
                        alert(`Error al subir ${file.name}: ${error.message || 'Error desconocido'}`);
                    }
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
            alert('No se puede abrir el documento directamente. Usa el botón de descarga.');
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
        // Nota: La API no tiene endpoint para eliminar documentos individuales
        // Esta funcionalidad dependería de la implementación del backend
        console.log('Eliminar documento:', url);
        // Aquí podrías implementar la lógica si el backend lo soporta
    }
}


