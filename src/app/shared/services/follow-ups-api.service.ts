import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    FollowUp,
    CreateFollowUpRequest,
    UpdateFollowUpRequest,
    FollowUpQueryParams,
    UpcomingFollowUpsParams,
} from '../interfaces/follow-up.interface';

/**
 * Servicio para gestionar Seguimientos (Follow-ups) del CRM
 * Principio de Responsabilidad Única: Solo maneja las llamadas HTTP al endpoint de follow-ups
 */
@Injectable({ providedIn: 'root' })
export class FollowUpsApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/crm/follow-ups`;

    /**
     * Crea un nuevo seguimiento
     */
    create(followUp: CreateFollowUpRequest): Observable<FollowUp> {
        return this.http.post<FollowUp>(this.baseUrl, followUp);
    }

    /**
     * Obtiene la lista de seguimientos con filtros opcionales
     */
    list(params?: FollowUpQueryParams): Observable<FollowUp[]> {
        let httpParams = new HttpParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    httpParams = httpParams.append(key, value.toString());
                }
            });
        }
        return this.http.get<FollowUp[]>(this.baseUrl, { params: httpParams });
    }

    /**
     * Obtiene los seguimientos próximos
     */
    getUpcoming(params?: UpcomingFollowUpsParams): Observable<FollowUp[]> {
        let httpParams = new HttpParams();
        if (params) {
            if (params.userId) {
                httpParams = httpParams.append('userId', params.userId);
            }
            if (params.days !== undefined) {
                httpParams = httpParams.append('days', params.days.toString());
            }
        }
        return this.http.get<FollowUp[]>(`${this.baseUrl}/upcoming`, { params: httpParams });
    }

    /**
     * Obtiene los seguimientos de un lead
     */
    getByLead(leadId: string): Observable<FollowUp[]> {
        return this.http.get<FollowUp[]>(`${this.baseUrl}/lead/${leadId}`);
    }

    /**
     * Obtiene los seguimientos de un contacto
     */
    getByContact(contactId: string): Observable<FollowUp[]> {
        return this.http.get<FollowUp[]>(`${this.baseUrl}/contact/${contactId}`);
    }

    /**
     * Obtiene los seguimientos de un cliente
     */
    getByClient(clientId: string): Observable<FollowUp[]> {
        return this.http.get<FollowUp[]>(`${this.baseUrl}/client/${clientId}`);
    }

    /**
     * Obtiene un seguimiento por ID
     */
    getById(id: string): Observable<FollowUp> {
        return this.http.get<FollowUp>(`${this.baseUrl}/${id}`);
    }

    /**
     * Actualiza un seguimiento existente
     */
    update(id: string, followUp: UpdateFollowUpRequest): Observable<FollowUp> {
        return this.http.patch<FollowUp>(`${this.baseUrl}/${id}`, followUp);
    }

    /**
     * Elimina un seguimiento
     */
    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}

