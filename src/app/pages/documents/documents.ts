import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToolbarModule } from 'primeng/toolbar';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { DocumentsApiService } from '../../shared/services/documents-api.service';
import { ProjectsApiService } from '../../shared/services/projects-api.service';
import { Document, DocumentFilters } from '../../shared/interfaces/document.interface';
import { Project } from '../../shared/interfaces/project.interface';
import { DocumentFormComponent } from './components/document-form/document-form';
import { DocumentListComponent } from './components/document-list/document-list';
import { DocumentFiltersComponent } from './components/document-filters/document-filters';

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
        DocumentFormComponent,
        DocumentListComponent,
        DocumentFiltersComponent
    ],
    templateUrl: './documents.html',
    styleUrl: './documents.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [MessageService, ConfirmationService]
})
export class DocumentsPage implements OnInit {
    private readonly documentsApi = inject(DocumentsApiService);
    private readonly projectsApi = inject(ProjectsApiService);
    private readonly messageService = inject(MessageService);
    private readonly confirmationService = inject(ConfirmationService);

    // Estado de la página
    documents = signal<Document[]>([]);
    projects = signal<Project[]>([]);
    loading = signal(false);
    showFormDialog = signal(false);
    editingDocument = signal<Document | null>(null);
    currentFilters = signal<DocumentFilters>({});

    // Paginación
    totalRecords = signal(0);
    currentPage = signal(1);
    pageSize = signal(10);

    ngOnInit(): void {
        this.loadDocuments();
        this.loadProjects();
    }

    /**
     * Cargar documentos con filtros actuales
     */
    loadDocuments(): void {
        this.loading.set(true);

        const filters: DocumentFilters = {
            ...this.currentFilters(),
            page: this.currentPage(),
            limit: this.pageSize()
        };

        this.documentsApi.list(filters).subscribe({
            next: (response) => {
                this.documents.set(response.documents);
                this.totalRecords.set(response.total);
                this.loading.set(false);
            },
            error: (error: any) => {
                console.error('Error al cargar documentos:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudieron cargar los documentos'
                });
                this.loading.set(false);
            }
        });
    }

    /**
     * Cargar proyectos para filtros
     */
    loadProjects(): void {
        this.projectsApi.listActive().subscribe({
            next: (projects) => {
                this.projects.set(projects);
            },
            error: (error: any) => {
                console.error('Error al cargar proyectos:', error);
            }
        });
    }

    /**
     * Manejar filtros aplicados
     */
    onFiltersApplied(filters: DocumentFilters): void {
        this.currentFilters.set(filters);
        this.currentPage.set(1);
        this.loadDocuments();
    }

    /**
     * Manejar cambio de página
     */
    onPageChange(event: { page: number; first: number; rows: number }): void {
        this.currentPage.set(event.page + 1);
        this.pageSize.set(event.rows);
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
     * Abrir formulario para editar documento
     */
    openEditForm(document: Document): void {
        this.editingDocument.set(document);
        this.showFormDialog.set(true);
    }

    /**
     * Cerrar formulario
     */
    closeFormDialog(): void {
        this.showFormDialog.set(false);
        this.editingDocument.set(null);
    }

    /**
     * Manejar documento guardado
     */
    onDocumentSaved(): void {
        this.closeFormDialog();
        this.loadDocuments();
        this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Documento guardado correctamente'
        });
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
            }
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
                    detail: 'Documento eliminado correctamente'
                });
            },
            error: (error: any) => {
                console.error('Error al eliminar documento:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo eliminar el documento'
                });
            }
        });
    }

    /**
     * TrackBy function para optimizar renderizado de lista
     */
    trackByDocumentId(index: number, document: Document): string {
        return document._id || index.toString();
    }
}
