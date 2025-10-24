import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    Document,
    DocumentFilters,
    DocumentResponse,
    DocumentTotalResponse,
    DocumentFileDeleteRequest
} from '../interfaces/document.interface';

@Injectable({
    providedIn: 'root',
})
export class DocumentsApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl;

    /**
     * Crear un nuevo documento tributario
     */
    create(document: Partial<Document>): Observable<Document> {
        return this.http.post<Document>(`${this.baseUrl}/documents`, document);
    }

    /**
     * Obtener documentos con filtros y paginación
     */
    list(filters?: DocumentFilters): Observable<DocumentResponse> {
        let params = new HttpParams();

        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    params = params.set(key, value.toString());
                }
            });
        }

        return this.http.get<DocumentResponse>(`${this.baseUrl}/documents`, { params });
    }

    /**
     * Obtener un documento por ID
     */
    getById(id: string): Observable<Document> {
        return this.http.get<Document>(`${this.baseUrl}/documents/${id}`);
    }

    /**
     * Actualizar un documento existente
     */
    update(id: string, document: Partial<Document>): Observable<Document> {
        return this.http.patch<Document>(`${this.baseUrl}/documents/${id}`, document);
    }

    /**
     * Eliminar un documento (soft delete)
     */
    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/documents/${id}`);
    }

    /**
     * Obtener documentos por proyecto
     */
    getByProject(projectId: string): Observable<Document[]> {
        return this.http.get<Document[]>(`${this.baseUrl}/documents/project/${projectId}`);
    }

    /**
     * Obtener documentos por categoría
     */
    getByCategory(category: string): Observable<Document[]> {
        return this.http.get<Document[]>(`${this.baseUrl}/documents/category/${category}`);
    }

    /**
     * Obtener total por proyecto
     */
    getTotalByProject(projectId: string): Observable<DocumentTotalResponse> {
        return this.http.get<DocumentTotalResponse>(`${this.baseUrl}/documents/project/${projectId}/total`);
    }

    /**
     * Subir múltiples archivos a un documento
     */
    uploadFiles(id: string, files: File[]): Observable<Document> {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });

        return this.http.post<Document>(`${this.baseUrl}/documents/${id}/upload`, formData);
    }

    /**
     * Eliminar un archivo específico de un documento
     */
    deleteFile(id: string, fileUrl: string): Observable<Document> {
        const payload: DocumentFileDeleteRequest = { fileUrl };
        return this.http.delete<Document>(`${this.baseUrl}/documents/${id}/files`, { body: payload });
    }
}
