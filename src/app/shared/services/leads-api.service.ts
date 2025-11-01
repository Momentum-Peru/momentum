import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    Lead,
    CreateLeadRequest,
    UpdateLeadRequest,
    LeadQueryParams,
    LeadStatistics,
    ConvertLeadToClientRequest,
} from '../interfaces/lead.interface';

/**
 * Servicio para gestionar Leads (Posibles Clientes) del CRM
 * Principio de Responsabilidad Única: Solo maneja las llamadas HTTP al endpoint de leads
 */
@Injectable({ providedIn: 'root' })
export class LeadsApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/crm/leads`;

    /**
     * Crea un nuevo lead
     */
    create(lead: CreateLeadRequest): Observable<Lead> {
        return this.http.post<Lead>(this.baseUrl, lead);
    }

    /**
     * Obtiene la lista de leads con filtros opcionales
     */
    list(params?: LeadQueryParams): Observable<Lead[]> {
        let httpParams = new HttpParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    httpParams = httpParams.append(key, value.toString());
                }
            });
        }
        return this.http.get<Lead[]>(this.baseUrl, { params: httpParams });
    }

    /**
     * Obtiene estadísticas de leads
     */
    getStatistics(assignedTo?: string): Observable<LeadStatistics> {
        let httpParams = new HttpParams();
        if (assignedTo) {
            httpParams = httpParams.append('assignedTo', assignedTo);
        }
        return this.http.get<LeadStatistics>(`${this.baseUrl}/statistics`, { params: httpParams });
    }

    /**
     * Obtiene un lead por ID
     */
    getById(id: string): Observable<Lead> {
        return this.http.get<Lead>(`${this.baseUrl}/${id}`);
    }

    /**
     * Actualiza un lead existente
     */
    update(id: string, lead: UpdateLeadRequest): Observable<Lead> {
        return this.http.patch<Lead>(`${this.baseUrl}/${id}`, lead);
    }

    /**
     * Elimina un lead
     */
    delete(id: string): Observable<{ deleted: boolean }> {
        return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/${id}`);
    }

    /**
     * Convierte un lead a cliente
     */
    convertToClient(id: string, request: ConvertLeadToClientRequest): Observable<Lead> {
        return this.http.post<Lead>(
            `${this.baseUrl}/${id}/convert-to-client/${request.clientId}`,
            {}
        );
    }

    /**
     * Sube un documento a un lead
     */
    uploadDocument(id: string, file: File): Observable<Lead> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<Lead>(`${this.baseUrl}/${id}/documents`, formData);
    }
}

