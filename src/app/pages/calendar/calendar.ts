import { Component, signal, inject, OnInit } from '@angular/core';
import { Button } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../login/services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [Button, Toast],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss'
})
export class Calendar implements OnInit {
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private route = inject(ActivatedRoute);

  // Estados de Google Calendar
  googleConnected = signal(false);
  googleStatus = signal<any>(null);

  // Estados de carga
  isConnecting = signal(false);
  isDisconnecting = signal(false);
  isRefreshing = signal(false);

  ngOnInit(): void {
    this.checkGoogleStatus();

    // Escuchar cambios en la URL para refrescar el estado después del callback
    this.route.queryParams.subscribe(async params => {
      if (params['google_connected'] === 'true') {
        // Refrescar el estado después de conectar con Google
        try {
          await this.checkGoogleStatus();
        } catch (error) {
          console.error('Error en post-callback de Google:', error);
        }
      }
    });
  }

  /**
   * Verifica el estado de conexión con Google
   */
  async checkGoogleStatus(): Promise<void> {
    try {
      const status = await firstValueFrom(this.authService.getGoogleStatus());
      this.googleConnected.set(status.hasGoogleConnected);
      this.googleStatus.set(status);
    } catch (error) {
      console.error('Error verificando estado de Google:', error);
      this.googleConnected.set(false);
    }
  }

  /**
   * Inicia el proceso de conexión con Google OAuth2
   */
  connectToGoogle(): void {
    this.isConnecting.set(true);

    try {
      this.authService.loginWithGoogle();
    } catch (error) {
      console.error('Error iniciando conexión con Google:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo iniciar la conexión con Google'
      });
      this.isConnecting.set(false);
    }
  }

  /**
   * Desconecta la cuenta de Google
   */
  async disconnectGoogle(): Promise<void> {
    this.isDisconnecting.set(true);

    try {
      await firstValueFrom(this.authService.disconnectGoogle());

      this.googleConnected.set(false);
      this.googleStatus.set(null);

      this.messageService.add({
        severity: 'success',
        summary: 'Desconectado',
        detail: 'Cuenta de Google desconectada exitosamente'
      });
    } catch (error: any) {
      console.error('Error desconectando Google:', error);

      let errorMessage = 'Error al desconectar la cuenta de Google';
      if (error.status === 401) {
        errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente';
      }

      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage
      });
    } finally {
      this.isDisconnecting.set(false);
    }
  }

  /**
   * Renueva el token de Google
   */
  async refreshGoogleToken(): Promise<void> {
    this.isRefreshing.set(true);

    try {
      const result = await firstValueFrom(this.authService.refreshGoogleToken());

      this.messageService.add({
        severity: 'success',
        summary: 'Token Renovado',
        detail: 'Token de Google renovado exitosamente'
      });

      // Actualizar el estado
      await this.checkGoogleStatus();
    } catch (error: any) {
      console.error('Error renovando token:', error);

      let errorMessage = 'Error al renovar el token de Google';
      if (error.status === 401) {
        errorMessage = 'No se pudo renovar el token. Por favor, reconecta tu cuenta';
      }

      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage
      });
    } finally {
      this.isRefreshing.set(false);
    }
  }

  /**
   * Ver eventos del calendario (placeholder para futura implementación)
   */
  viewCalendarEvents(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Próximamente',
      detail: 'La visualización de eventos estará disponible pronto'
    });
  }
}
