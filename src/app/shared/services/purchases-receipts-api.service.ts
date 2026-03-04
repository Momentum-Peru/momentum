import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { CreateGoodsReceiptRequest, GoodsReceipt } from '../interfaces/purchase.interface';

@Injectable({
  providedIn: 'root',
})
export class PurchasesReceiptsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/purchases/receipts`;

  list(filters?: {
    purchaseOrderId?: string;
    providerId?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<GoodsReceipt[]> {
    let params = new HttpParams();
    if (filters?.purchaseOrderId) {
      params = params.set('purchaseOrderId', filters.purchaseOrderId);
    }
    if (filters?.providerId) {
      params = params.set('providerId', filters.providerId);
    }
    if (filters?.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params = params.set('endDate', filters.endDate);
    }
    return this.http.get<GoodsReceipt[]>(this.baseUrl, { params });
  }

  create(data: CreateGoodsReceiptRequest): Observable<GoodsReceipt> {
    return this.http.post<GoodsReceipt>(this.baseUrl, data);
  }

  getById(id: string): Observable<GoodsReceipt> {
    return this.http.get<GoodsReceipt>(`${this.baseUrl}/${id}`);
  }

  annul(id: string, userId: string): Observable<GoodsReceipt> {
    const params = new HttpParams().set('userId', userId);
    return this.http.post<GoodsReceipt>(`${this.baseUrl}/${id}/annul`, {}, { params });
  }
}
