import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface ClientOption { _id: string; name: string; }
export interface CreateClientRequest { name: string; phone?: string; email?: string; }

@Injectable({ providedIn: 'root' })
export class ClientsApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl;

    list() { return this.http.get<ClientOption[]>(`${this.baseUrl}/clients`); }
    create(payload: CreateClientRequest) { return this.http.post<ClientOption>(`${this.baseUrl}/clients`, payload); }
}


