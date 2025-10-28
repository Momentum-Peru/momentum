import { Component, Input, Output, EventEmitter, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { FileUploadModule } from 'primeng/fileupload';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';

import { DocumentsApiService } from '../../../../shared/services/documents-api.service';
import { ProjectsApiService } from '../../../../shared/services/projects-api.service';
import { Document, ProjectReference } from '../../../../shared/interfaces/document.interface';
import { Project } from '../../../../shared/interfaces/project.interface';

@Component({
    selector: 'app-document-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        DatePickerModule,
        FileUploadModule,
        CardModule,
        DividerModule,
        ToastModule
    ],
    templateUrl: './document-form.html',
    styleUrl: './document-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [MessageService]
})
export class DocumentFormComponent implements OnInit {
    @Input({ required: true }) document: Document | null = null;
    @Output() documentSaved = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();

    private readonly fb = inject(FormBuilder);
    private readonly documentsApi = inject(DocumentsApiService);
    private readonly projectsApi = inject(ProjectsApiService);
    private readonly messageService = inject(MessageService);

    documentForm!: FormGroup;
    loading = signal(false);
    loadingProjects = signal(false);
    uploadedFiles = signal<File[]>([]);
    existingFiles = signal<string[]>([]);

    // Opciones para el dropdown de proyectos
    projectOptions = signal<{ label: string; value: string }[]>([]);

    // Opciones para categorías
    categoryOptions = [
        { label: 'Factura', value: 'Factura' },
        { label: 'Boleta', value: 'Boleta' },
        { label: 'Nota de Crédito', value: 'Nota de Crédito' },
        { label: 'Nota de Débito', value: 'Nota de Débito' },
        { label: 'Recibo por Honorarios', value: 'Recibo por Honorarios' },
        { label: 'Otros', value: 'Otros' }
    ];

    ngOnInit(): void {
        this.initializeForm();
        this.loadProjects();

        if (this.document) {
            this.populateForm();
        }
    }

    /**
     * Inicializar formulario reactivo
     */
    private initializeForm(): void {
        this.documentForm = this.fb.group({
            numeroDocumento: ['', [Validators.required, Validators.min(1)]],
            serie: ['', [Validators.min(1)]],
            proyectoId: ['', Validators.required],
            categoria: [''],
            fechaEmision: [''],
            fechaVencimiento: [''],
            documentoReferencia: ['', [Validators.min(1)]],
            total: ['', [Validators.required, Validators.min(0)]]
        });
    }

    /**
     * Cargar proyectos desde el backend
     */
    private loadProjects(): void {
        this.loadingProjects.set(true);
        this.projectsApi.listActive().subscribe({
            next: (projects) => {
                const options = projects.map(project => ({
                    label: `${project.name} (${project.code})`,
                    value: project._id!
                }));
                this.projectOptions.set(options);
                this.loadingProjects.set(false);
            },
            error: (error: any) => {
                console.error('Error al cargar proyectos:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudieron cargar los proyectos'
                });
                this.loadingProjects.set(false);
            }
        });
    }

    /**
     * Poblar formulario con datos del documento a editar
     */
    private populateForm(): void {
        if (this.document) {
            this.documentForm.patchValue({
                numeroDocumento: this.document.numeroDocumento,
                serie: this.document.serie,
                proyectoId: typeof this.document.proyectoId === 'string'
                    ? this.document.proyectoId
                    : this.document.proyectoId._id,
                categoria: this.document.categoria,
                fechaEmision: this.document.fechaEmision ? new Date(this.document.fechaEmision) : null,
                fechaVencimiento: this.document.fechaVencimiento ? new Date(this.document.fechaVencimiento) : null,
                documentoReferencia: this.document.documentoReferencia,
                total: this.document.total
            });

            this.existingFiles.set(this.document.documentos || []);
        }
    }

    /**
     * Manejar selección de archivos
     */
    onFileSelect(event: any): void {
        const files: File[] = Array.from(event.files);
        this.uploadedFiles.set(files);
    }

    /**
     * Eliminar archivo seleccionado
     */
    removeFile(file: File): void {
        const currentFiles = this.uploadedFiles();
        const updatedFiles = currentFiles.filter(f => f !== file);
        this.uploadedFiles.set(updatedFiles);
    }

    /**
     * Eliminar archivo existente
     */
    removeExistingFile(fileUrl: string): void {
        const currentFiles = this.existingFiles();
        const updatedFiles = currentFiles.filter(f => f !== fileUrl);
        this.existingFiles.set(updatedFiles);
    }

    /**
     * Enviar formulario
     */
    onSubmit(): void {
        if (this.documentForm.valid) {
            this.loading.set(true);

            const formData = this.prepareFormData();

            if (this.document) {
                this.updateDocument(formData);
            } else {
                this.createDocument(formData);
            }
        } else {
            this.markFormGroupTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Formulario Inválido',
                detail: 'Por favor complete todos los campos requeridos'
            });
        }
    }

    /**
     * Preparar datos del formulario
     */
    private prepareFormData(): Partial<Document> {
        const formValue = this.documentForm.value;

        return {
            numeroDocumento: formValue.numeroDocumento,
            serie: formValue.serie || undefined,
            proyectoId: formValue.proyectoId,
            categoria: formValue.categoria || undefined,
            fechaEmision: formValue.fechaEmision || undefined,
            fechaVencimiento: formValue.fechaVencimiento || undefined,
            documentoReferencia: formValue.documentoReferencia || undefined,
            total: formValue.total,
            documentos: this.existingFiles()
        };
    }

    /**
     * Crear nuevo documento
     */
    private createDocument(formData: Partial<Document>): void {
        this.documentsApi.create(formData).subscribe({
            next: (document) => {
                this.handleDocumentSaved(document);
            },
            error: (error: any) => {
                this.handleError('Error al crear documento', error);
            }
        });
    }

    /**
     * Actualizar documento existente
     */
    private updateDocument(formData: Partial<Document>): void {
        this.documentsApi.update(this.document!._id!, formData).subscribe({
            next: (document) => {
                this.handleDocumentSaved(document);
            },
            error: (error: any) => {
                this.handleError('Error al actualizar documento', error);
            }
        });
    }

    /**
     * Manejar documento guardado exitosamente
     */
    private handleDocumentSaved(document: Document): void {
        // Si hay archivos nuevos para subir
        const filesToUpload = this.uploadedFiles();
        if (filesToUpload.length > 0) {
            this.uploadFiles(document._id!, filesToUpload);
        } else {
            this.finishSave();
        }
    }

    /**
     * Subir archivos al documento
     */
    private uploadFiles(documentId: string, files: File[]): void {
        this.documentsApi.uploadFiles(documentId, files).subscribe({
            next: () => {
                this.finishSave();
            },
            error: (error: any) => {
                this.handleError('Error al subir archivos', error);
            }
        });
    }

    /**
     * Finalizar proceso de guardado
     */
    private finishSave(): void {
        this.loading.set(false);
        this.documentSaved.emit();
        this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: this.document ? 'Documento actualizado correctamente' : 'Documento creado correctamente'
        });
    }

    /**
     * Manejar errores
     */
    private handleError(message: string, error: any): void {
        console.error(message, error);
        this.loading.set(false);
        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: message
        });
    }

    /**
     * Marcar todos los campos como tocados para mostrar errores
     */
    private markFormGroupTouched(): void {
        Object.keys(this.documentForm.controls).forEach(key => {
            this.documentForm.get(key)?.markAsTouched();
        });
    }

    /**
     * Cancelar formulario
     */
    onCancel(): void {
        this.cancel.emit();
    }

    /**
     * Verificar si un campo tiene error
     */
    hasError(fieldName: string): boolean {
        const field = this.documentForm.get(fieldName);
        return !!(field && field.invalid && field.touched);
    }

    /**
     * Obtener mensaje de error para un campo
     */
    getErrorMessage(fieldName: string): string {
        const field = this.documentForm.get(fieldName);
        if (field?.errors?.['required']) {
            return 'Este campo es requerido';
        }
        if (field?.errors?.['min']) {
            return `El valor mínimo es ${field.errors['min'].min}`;
        }
        return '';
    }

    /**
     * Obtener nombre del archivo desde URL
     */
    getFileName(url: string): string {
        const parts = url.split('/');
        return parts[parts.length - 1] || 'Archivo';
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
}
