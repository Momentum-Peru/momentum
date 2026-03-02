import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PurchaseRequirement,
  CreatePurchaseRequirementRequest,
} from '../interfaces/purchase.interface';

/**
 * Servicio API de requerimientos de compra.
 * Responsabilidad única: comunicación HTTP con /purchases/requirements.
 */
@Injectable({ providedIn: 'root' })
export class PurchasesRequirementsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/purchases/requirements`;

  list(params?: {
    q?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Observable<PurchaseRequirement[]> {
    let httpParams = new HttpParams();
    if (params?.q) httpParams = httpParams.set('q', params.q);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder ?? 'desc');
    return this.http.get<PurchaseRequirement[]>(this.baseUrl, { params: httpParams });
  }

  getById(id: string): Observable<PurchaseRequirement> {
    return this.http.get<PurchaseRequirement>(`${this.baseUrl}/${id}`);
  }

  create(data: CreatePurchaseRequirementRequest): Observable<PurchaseRequirement> {
    return this.http.post<PurchaseRequirement>(this.baseUrl, data);
  }

  update(
    id: string,
    data: Partial<CreatePurchaseRequirementRequest> & { status?: string },
  ): Observable<PurchaseRequirement> {
    return this.http.patch<PurchaseRequirement>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: string): Observable<{ deleted: boolean; id: string }> {
    return this.http.delete<{ deleted: boolean; id: string }>(`${this.baseUrl}/${id}`);
  }

  approve(id: string, approvedBy: string): Observable<PurchaseRequirement> {
    return this.http.post<PurchaseRequirement>(
      `${this.baseUrl}/${id}/approve`,
      {},
      {
        params: new HttpParams().set('approvedBy', approvedBy),
      },
    );
  }

  reject(
    id: string,
    rejectedBy: string,
    rejectionReason?: string,
  ): Observable<PurchaseRequirement> {
    let params = new HttpParams().set('rejectedBy', rejectedBy);
    if (rejectionReason) params = params.set('rejectionReason', rejectionReason);
    return this.http.post<PurchaseRequirement>(`${this.baseUrl}/${id}/reject`, {}, { params });
  }
}
