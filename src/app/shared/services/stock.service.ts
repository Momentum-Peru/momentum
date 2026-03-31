import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product } from './products.service';

export interface StockItem {
    _id?: string;
    locationId: string;
    productId: Product | string;
    quantity: number;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class StockService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/stock`;

    getStockByLocation(locationId: string): Observable<StockItem[]> {
        return this.http.get<StockItem[]>(`${this.base}/location/${locationId}`);
    }

    addToLocation(dto: { locationId: string; productId: string; quantity: number; notes?: string }): Observable<StockItem> {
        return this.http.post<StockItem>(this.base, dto);
    }

    adjust(id: string, dto: { quantity: number; notes?: string }): Observable<StockItem> {
        return this.http.patch<StockItem>(`${this.base}/${id}`, dto);
    }

    remove(id: string): Observable<{ deleted: boolean }> {
        return this.http.delete<{ deleted: boolean }>(`${this.base}/${id}`);
    }
}
