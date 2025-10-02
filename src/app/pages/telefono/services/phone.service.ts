import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Interfaces
export interface Phone {
    id: string;
    userId: string;
    phone: string;
    isActive: boolean;
    isVerified: boolean;
    verifiedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePhoneRequest {
    userId: string;
    phone: string;
    isActive: boolean;
    isVerified: boolean;
}

export interface UpdatePhoneRequest {
    phone?: string;
    isActive?: boolean;
    isVerified?: boolean;
}

export interface PhoneListResponse {
    phones: Phone[];
    total: number;
    page: number;
    totalPages: number;
}

@Injectable({
    providedIn: 'root'
})
export class PhoneService {
    private http = inject(HttpClient);

    /**
     * Obtiene los headers con autorización
     */
    private getAuthHeaders(): HttpHeaders {
        const token = localStorage.getItem('auth_token');
        return new HttpHeaders({
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        });
    }

    /**
     * Crea un nuevo teléfono para un usuario
     */
    createPhone(phoneData: CreatePhoneRequest): Observable<Phone> {
        console.log('🔧 PhoneService - Enviando POST a /phones con datos:', phoneData);
        console.log('🔧 PhoneService - URL:', `${environment.apiUrl}/phones`);

        return this.http.post<Phone>(`${environment.apiUrl}/phones`, phoneData, {
            headers: this.getAuthHeaders()
        });
    }

    /**
     * Obtiene una lista paginada de todos los teléfonos (solo administradores)
     */
    getPhones(page: number = 1, limit: number = 10): Observable<PhoneListResponse> {
        return this.http.get<PhoneListResponse>(`${environment.apiUrl}/phones?page=${page}&limit=${limit}`, {
            headers: this.getAuthHeaders()
        });
    }

    /**
     * Obtiene un teléfono específico por ID
     */
    getPhone(id: string): Observable<Phone> {
        return this.http.get<Phone>(`${environment.apiUrl}/phones/${id}`, {
            headers: this.getAuthHeaders()
        });
    }

    /**
     * Obtiene el teléfono activo de un usuario específico
     */
    getUserPhone(userId: string): Observable<Phone> {
        return this.http.get<Phone>(`${environment.apiUrl}/phones/user/${userId}`, {
            headers: this.getAuthHeaders()
        });
    }

    /**
     * Actualiza los datos de un teléfono existente
     */
    updatePhone(id: string, updateData: UpdatePhoneRequest): Observable<Phone> {
        return this.http.patch<Phone>(`${environment.apiUrl}/phones/${id}`, updateData, {
            headers: this.getAuthHeaders()
        });
    }

    /**
     * Elimina un teléfono
     */
    deletePhone(id: string): Observable<{ message: string; deletedAt: string }> {
        return this.http.delete<{ message: string; deletedAt: string }>(`${environment.apiUrl}/phones/${id}`, {
            headers: this.getAuthHeaders()
        });
    }
}
