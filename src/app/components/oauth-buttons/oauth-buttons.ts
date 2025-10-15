import { Component, signal, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { EmailAccountService } from '../../shared/services/email-account.service';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-oauth-buttons',
    standalone: true,
    imports: [CommonModule, Button],
    templateUrl: './oauth-buttons.html',
    styleUrl: './oauth-buttons.scss'
})
export class OAuthButtonsComponent {
    private messageService = inject(MessageService);
    private emailAccountService = inject(EmailAccountService);

    // Outputs
    onOAuthSuccess = output<string>();
    onOAuthError = output<string>();

    // Estados locales
    isConnectingGoogle = signal(false);
    isConnectingOutlook = signal(false);

    constructor() {
        console.log('OAuthButtonsComponent initialized');
    }

    /**
     * Inicia el proceso de conexión con Google OAuth2
     */
    async connectWithGoogle(): Promise<void> {
        this.isConnectingGoogle.set(true);

        try {
            console.log('Iniciando OAuth2 con Google...');

            const response = await firstValueFrom(
                this.emailAccountService.getOAuth2AuthorizationUrl({ provider: 'gmail_oauth2' })
            );

            console.log('URL de autorización obtenida:', response.authorizationUrl);

            // Guardar el state para verificación posterior
            localStorage.setItem('oauth_state', response.state);
            localStorage.setItem('oauth_provider', 'gmail_oauth2');

            // Redirigir a la URL de autorización
            window.location.href = response.authorizationUrl;
        } catch (error: any) {
            console.error('Error iniciando OAuth2 con Google:', error);

            let errorMessage = 'Error al conectar con Google';
            if (error.status === 401) {
                errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente';
            }

            this.messageService.add({
                severity: 'error',
                summary: 'Error de Conexión',
                detail: errorMessage
            });

            this.onOAuthError.emit(errorMessage);
        } finally {
            this.isConnectingGoogle.set(false);
        }
    }

    /**
     * Inicia el proceso de conexión con Outlook OAuth2
     */
    async connectWithOutlook(): Promise<void> {
        this.isConnectingOutlook.set(true);

        try {
            console.log('Iniciando OAuth2 con Outlook...');

            const response = await firstValueFrom(
                this.emailAccountService.getOAuth2AuthorizationUrl({ provider: 'outlook_oauth2' })
            );

            console.log('URL de autorización obtenida:', response.authorizationUrl);

            // Guardar el state para verificación posterior
            localStorage.setItem('oauth_state', response.state);
            localStorage.setItem('oauth_provider', 'outlook_oauth2');

            // Redirigir a la URL de autorización
            window.location.href = response.authorizationUrl;
        } catch (error: any) {
            console.error('Error iniciando OAuth2 con Outlook:', error);

            let errorMessage = 'Error al conectar con Outlook';
            if (error.status === 401) {
                errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente';
            }

            this.messageService.add({
                severity: 'error',
                summary: 'Error de Conexión',
                detail: errorMessage
            });

            this.onOAuthError.emit(errorMessage);
        } finally {
            this.isConnectingOutlook.set(false);
        }
    }
}