import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { PermissionsService, PermissionsStatus } from '../../core/services/permissions.service';
import { CommonModule } from '@angular/common';
import { Button } from 'primeng/button';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-permissions-required',
  standalone: true,
  imports: [CommonModule, Button],
  templateUrl: './permissions-required.html',
  styleUrl: './permissions-required.scss',
})
export class PermissionsRequiredComponent implements OnInit, OnDestroy {
  private readonly permissionsService = inject(PermissionsService);

  permissionsStatus = signal<PermissionsStatus | null>(null);
  isChecking = signal<boolean>(true);
  isRequesting = signal<boolean>(false);
  private checkInterval?: any;

  constructor() {
    // Efecto para verificar permisos cuando cambia el estado
    effect(() => {
      const status = this.permissionsStatus();
      if (status?.allGranted) {
        // Si todos los permisos están otorgados, recargar la página
        // para que el guard permita el acceso
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    });
  }

  ngOnInit(): void {
    this.checkPermissions();
    
    // Verificar permisos periódicamente (cada 1.5 segundos)
    // Esto permite detectar cuando el usuario otorga permisos manualmente
    this.checkInterval = setInterval(() => {
      if (!this.permissionsStatus()?.allGranted) {
        this.checkPermissions();
      }
    }, 1500);
  }

  ngOnDestroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  /**
   * Verifica el estado actual de los permisos
   */
  async checkPermissions(): Promise<void> {
    this.isChecking.set(true);
    try {
      const status = await firstValueFrom(this.permissionsService.checkPermissions());
      this.permissionsStatus.set(status);
    } catch (error) {
      console.error('Error al verificar permisos:', error);
      this.permissionsStatus.set({
        location: 'prompt',
        camera: 'prompt',
        allGranted: false,
      });
    } finally {
      this.isChecking.set(false);
    }
  }

  /**
   * Solicita todos los permisos necesarios
   */
  async requestPermissions(): Promise<void> {
    this.isRequesting.set(true);
    try {
      const status = await this.permissionsService.requestAllPermissions();
      this.permissionsStatus.set(status);

      // Si aún faltan permisos, mostrar instrucciones
      if (!status.allGranted) {
        // El usuario puede necesitar habilitar manualmente en la configuración del navegador
        this.showBrowserInstructions();
      }
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
    } finally {
      this.isRequesting.set(false);
    }
  }

  /**
   * Muestra instrucciones para habilitar permisos en el navegador
   */
  private showBrowserInstructions(): void {
    // Esta función puede ser expandida para mostrar instrucciones específicas
    // según el navegador detectado
  }

  /**
   * Obtiene el mensaje de estado para ubicación
   */
  getLocationMessage(): string {
    const status = this.permissionsStatus();
    if (!status) return 'Verificando...';

    switch (status.location) {
      case 'granted':
        return '✓ Ubicación habilitada';
      case 'denied':
        return '✗ Ubicación denegada - Debe habilitarla en la configuración del navegador';
      default:
        return '⚠ Ubicación no habilitada';
    }
  }

  /**
   * Obtiene el mensaje de estado para cámara
   */
  getCameraMessage(): string {
    const status = this.permissionsStatus();
    if (!status) return 'Verificando...';

    switch (status.camera) {
      case 'granted':
        return '✓ Cámara habilitada';
      case 'denied':
        return '✗ Cámara denegada - Debe habilitarla en la configuración del navegador';
      default:
        return '⚠ Cámara no habilitada';
    }
  }

  /**
   * Verifica si se pueden solicitar permisos automáticamente
   */
  canRequestAutomatically(): boolean {
    const status = this.permissionsStatus();
    if (!status) return false;

    // Solo se puede solicitar automáticamente si están en estado 'prompt'
    return status.location === 'prompt' || status.camera === 'prompt';
  }

  /**
   * Verifica si algún permiso fue denegado
   */
  hasDeniedPermissions(): boolean {
    const status = this.permissionsStatus();
    if (!status) return false;

    return status.location === 'denied' || status.camera === 'denied';
  }
}
