import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Contact {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    role?: string;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateContactPayload {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    role?: string;
}

export interface UpdateContactPayload extends Partial<CreateContactPayload> { }

@Injectable({
    providedIn: 'root',
})
export class ContactsService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/contacts`;

    findAll(q?: string): Observable<Contact[]> {
        const params: any = {};
        if (q) params.q = q;
        return this.http.get<Contact[]>(this.baseUrl, { params });
    }

    getById(id: string): Observable<Contact> {
        return this.http.get<Contact>(`${this.baseUrl}/${id}`);
    }

    create(payload: CreateContactPayload): Observable<Contact> {
        return this.http.post<Contact>(this.baseUrl, payload);
    }

    update(id: string, payload: UpdateContactPayload): Observable<Contact> {
        return this.http.patch<Contact>(`${this.baseUrl}/${id}`, payload);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}
