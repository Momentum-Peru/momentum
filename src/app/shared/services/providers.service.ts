import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Contact {
  name: string;
  email: string;
  phone?: string;
  area: string;
}

export interface Ubicacion {
  paisCodigo?: string;
  provinciaCodigo?: string;
  distritoCodigo?: string;
  direccion?: string;
}

export interface Provider {
  _id?: string;
  name: string;
  address?: string;
  taxIdType?: string;
  taxId?: string;
  ubicacion?: Ubicacion;
  contacts: Contact[];
  documents?: string[];
  description?: string;
  services: string[];
  website?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  ubicacionCompleta?: {
    pais: { codigo: string; nombre: string; nombreCompleto: string };
    provincia?: { codigo: string; nombre: string; tipo: string };
    distrito?: { codigo: string; nombre: string; tipo: string };
  };
}

export interface ProviderStats {
  total: number;
  active: number;
  inactive: number;
}

export interface ProviderFilters {
  q?: string;
  service?: string;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ProvidersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Obtiene todos los proveedores con filtros opcionales
   */
  getProviders(filters?: ProviderFilters): Observable<Provider[]> {
    let url = `${this.baseUrl}/providers`;
    const params = new URLSearchParams();

    if (filters?.q) params.append('q', filters.q);
    if (filters?.service) params.append('service', filters.service);
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.http.get<Provider[]>(url);
  }

  /**
   * Obtiene un proveedor por ID
   */
  getProvider(id: string): Observable<Provider> {
    return this.http.get<Provider>(`${this.baseUrl}/providers/${id}`);
  }

  /**
   * Crea un nuevo proveedor
   */
  createProvider(
    provider: Omit<Provider, '_id' | 'createdAt' | 'updatedAt' | 'ubicacionCompleta'>
  ): Observable<Provider> {
    return this.http.post<Provider>(`${this.baseUrl}/providers`, provider);
  }

  /**
   * Actualiza un proveedor existente
   */
  updateProvider(id: string, provider: Partial<Provider>): Observable<Provider> {
    return this.http.patch<Provider>(`${this.baseUrl}/providers/${id}`, provider);
  }

  /**
   * Elimina un proveedor
   */
  deleteProvider(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/providers/${id}`);
  }

  /**
   * Cambia el estado activo/inactivo de un proveedor
   */
  toggleProviderActive(id: string): Observable<Provider> {
    return this.http.put<Provider>(`${this.baseUrl}/providers/${id}/toggle-active`, {});
  }

  /**
   * Obtiene estadísticas de proveedores
   */
  getProviderStats(): Observable<ProviderStats> {
    return this.http.get<ProviderStats>(`${this.baseUrl}/providers/stats`);
  }

  /**
   * Obtiene proveedores por tipo de servicio
   */
  getProvidersByService(service: string): Observable<Provider[]> {
    return this.http.get<Provider[]>(`${this.baseUrl}/providers/service/${service}`);
  }

  /**
   * Obtiene proveedores por país
   */
  getProvidersByCountry(countryCode: string): Observable<Provider[]> {
    return this.http.get<Provider[]>(`${this.baseUrl}/providers/country/${countryCode}`);
  }

  /**
   * Obtiene proveedores por provincia
   */
  getProvidersByProvince(countryCode: string, provinceCode: string): Observable<Provider[]> {
    return this.http.get<Provider[]>(
      `${this.baseUrl}/providers/country/${countryCode}/province/${provinceCode}`
    );
  }

  /**
   * Obtiene proveedores por distrito
   */
  getProvidersByDistrict(
    countryCode: string,
    provinceCode: string,
    districtCode: string
  ): Observable<Provider[]> {
    return this.http.get<Provider[]>(
      `${this.baseUrl}/providers/country/${countryCode}/province/${provinceCode}/district/${districtCode}`
    );
  }

  /**
   * Sube un documento para un proveedor
   */
  uploadProviderDocument(id: string, file: File): Observable<Provider> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Provider>(`${this.baseUrl}/providers/${id}/documents`, formData);
  }
}
