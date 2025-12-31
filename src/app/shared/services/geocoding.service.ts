import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface GeocodeResponse {
  address: string;
  latitude: number;
  longitude: number;
}

/**
 * Servicio responsable de interactuar con el backend para geocodificación inversa.
 * El backend usa Nominatim (OpenStreetMap) para convertir coordenadas en direcciones.
 * Esto evita problemas de CORS y User-Agent que ocurren al llamar directamente desde el navegador.
 */
@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, string>();
  private readonly baseUrl = environment.apiUrl;

  /**
   * Solicita la dirección para las coordenadas dadas usando el endpoint del backend.
   */
  async getAddress(latitude: number, longitude: number): Promise<string> {
    const key = this.buildKey(latitude, longitude);

    // Retornar de caché si existe
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    try {
      const response = await firstValueFrom<GeocodeResponse>(
        this.http.get<GeocodeResponse>(`${this.baseUrl}/dashboard/geocode/${latitude}/${longitude}`)
      );

      const address = response.address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      this.cache.set(key, address);
      return address;
    } catch {
      // Fallback a coordenadas formateadas
      const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      // Cachear el fallback para evitar múltiples llamadas fallidas
      this.cache.set(key, fallback);
      return fallback;
    }
  }

  private buildKey(latitude: number, longitude: number): string {
    return `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  }
}
