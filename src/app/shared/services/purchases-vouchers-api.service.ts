import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PurchaseVoucher, RegisterVoucherRequest } from '../interfaces/purchase.interface';

export interface AccountsPayableAgeingResponse {
  total: number;
  byAge: {
    current: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    over90: number;
  };
  count: number;
}

/**
 * Servicio API de comprobantes (CXP) y reportes de compras.
 * Responsabilidad única: comunicación HTTP con /purchases/vouchers y reportes.
 */
@Injectable({ providedIn: 'root' })
export class PurchasesVouchersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/purchases`;

  list(params?: {
    providerId?: string;
    tipoComprobante?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Observable<PurchaseVoucher[]> {
    let httpParams = new HttpParams();
    if (params?.providerId) httpParams = httpParams.set('providerId', params.providerId);
    if (params?.tipoComprobante)
      httpParams = httpParams.set('tipoComprobante', params.tipoComprobante);
    if (params?.fechaDesde) httpParams = httpParams.set('fechaDesde', params.fechaDesde);
    if (params?.fechaHasta) httpParams = httpParams.set('fechaHasta', params.fechaHasta);
    return this.http.get<PurchaseVoucher[]>(`${this.baseUrl}/vouchers`, { params: httpParams });
  }

  getById(id: string): Observable<PurchaseVoucher> {
    return this.http.get<PurchaseVoucher>(`${this.baseUrl}/vouchers/${id}`);
  }

  create(data: RegisterVoucherRequest): Observable<PurchaseVoucher> {
    return this.http.post<PurchaseVoucher>(`${this.baseUrl}/vouchers`, data);
  }

  update(id: string, data: { status?: string; notes?: string }): Observable<PurchaseVoucher> {
    return this.http.patch<PurchaseVoucher>(`${this.baseUrl}/vouchers/${id}`, data);
  }

  getRegisterOfPurchases(fechaDesde?: string, fechaHasta?: string): Observable<PurchaseVoucher[]> {
    let params = new HttpParams();
    if (fechaDesde) params = params.set('fechaDesde', fechaDesde);
    if (fechaHasta) params = params.set('fechaHasta', fechaHasta);
    return this.http.get<PurchaseVoucher[]>(`${this.baseUrl}/reports/register-of-purchases`, {
      params,
    });
  }

  getAccountsPayableAgeing(): Observable<AccountsPayableAgeingResponse> {
    return this.http.get<AccountsPayableAgeingResponse>(
      `${this.baseUrl}/reports/accounts-payable-ageing`,
    );
  }
}
