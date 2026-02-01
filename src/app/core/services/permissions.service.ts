import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface PermissionsStatus {
  location: 'granted' | 'denied' | 'prompt';
  camera: 'granted' | 'denied' | 'prompt';
  allGranted: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PermissionsService {
  /**
   * Detecta si el dispositivo es móvil
   */
  private isMobileDevice(): boolean {
    return (
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      (window.innerWidth <= 768 && 'ontouchstart' in window)
    );
  }

  /**
   * Detecta si es desktop (opuesto a móvil)
   */
  private isDesktopDevice(): boolean {
    return !this.isMobileDevice();
  }

  /**
   * Verifica el estado actual de los permisos necesarios
   * - En desktop: solo verifica ubicación
   * - En móvil: verifica ubicación y cámara
   */
  checkPermissions(): Observable<PermissionsStatus> {
    return from(this.checkPermissionsAsync()).pipe(
      catchError((error) => {
        console.error('Error al verificar permisos:', error);
        // En caso de error, asumir que los permisos no están otorgados
        const isDesktop = !this.isMobileDevice();
        const defaultStatus: PermissionsStatus = {
          location: 'prompt',
          camera: isDesktop ? 'granted' : 'prompt', // En desktop, considerar cámara como granted
          allGranted: false,
        };
        return of(defaultStatus);
      })
    );
  }

  /**
   * Verifica los permisos de forma asíncrona
   */
  private async checkPermissionsAsync(): Promise<PermissionsStatus> {
    const locationStatus = await this.checkLocationPermission();
    const isDesktop = this.isDesktopDevice();

    // En desktop, no requerir permiso de cámara (considerarlo siempre como granted)
    const cameraStatus = isDesktop ? 'granted' : await this.checkCameraPermission();

    // En desktop, solo se requiere ubicación. En móvil, se requieren ambos
    const allGranted = isDesktop
      ? locationStatus === 'granted'
      : locationStatus === 'granted' && cameraStatus === 'granted';

    return {
      location: locationStatus,
      camera: cameraStatus,
      allGranted,
    };
  }

  /**
   * Verifica el permiso de ubicación
   */
  private async checkLocationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (!navigator.geolocation) {
      return 'denied';
    }

    // La API de Permissions es más precisa pero no está disponible en todos los navegadores
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state === 'granted'
          ? 'granted'
          : result.state === 'denied'
          ? 'denied'
          : 'prompt';
      } catch {
        // Si falla, intentar con geolocation directamente
        return 'prompt';
      }
    }

    // Fallback: intentar obtener la ubicación (solo verificación, no guardamos)
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve('granted'),
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            resolve('denied');
          } else {
            resolve('prompt');
          }
        },
        { timeout: 1000, maximumAge: 0 }
      );
    });
  }

  /**
   * Verifica el permiso de cámara
   */
  private async checkCameraPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return 'denied';
    }

    // La API de Permissions es más precisa
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        return result.state === 'granted'
          ? 'granted'
          : result.state === 'denied'
          ? 'denied'
          : 'prompt';
      } catch {
        // Si falla, intentar con getUserMedia directamente
        return this.checkCameraWithGetUserMedia();
      }
    }

    // Fallback: intentar acceder a la cámara
    return this.checkCameraWithGetUserMedia();
  }

  /**
   * Verifica el permiso de cámara usando getUserMedia
   */
  private async checkCameraWithGetUserMedia(): Promise<'granted' | 'denied' | 'prompt'> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Si tenemos acceso, detener el stream inmediatamente
      stream.getTracks().forEach((track) => track.stop());
      return 'granted';
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        return 'denied';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        // No hay cámara disponible, pero no es un problema de permisos
        return 'granted'; // Consideramos que si no hay cámara, el permiso está "otorgado"
      } else {
        return 'prompt';
      }
    }
  }

  /**
   * Solicita permisos de ubicación
   */
  async requestLocationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (!navigator.geolocation) {
      return 'denied';
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve('granted'),
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            resolve('denied');
          } else {
            resolve('prompt');
          }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  }

  /**
   * Solicita permisos de cámara
   */
  async requestCameraPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return 'denied';
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Detener el stream inmediatamente después de verificar
      stream.getTracks().forEach((track) => track.stop());
      return 'granted';
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        return 'denied';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        // No hay cámara disponible, pero no es un problema de permisos
        return 'granted';
      } else {
        return 'prompt';
      }
    }
  }

  /**
   * Solicita todos los permisos necesarios
   */
  async requestAllPermissions(): Promise<PermissionsStatus> {
    const locationStatus = await this.requestLocationPermission();
    const isDesktop = this.isDesktopDevice();

    // En desktop, no solicitar permiso de cámara (considerarlo siempre como granted)
    const cameraStatus = isDesktop ? 'granted' : await this.requestCameraPermission();

    // En desktop, solo se requiere ubicación. En móvil, se requieren ambos
    const allGranted = isDesktop
      ? locationStatus === 'granted'
      : locationStatus === 'granted' && cameraStatus === 'granted';

    return {
      location: locationStatus,
      camera: cameraStatus,
      allGranted,
    };
  }

  /**
   * Verifica si los permisos están otorgados (síncrono, basado en última verificación)
   */
  hasAllPermissions(): Observable<boolean> {
    return this.checkPermissions().pipe(map((status) => status.allGranted));
  }
}
