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
  private readonly cacheKey = 'geocoding_cache';
  private readonly cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos

  constructor() {
    this.loadCacheFromStorage();
  }

  /**
   * Carga el caché desde localStorage al inicializar
   */
  private loadCacheFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored) as { data: Record<string, string>; timestamp: number };
        // Verificar que el caché no esté expirado
        if (Date.now() - parsed.timestamp < this.cacheExpiry) {
          Object.entries(parsed.data).forEach(([key, value]) => {
            this.cache.set(key, value);
          });
        } else {
          // Limpiar caché expirado
          localStorage.removeItem(this.cacheKey);
        }
      }
    } catch {
      // Si hay error al cargar, continuar sin caché
    }
  }

  /**
   * Guarda el caché en localStorage
   */
  private saveCacheToStorage(): void {
    try {
      const data: Record<string, string> = {};
      this.cache.forEach((value, key) => {
        data[key] = value;
      });
      localStorage.setItem(
        this.cacheKey,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch {
      // Si hay error al guardar, continuar sin persistir
    }
  }

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
        this.http.get<GeocodeResponse>(
          `${this.baseUrl}/dashboard/geocode/${latitude}/${longitude}`
        )
      );

      const address = response.address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      this.cache.set(key, address);
      this.saveCacheToStorage();
      return address;
    } catch {
      // Fallback a coordenadas formateadas
      const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      // No cachear el fallback para permitir reintentos
      return fallback;
    }
  }

  private buildKey(latitude: number, longitude: number): string {
    return `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  }
}
