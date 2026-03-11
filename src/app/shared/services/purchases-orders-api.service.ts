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
    providerId?: string;
    status?: string;
  }): Observable<PurchaseOrder[]> {
    let httpParams = new HttpParams();
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

  getPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, { responseType: 'blob' });
  }

  approveOrder(id: string, userId: string): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.baseUrl}/${id}/approve?approvedBy=${userId}`, {});
  }

  rejectOrder(id: string, userId: string): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.baseUrl}/${id}/reject?rejectedBy=${userId}`, {});
  }
}
