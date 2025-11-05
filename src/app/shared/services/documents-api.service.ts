import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, timeout, retry, catchError, throwError } from 'rxjs';
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
                // Ignorar valores undefined, null o vacíos
                if (value === undefined || value === null || value === '') {
                    return;
                }

                // Convertir booleanos a string 'true'/'false'
                if (typeof value === 'boolean') {
                    params = params.set(key, value.toString());
                    return;
                }

                // Para números, convertir a string
                if (typeof value === 'number') {
                    params = params.set(key, value.toString());
                    return;
                }

                // Para strings y otros valores, convertir a string
                params = params.set(key, String(value));
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

    /**
     * Escanear una factura desde una imagen usando LangChain
     * @param file Archivo de imagen a escanear
     * @param proyectoId ID del proyecto (opcional)
     * @param autoCreate Si se debe crear el documento automáticamente después del escaneo
     */
    scanInvoice(file: File, proyectoId?: string, autoCreate: boolean = true): Observable<ScanInvoiceResponse> {
        const formData = new FormData();
        formData.append('file', file);
        
        if (proyectoId) {
            formData.append('proyectoId', proyectoId);
        }
        
        formData.append('autoCreate', autoCreate.toString());

        // Calcular timeout basado en el tamaño del archivo
        // Para archivos grandes (6MB+), usar timeout más largo
        // Base: 30 segundos, + 5 segundos por cada MB
        const fileSizeMB = file.size / (1024 * 1024);
        const timeoutMs = Math.max(30000, 30000 + (fileSizeMB * 5000)); // Mínimo 30s, +5s por MB
        const maxTimeout = 300000; // Máximo 5 minutos
        const finalTimeout = Math.min(timeoutMs, maxTimeout);

        console.log('Configurando timeout para escaneo:', {
            fileName: file.name,
            fileSizeMB: fileSizeMB.toFixed(2),
            timeoutMs: finalTimeout,
        });

        return this.http.post<ScanInvoiceResponse>(`${this.baseUrl}/documents/scan`, formData, {
            headers: new HttpHeaders({
                // No establecer Content-Type, dejar que el navegador lo establezca con boundary para FormData
            }),
            reportProgress: false, // Desactivar para evitar problemas en móviles
        }).pipe(
            timeout(finalTimeout),
            retry({
                count: 1, // Reintentar solo una vez
                delay: 2000, // Esperar 2 segundos antes de reintentar
            }),
            catchError((error) => {
                // Mejorar el mensaje de error para status 0
                if (error.status === 0 || error.name === 'TimeoutError') {
                    const timeoutError = new Error(
                        `El archivo es demasiado grande o la conexión es lenta. ` +
                        `Tamaño: ${fileSizeMB.toFixed(2)}MB. ` +
                        `Por favor, intente con una imagen más pequeña o verifique su conexión a internet.`
                    );
                    (timeoutError as any).originalError = error;
                    (timeoutError as any).isTimeout = true;
                    return throwError(() => timeoutError);
                }
                return throwError(() => error);
            })
        );
    }
}

/**
 * Respuesta del escaneo de factura
 */
export interface ScanInvoiceResponse {
    scannedData: {
        categoria: string;
        numeroDocumento: number;
        serie?: string;
        fechaEmision?: string;
        fechaVencimiento?: string;
        documentoReferencia?: number;
        total: number;
        razonSocial?: string;
        ruc?: string;
        direccion?: string;
        moneda?: string;
        subtotal?: number;
        igv?: number;
        otrosImpuestos?: number;
        observaciones?: string;
    };
    document?: Document;
    imageUrl: string;
}
