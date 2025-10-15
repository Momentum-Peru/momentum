import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Button } from 'primeng/button';
import { ContactService } from '../../shared/services/contact.service';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-google-contacts-callback',
    standalone: true,
    imports: [CommonModule, Button],
    templateUrl: './google-contacts-callback.html',
    styleUrl: './google-contacts-callback.scss'
})
export class GoogleContactsCallbackComponent implements OnInit {
    private contactService = inject(ContactService);
    private route = inject(ActivatedRoute);

    // Estados
    isLoading = signal(true);
    isSuccess = signal(false);
    isError = signal(false);
    message = signal('');
    errorMessage = signal('');

    ngOnInit(): void {
        this.handleOAuthCallback();
    }

    /**
     * Maneja el callback de OAuth2
     */
    private async handleOAuthCallback(): Promise<void> {
        try {
            // Obtener parámetros de la URL
            const code = this.route.snapshot.queryParams['code'];
            const state = this.route.snapshot.queryParams['state'];
            const error = this.route.snapshot.queryParams['error'];

            console.log('Google Contacts OAuth Callback - Parámetros recibidos:', {
                code: code ? 'presente' : 'ausente',
                state: state ? 'presente' : 'ausente',
                error: error || 'ninguno'
            });

            // Verificar si hay error en la URL
            if (error) {
                this.handleOAuthError(`Error de autorización: ${error}`);
                return;
            }

            // Verificar parámetros requeridos
            if (!code || !state) {
                this.handleOAuthError('Parámetros de autorización incompletos');
                return;
            }

            // Verificar estado
            const savedState = localStorage.getItem('oauth_state');
            const savedProvider = localStorage.getItem('oauth_provider');

            if (state !== savedState || savedProvider !== 'google_contacts') {
                this.handleOAuthError('Estado de autorización inválido');
                return;
            }

            // Intercambiar código por tokens
            console.log('Intercambiando código por tokens...');
            const response = await firstValueFrom(
                this.contactService.exchangeGoogleContactsCode({ code, state })
            );

            if (response.success) {
                this.handleOAuthSuccess(response.tokenId || 'unknown');
            } else {
                this.handleOAuthError(response.error || 'Error desconocido al intercambiar código');
            }

        } catch (error: any) {
            console.error('Error en callback de Google Contacts:', error);

            let errorMessage = 'Error al procesar la autorización';
            if (error.status === 400) {
                errorMessage = 'Código de autorización inválido o expirado';
            } else if (error.status === 401) {
                errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente';
            } else if (error.status === 500) {
                errorMessage = 'Error interno del servidor. Intenta nuevamente';
            }

            this.handleOAuthError(errorMessage);
        }
    }

    /**
     * Maneja el éxito de OAuth2
     */
    private handleOAuthSuccess(tokenId: string): void {
        console.log('Google Contacts OAuth exitoso - Token ID:', tokenId);

        this.isLoading.set(false);
        this.isSuccess.set(true);
        this.isError.set(false);
        this.message.set('Google Contacts conectado exitosamente');

        // Limpiar localStorage
        localStorage.removeItem('oauth_state');
        localStorage.removeItem('oauth_provider');

        // NO redirigir automáticamente - dejar que el usuario regrese manualmente
        console.log('OAuth2 exitoso - cuenta conectada:', tokenId);
    }

    /**
     * Maneja errores de OAuth2
     */
    private handleOAuthError(message: string): void {
        console.error('Google Contacts OAuth error:', message);

        this.isLoading.set(false);
        this.isSuccess.set(false);
        this.isError.set(true);
        this.errorMessage.set(message);

        // Limpiar localStorage
        localStorage.removeItem('oauth_state');
        localStorage.removeItem('oauth_provider');

        // NO redirigir automáticamente - dejar que el usuario regrese manualmente
        console.log('OAuth2 error:', message);
    }

    /**
     * Regresa a la página de contactos
     */
    goBackToContacts(): void {
        window.location.href = '/contactos';
    }
}
