import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
    Company,
    CompanyOption,
    CreateCompanyRequest,
    UpdateCompanyRequest,
    CompanyQueryParams,
} from '../interfaces/company.interface';

/**
 * Servicio para gestionar Empresas de Momentum del CRM
 * Principio de Responsabilidad Única: Solo maneja las llamadas HTTP al endpoint de companies
 */
@Injectable({ providedIn: 'root' })
export class CompaniesApiService {
    private readonly http = inject(HttpClient);
    // Según docs/tenancy-and-api.md el recurso raíz es /companies
    private readonly baseUrl = `${environment.apiUrl}/companies`;

    /**
     * Crea una nueva empresa
     */
    create(company: CreateCompanyRequest): Observable<Company> {
        return this.http.post<Company>(this.baseUrl, company);
    }

    /**
     * Obtiene la lista de empresas con filtros opcionales
     */
    list(params?: CompanyQueryParams): Observable<Company[]> {
        let httpParams = new HttpParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    httpParams = httpParams.append(key, value.toString());
                }
            });
        }
        return this.http.get<Company[]>(this.baseUrl, { params: httpParams });
    }

    /**
     * Obtiene solo empresas activas como opciones para selectores
     */
    listActiveAsOptions(): Observable<CompanyOption[]> {
        return this.http.get<Company[]>(this.baseUrl, {
            params: new HttpParams().set('isActive', 'true'),
        }).pipe(
            map((companies) =>
                companies.map((c) => ({
                    _id: c._id,
                    name: c.name,
                    code: c.code,
                }))
            )
        );
    }

    /**
     * Obtiene una empresa por ID
     */
    getById(id: string): Observable<Company> {
        return this.http.get<Company>(`${this.baseUrl}/${id}`);
    }

    /**
     * Obtiene una empresa por código
     */
    getByCode(code: string): Observable<Company> {
        return this.http.get<Company>(`${this.baseUrl}/code/${code}`);
    }

    /**
     * Actualiza una empresa existente
     */
    update(id: string, company: UpdateCompanyRequest): Observable<Company> {
        return this.http.patch<Company>(`${this.baseUrl}/${id}`, company);
    }

    /**
     * Activa una empresa
     */
    activate(id: string): Observable<Company> {
        return this.http.post<Company>(`${this.baseUrl}/${id}/activate`, {});
    }

    /**
     * Desactiva una empresa
     */
    deactivate(id: string): Observable<Company> {
        return this.http.post<Company>(`${this.baseUrl}/${id}/deactivate`, {});
    }

    /**
     * Elimina una empresa
     */
    delete(id: string): Observable<{ deleted: boolean }> {
        return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/${id}`);
    }
}

