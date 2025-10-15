import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../pages/login/services/auth.service';
import {
    Contact,
    CreateContactRequest,
    UpdateContactRequest,
    ContactsListResponse,
    ContactsSearchParams,
    ContactsAdvancedSearchParams,
    GoogleContactsOAuthRequest,
    GoogleContactsOAuthResponse,
    GoogleContactsStatusResponse,
    GoogleContactsSyncResponse
} from '../interfaces/contact.interface';

@Injectable({
    providedIn: 'root'
})
export class ContactService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private readonly baseUrl = `${environment.apiUrl}/contacts`;

    /**
     * Obtiene el userId del usuario autenticado
     */
    private getUserId(): string {
        const user = this.authService.getCurrentUser();
        if (!user) {
            throw new Error('Usuario no autenticado');
        }
        return user.id;
    }

    /**
     * Obtiene todos los contactos del usuario con filtros opcionales
     */
    getContacts(params?: ContactsSearchParams): Observable<ContactsListResponse> {
        const userId = this.getUserId();
        let httpParams = new HttpParams().set('userId', userId);

        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    httpParams = httpParams.set(key, value.toString());
                }
            });
        }

        return this.http.get<ContactsListResponse>(this.baseUrl, { params: httpParams });
    }

    /**
     * Busca contactos por criterios específicos
     */
    searchContacts(params: ContactsAdvancedSearchParams): Observable<Contact[]> {
        const userId = this.getUserId();
        let httpParams = new HttpParams().set('userId', userId);

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                httpParams = httpParams.set(key, value);
            }
        });

        return this.http.get<Contact[]>(`${this.baseUrl}/search`, { params: httpParams });
    }

    /**
     * Obtiene un contacto por ID
     */
    getContactById(id: string): Observable<Contact> {
        const userId = this.getUserId();
        const params = new HttpParams().set('userId', userId);
        return this.http.get<Contact>(`${this.baseUrl}/${id}`, { params });
    }

    /**
     * Crea un nuevo contacto
     */
    createContact(contact: CreateContactRequest): Observable<Contact> {
        return this.http.post<Contact>(this.baseUrl, contact);
    }

    /**
     * Actualiza un contacto existente
     */
    updateContact(id: string, contact: UpdateContactRequest): Observable<Contact> {
        const userId = this.getUserId();
        const params = new HttpParams().set('userId', userId);
        return this.http.put<Contact>(`${this.baseUrl}/${id}`, contact, { params });
    }

    /**
     * Elimina un contacto
     */
    deleteContact(id: string): Observable<{ message: string }> {
        const userId = this.getUserId();
        const params = new HttpParams().set('userId', userId);
        return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`, { params });
    }

    /**
     * Busca un contacto por email
     */
    getContactByEmail(email: string): Observable<Contact> {
        const userId = this.getUserId();
        const params = new HttpParams().set('userId', userId);
        return this.http.get<Contact>(`${this.baseUrl}/by-email/${encodeURIComponent(email)}`, { params });
    }

    /**
     * Busca contactos por nombre
     */
    getContactsByName(name: string): Observable<Contact[]> {
        const userId = this.getUserId();
        const params = new HttpParams().set('userId', userId);
        return this.http.get<Contact[]>(`${this.baseUrl}/by-name/${encodeURIComponent(name)}`, { params });
    }

    // Google Contacts OAuth Methods

    /**
     * Obtiene la URL de autorización para Google Contacts
     */
    getGoogleContactsAuthorizationUrl(): Observable<{ authorizationUrl: string }> {
        const userId = this.getUserId();
        const params = new HttpParams().set('userId', userId);
        return this.http.get<{ authorizationUrl: string }>(`${this.baseUrl}/google-oauth/authorization-url`, { params });
    }

    /**
     * Intercambia el código de autorización por tokens
     */
    exchangeGoogleContactsCode(request: GoogleContactsOAuthRequest): Observable<GoogleContactsOAuthResponse> {
        return this.http.post<GoogleContactsOAuthResponse>(`${this.baseUrl}/google-oauth/exchange-code`, request);
    }

    /**
     * Verifica el estado de conexión con Google Contacts
     */
    getGoogleContactsStatus(): Observable<GoogleContactsStatusResponse> {
        const userId = this.getUserId();
        const params = new HttpParams().set('userId', userId);
        return this.http.get<GoogleContactsStatusResponse>(`${this.baseUrl}/google-oauth/status`, { params });
    }

    /**
     * Sincroniza contactos desde Google Contacts
     */
    syncGoogleContacts(): Observable<GoogleContactsSyncResponse> {
        const userId = this.getUserId();
        return this.http.post<GoogleContactsSyncResponse>(`${this.baseUrl}/google-oauth/sync`, { userId });
    }

    /**
     * Desconecta Google Contacts
     */
    disconnectGoogleContacts(): Observable<{ message: string }> {
        const userId = this.getUserId();
        return this.http.post<{ message: string }>(`${this.baseUrl}/google-oauth/disconnect`, { userId });
    }
}
