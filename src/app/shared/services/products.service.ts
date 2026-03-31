import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ProductCategory =
  | 'informatica'
  | 'electronica'
  | 'papeleria'
  | 'limpieza'
  | 'herramientas'
  | 'muebles'
  | 'materiales_construccion'
  | 'repuestos'
  | 'quimicos'
  | 'alimentos'
  | 'ropa_epp'
  | 'electrico'
  | 'mecanico'
  | 'medico'
  | 'agricola'
  | 'automotriz'
  | 'packaging'
  | 'combustible'
  | 'seguridad'
  | 'otro';

export interface Product {
    _id?: string;
    name: string;
    code?: string;
    unitOfMeasure: string;
    category?: ProductCategory | string;
    description?: string;
    basePrice?: number;
    images?: string[];
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface ProductFilters {
    q?: string;
    isActive?: boolean;
}

@Injectable({
    providedIn: 'root',
})
export class ProductsService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl;

    getProducts(filters?: ProductFilters): Observable<Product[]> {
        let url = `${this.baseUrl}/products`;
        const params = new URLSearchParams();

        if (filters?.q) params.append('q', filters.q);
        if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        return this.http.get<Product[]>(url);
    }

    getProduct(id: string): Observable<Product> {
        return this.http.get<Product>(`${this.baseUrl}/products/${id}`);
    }

    createProduct(product: Omit<Product, '_id' | 'code' | 'createdAt' | 'updatedAt'>): Observable<Product> {
        return this.http.post<Product>(`${this.baseUrl}/products`, product);
    }

    updateProduct(id: string, product: Partial<Product>): Observable<Product> {
        return this.http.patch<Product>(`${this.baseUrl}/products/${id}`, product);
    }

    deleteProduct(id: string): Observable<{ deleted: boolean }> {
        return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/products/${id}`);
    }

    toggleProductActive(id: string): Observable<Product> {
        return this.http.put<Product>(`${this.baseUrl}/products/${id}/toggle-active`, {});
    }
}
