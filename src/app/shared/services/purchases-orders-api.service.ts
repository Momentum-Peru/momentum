import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PurchaseOrder, CreatePurchaseOrderRequest } from '../interfaces/purchase.interface';

/**
 * Servicio API de órdenes de compra.
 * Responsabilidad única: comunicación HTTP con /purchases/orders.
 */
@Injectable({ providedIn: 'root' })
export class PurchasesOrdersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/purchases/orders`;

  list(params?: {
    requirementId?: string;
    providerId?: string;
    status?: string;
  }): Observable<PurchaseOrder[]> {
    let httpParams = new HttpParams();
    if (params?.requirementId) httpParams = httpParams.set('requirementId', params.requirementId);
    if (params?.providerId) httpParams = httpParams.set('providerId', params.providerId);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    return this.http.get<PurchaseOrder[]>(this.baseUrl, { params: httpParams });
  }

  getById(id: string): Observable<PurchaseOrder> {
    return this.http.get<PurchaseOrder>(`${this.baseUrl}/${id}`);
  }

  create(data: CreatePurchaseOrderRequest): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(this.baseUrl, data);
  }

  getPdf(id: string): Observable<{ url?: string; message: string }> {
    return this.http.get<{ url?: string; message: string }>(`${this.baseUrl}/${id}/pdf`);
  }
}
