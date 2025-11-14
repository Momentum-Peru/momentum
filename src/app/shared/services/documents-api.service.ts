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
    scanInvoice(file: File, proyectoId?: string, autoCreate = true): Observable<ScanInvoiceResponse> {
        const formData = new FormData();
        formData.append('file', file);
        
        if (proyectoId) {
            formData.append('proyectoId', proyectoId);
        }
        
        formData.append('autoCreate', autoCreate.toString());

        // Calcular timeout basado en el tamaño del archivo
        // Para archivos grandes y conexiones móviles, usar timeout más generoso
        // Base: 120 segundos, + 30 segundos por cada MB (redondeado hacia arriba)
        // Esto ofrece margen adicional para conexiones móviles inestables
        const fileSizeMB = file.size / (1024 * 1024);
        const baseTimeout = 120000; // 2 minutos
        const perMbIncrement = 30000; // 30 segundos adicionales por MB
        const computedTimeout = baseTimeout + Math.ceil(fileSizeMB) * perMbIncrement;
        const maxTimeout = 600000; // Máximo 10 minutos para archivos muy grandes
        const finalTimeout = Math.min(Math.max(computedTimeout, baseTimeout), maxTimeout);

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
                delay: 3000, // Esperar 3 segundos antes de reintentar (aumentado de 2s)
            }),
            catchError((error) => {
                // Mejorar el mensaje de error para status 0 o timeout
                const isTimeout = error.status === 0 || error.name === 'TimeoutError' || error.message?.includes('timeout');
                
                if (isTimeout || error.isTimeout) {
                    // Si ya es un error de timeout con metadata, solo re-lanzarlo
                    if (error.isTimeout && error.originalError) {
                        return throwError(() => error);
                    }
                    
                    const timeoutError = new Error(
                        `El archivo es demasiado grande o la conexión es lenta. ` +
                        `Tamaño: ${fileSizeMB.toFixed(2)}MB. ` +
                        `Por favor, intente con una imagen más pequeña o verifique su conexión a internet.`
                    );
                    const errorWithMetadata = timeoutError as Error & { 
                        originalError?: unknown; 
                        isTimeout?: boolean; 
                        fileName?: string; 
                        fileType?: string; 
                        fileSize?: number; 
                        isMobile?: boolean;
                        error?: unknown;
                    };
                    errorWithMetadata.originalError = error;
                    errorWithMetadata.isTimeout = true;
                    errorWithMetadata.fileName = file.name;
                    errorWithMetadata.fileType = file.type;
                    errorWithMetadata.fileSize = file.size;
                    errorWithMetadata.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    errorWithMetadata.error = {
                        originalError: error,
                        isTimeout: true,
                        errorMessage: timeoutError.message,
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size,
                        isMobile: errorWithMetadata.isMobile,
                        userAgent: navigator.userAgent
                    };
                    return throwError(() => errorWithMetadata);
                }
                return throwError(() => error);
            })
        );
    }

    /**
     * Subir voucher de pago para una factura
     * @param documentId ID de la factura
     * @param file Archivo de imagen del voucher
     */
    uploadPaymentVoucher(documentId: string, file: File): Observable<{ voucher: PaymentVoucher; document: Document }> {
        const formData = new FormData();
        formData.append('file', file);

        return this.http.post<{ voucher: PaymentVoucher; document: Document }>(
            `${this.baseUrl}/documents/${documentId}/payment-voucher`,
            formData
        );
    }

    /**
     * Obtener todos los vouchers de pago de una factura
     * @param documentId ID de la factura
     */
    getPaymentVouchers(documentId: string): Observable<PaymentVoucher[]> {
        return this.http.get<PaymentVoucher[]>(
            `${this.baseUrl}/documents/${documentId}/payment-vouchers`
        );
    }

    /**
     * Eliminar un voucher de pago
     * @param voucherId ID del voucher
     */
    deletePaymentVoucher(voucherId: string): Observable<void> {
        return this.http.delete<void>(
            `${this.baseUrl}/documents/payment-vouchers/${voucherId}`
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

/**
 * Voucher de pago
 */
export interface PaymentVoucher {
    _id: string;
    documentId: string;
    voucherImageUrl: string;
    isActive: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}