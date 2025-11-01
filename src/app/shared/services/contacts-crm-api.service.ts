import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    ContactCrm,
    CreateContactCrmRequest,
    UpdateContactCrmRequest,
    ContactCrmQueryParams,
} from '../interfaces/contact-crm.interface';

/**
 * Servicio para gestionar Contactos del CRM
 * Principio de Responsabilidad Única: Solo maneja las llamadas HTTP al endpoint de contactos CRM
 */
@Injectable({ providedIn: 'root' })
export class ContactsCrmApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/crm/contacts`;

    /**
     * Crea un nuevo contacto
     */
    create(contact: CreateContactCrmRequest): Observable<ContactCrm> {
        return this.http.post<ContactCrm>(this.baseUrl, contact);
    }

    /**
     * Obtiene la lista de contactos con filtros opcionales
     */
    list(params?: ContactCrmQueryParams): Observable<ContactCrm[]> {
        let httpParams = new HttpParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    httpParams = httpParams.append(key, value.toString());
                }
            });
        }
        return this.http.get<ContactCrm[]>(this.baseUrl, { params: httpParams });
    }

    /**
     * Obtiene todos los contactos de un cliente específico
     */
    getByClient(clientId: string): Observable<ContactCrm[]> {
        return this.http.get<ContactCrm[]>(`${this.baseUrl}/client/${clientId}`);
    }

    /**
     * Obtiene un contacto por ID
     */
    getById(id: string): Observable<ContactCrm> {
        return this.http.get<ContactCrm>(`${this.baseUrl}/${id}`);
    }

    /**
     * Actualiza un contacto existente
     */
    update(id: string, contact: UpdateContactCrmRequest): Observable<ContactCrm> {
        return this.http.patch<ContactCrm>(`${this.baseUrl}/${id}`, contact);
    }

    /**
     * Elimina un contacto
     */
    delete(id: string): Observable<{ deleted: boolean }> {
        return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/${id}`);
    }
}

