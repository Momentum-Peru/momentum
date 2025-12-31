import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface NominatimResponse {
  display_name: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

/**
 * Servicio responsable de interactuar con Nominatim (OpenStreetMap)
 * para convertir coordenadas en direcciones legibles de forma gratuita.
 * Implementa rate limiting para respetar las limitaciones de Nominatim (1 req/seg).
 */
@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly cache = new Map<string, string>();
  private readonly baseUrl = 'https://nominatim.openstreetmap.org/reverse';
  private lastRequestTime = 0;
  private readonly minRequestInterval = 1100; // 1.1 segundos entre solicitudes (más seguro que 1 segundo)

  constructor(private readonly http: HttpClient) {}

  /**
   * Solicita la dirección para las coordenadas dadas usando Nominatim.
   * Implementa rate limiting para respetar las limitaciones del servicio.
   */
  async getAddress(latitude: number, longitude: number): Promise<string> {
    const key = this.buildKey(latitude, longitude);
    
    // Retornar de caché si existe
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    try {
      // Rate limiting: esperar si es necesario
      await this.waitForRateLimit();
      
      const address = await this.geocodeCoordinates(latitude, longitude);
      this.cache.set(key, address);
      return address;
    } catch (error) {
      // Fallback a coordenadas formateadas
      const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      // Cachear el fallback para evitar múltiples llamadas fallidas
      this.cache.set(key, fallback);
      return fallback;
    }
  }

  /**
   * Espera el tiempo necesario para respetar el rate limiting de Nominatim
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Realiza la geocodificación usando Nominatim API
   */
  private async geocodeCoordinates(lat: number, lng: number): Promise<string> {
    try {
      const response = await firstValueFrom<NominatimResponse>(
        this.http.get<NominatimResponse>(this.baseUrl, {
          params: {
            lat: lat.toString(),
            lon: lng.toString(),
            format: 'json',
            addressdetails: '1',
            'accept-language': 'es',
          },
          headers: {
            'User-Agent': 'Momentum-ERP/1.0 (Contact: support@momentum.com)', // Requerido por Nominatim
          },
        })
      );

      if (response && response.display_name) {
        return response.display_name;
      } else {
        // Si no se encuentra dirección, retornar coordenadas formateadas
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    } catch (error) {
      // En caso de error, retornar coordenadas formateadas
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  private buildKey(latitude: number, longitude: number): string {
    return `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  }
}
