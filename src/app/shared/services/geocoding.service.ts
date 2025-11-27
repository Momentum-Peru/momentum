import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

// Interfaces locales para tipado estricto de Google Maps
interface GoogleMapsGeocoder {
  geocode(
    request: { location: { lat: number; lng: number }; language?: string; region?: string },
    callback: (results: GoogleMapsGeocoderResult[] | null, status: string) => void
  ): void;
}

interface GoogleMapsGeocoderResult {
  formatted_address: string;
}

interface WindowWithGoogle extends Window {
  google?: {
    maps?: {
      Geocoder: new () => GoogleMapsGeocoder;
    };
  };
}

/**
 * Servicio responsable de interactuar con Google Maps JavaScript API
 * para convertir coordenadas en direcciones legibles.
 * Utiliza carga diferida (lazy loading) del script de Google Maps.
 */
@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly cache = new Map<string, string>();
  private scriptLoadedPromise: Promise<void> | null = null;
  private geocoder: GoogleMapsGeocoder | null = null;

  /**
   * Solicita la dirección para las coordenadas dadas.
   * Carga el SDK de Google Maps si es necesario.
   */
  async getAddress(latitude: number, longitude: number): Promise<string> {
    const key = this.buildKey(latitude, longitude);
    
    // Retornar de caché si existe
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    try {
      await this.loadGoogleMapsScript();
      const address = await this.geocodeCoordinates(latitude, longitude);
      this.cache.set(key, address);
      return address;
    } catch (error) {
      console.error(`[GeocodingService] Error al obtener dirección para ${key}:`, error);
      // Fallback a coordenadas formateadas
      const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      // No guardamos el fallback en caché permanentemente por si fue un error temporal de red,
      // pero para evitar reintentos infinitos inmediatos, podríamos manejarlo. 
      // Por ahora, retornamos el fallback sin cachearlo como éxito permanente.
      // O lo cacheamos para no saturar la API en esta sesión.
      this.cache.set(key, fallback);
      return fallback;
    }
  }

  /**
   * Carga el script de Google Maps API dinámicamente
   */
  private loadGoogleMapsScript(): Promise<void> {
    if (this.scriptLoadedPromise) {
      return this.scriptLoadedPromise;
    }

    const win = window as unknown as WindowWithGoogle;
    if (win.google?.maps?.Geocoder) {
      this.scriptLoadedPromise = Promise.resolve();
      return this.scriptLoadedPromise;
    }

    this.scriptLoadedPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      // Incluimos callback=initMap aunque no lo usemos explícitamente, pero es buena práctica.
      // Usamos loading='async'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.mapsAPI}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => resolve();
      script.onerror = (err) => {
        this.scriptLoadedPromise = null; // Permitir reintento
        reject(err);
      };
      
      document.body.appendChild(script);
    });

    return this.scriptLoadedPromise;
  }

  /**
   * Realiza la geocodificación usando la instancia de Geocoder
   */
  private geocodeCoordinates(lat: number, lng: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const win = window as unknown as WindowWithGoogle;
      
      if (!this.geocoder) {
        if (!win.google?.maps?.Geocoder) {
          reject(new Error('Google Maps SDK no está disponible.'));
          return;
        }
        this.geocoder = new win.google.maps.Geocoder();
      }

      this.geocoder!.geocode(
        { 
          location: { lat, lng },
          language: 'es',
          region: 'PE' // Priorizar Perú
        },
        (results, status) => {
          if (status === 'OK' && results && results.length > 0) {
            resolve(results[0].formatted_address);
          } else {
            reject(new Error(`Geocoding status: ${status}`));
          }
        }
      );
    });
  }

  private buildKey(latitude: number, longitude: number): string {
    return `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  }
}
