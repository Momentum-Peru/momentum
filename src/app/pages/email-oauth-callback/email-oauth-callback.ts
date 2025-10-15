import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Button } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { EmailAccountService } from '../../shared/services/email-account.service';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-email-oauth-callback',
    standalone: true,
    imports: [CommonModule, Button],
    templateUrl: './email-oauth-callback.html',
    styleUrl: './email-oauth-callback.scss'
})
export class EmailOAuthCallbackComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private emailAccountService = inject(EmailAccountService);

    // Estados locales
    isProcessing = signal(true);
    isSuccess = signal(false);
    isError = signal(false);
    errorMessage = signal('');
    accountId = signal('');

    ngOnInit(): void {
        this.processOAuthCallback();
    }

    /**
     * Procesa el callback de OAuth2
     */
    private async processOAuthCallback(): Promise<void> {
        try {
            // Obtener parámetros de la URL
            const queryParams = await firstValueFrom(this.route.queryParams);
            const code = queryParams['code'];
            const state = queryParams['state'];
            const error = queryParams['error'];

            // Verificar si hay un error en la URL
            if (error) {
                this.handleOAuthError(error);
                return;
            }

            // Verificar que tenemos el código y el state
            if (!code || !state) {
                this.handleOAuthError('Parámetros de autorización faltantes');
                return;
            }

            // Verificar que el state coincide con el almacenado
            const storedState = localStorage.getItem('oauth_state');
            const storedProvider = localStorage.getItem('oauth_provider');

            if (!storedState || !storedProvider || storedState !== state) {
                this.handleOAuthError('Token de estado inválido');
                return;
            }

            // Intercambiar código por tokens
            const exchangeRequest = {
                code,
                state,
                provider: storedProvider as 'gmail_oauth2' | 'outlook_oauth2'
            };

            const result = await firstValueFrom(
                this.emailAccountService.exchangeOAuth2Tokens(exchangeRequest)
            );

            if (result.success) {
                this.handleOAuthSuccess(result.accountId, storedProvider);
            } else {
                this.handleOAuthError(result.message || 'Error al intercambiar tokens');
            }

        } catch (error: any) {
            console.error('Error procesando callback OAuth2:', error);

            let errorMessage = 'Error al procesar la autorización';
            if (error.status === 401) {
                errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente';
            } else if (error.status === 400) {
                errorMessage = 'Código de autorización inválido o expirado';
            }

            this.handleOAuthError(errorMessage);
        }
    }

    /**
     * Maneja el éxito de OAuth2
     */
    private handleOAuthSuccess(accountId: string, provider: string): void {
        this.isProcessing.set(false);
        this.isSuccess.set(true);
        this.accountId.set(accountId);

        // Limpiar datos temporales
        localStorage.removeItem('oauth_state');
        localStorage.removeItem('oauth_provider');

        // Mostrar mensaje de éxito
        this.messageService.add({
            severity: 'success',
            summary: 'Conexión Exitosa',
            detail: `Cuenta de ${provider === 'gmail_oauth2' ? 'Gmail' : 'Outlook'} conectada exitosamente`
        });

        // NO redirigir automáticamente - dejar que el usuario regrese manualmente
        console.log('OAuth2 exitoso - cuenta creada:', accountId);
    }

    /**
     * Maneja errores de OAuth2
     */
    private handleOAuthError(message: string): void {
        this.isProcessing.set(false);
        this.isError.set(true);
        this.errorMessage.set(message);

        // Limpiar datos temporales
        localStorage.removeItem('oauth_state');
        localStorage.removeItem('oauth_provider');

        // Mostrar mensaje de error
        this.messageService.add({
            severity: 'error',
            summary: 'Error de Conexión',
            detail: message
        });

        // NO redirigir automáticamente - dejar que el usuario regrese manualmente
        console.log('OAuth2 error:', message);
    }

    /**
     * Redirige manualmente a la página de cuentas
     */
    redirectToAccounts(): void {
        this.router.navigate(['/cuentas-email']);
    }
}
