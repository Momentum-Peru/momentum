import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  CrmCompany,
  CompanyOption,
  CreateCrmCompanyRequest,
  UpdateCrmCompanyRequest,
  CompanyQueryParams,
} from '../interfaces/company.interface';

/**
 * Empresas exclusivas del CRM (`crm_companies`).
 * No usa el endpoint `/companies` de la plataforma.
 */
@Injectable({ providedIn: 'root' })
export class CrmCompaniesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/crm/companies`;

  create(company: CreateCrmCompanyRequest): Observable<CrmCompany> {
    return this.http.post<CrmCompany>(this.baseUrl, company);
  }

  list(params?: CompanyQueryParams): Observable<CrmCompany[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.append(key, value.toString());
        }
      });
    }
    return this.http.get<CrmCompany[]>(this.baseUrl, { params: httpParams });
  }

  listActiveAsOptions(): Observable<CompanyOption[]> {
    return this.http
      .get<CrmCompany[]>(this.baseUrl, {
        params: new HttpParams().set('isActive', 'true'),
      })
      .pipe(
        map((companies) =>
          companies.map((c) => ({
            _id: c._id,
            name: c.name,
          })),
        ),
      );
  }

  getById(id: string): Observable<CrmCompany> {
    return this.http.get<CrmCompany>(`${this.baseUrl}/${id}`);
  }

  update(id: string, company: UpdateCrmCompanyRequest): Observable<CrmCompany> {
    return this.http.patch<CrmCompany>(`${this.baseUrl}/${id}`, company);
  }

  activate(id: string): Observable<CrmCompany> {
    return this.http.post<CrmCompany>(`${this.baseUrl}/${id}/activate`, {});
  }

  deactivate(id: string): Observable<CrmCompany> {
    return this.http.post<CrmCompany>(`${this.baseUrl}/${id}/deactivate`, {});
  }

  delete(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/${id}`);
  }

  uploadLogo(id: string, file: File): Observable<CrmCompany> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CrmCompany>(`${this.baseUrl}/${id}/logo`, formData);
  }
}
