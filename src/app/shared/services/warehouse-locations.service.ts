import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WarehouseLocation {
    _id?: string;
    name: string;
    description?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class WarehouseLocationsService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/warehouse-locations`;

    getLocations(q?: string): Observable<WarehouseLocation[]> {
        const params: any = {};
        if (q) params['q'] = q;
        return this.http.get<WarehouseLocation[]>(this.base, { params });
    }

    getLocation(id: string): Observable<WarehouseLocation> {
        return this.http.get<WarehouseLocation>(`${this.base}/${id}`);
    }

    createLocation(dto: Omit<WarehouseLocation, '_id' | 'createdAt' | 'updatedAt'>): Observable<WarehouseLocation> {
        return this.http.post<WarehouseLocation>(this.base, dto);
    }

    updateLocation(id: string, dto: Partial<WarehouseLocation>): Observable<WarehouseLocation> {
        return this.http.patch<WarehouseLocation>(`${this.base}/${id}`, dto);
    }

    deleteLocation(id: string): Observable<{ deleted: boolean }> {
        return this.http.delete<{ deleted: boolean }>(`${this.base}/${id}`);
    }
}
