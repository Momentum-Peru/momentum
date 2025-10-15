import { Component, signal, inject, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from 'primeng/button';
import { ContactService } from '../../shared/services/contact.service';
import { GoogleContactsStatusResponse } from '../../shared/interfaces/contact.interface';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-google-contacts-oauth',
    standalone: true,
    imports: [CommonModule, Button],
    templateUrl: './google-contacts-oauth.html',
    styleUrl: './google-contacts-oauth.scss'
})
export class GoogleContactsOAuthComponent implements OnInit {
    private contactService = inject(ContactService);

    // Outputs para eventos
    onOAuthSuccess = output<string>();
    onOAuthError = output<string>();

    // Estados locales
    isConnecting = signal(false);
    isCheckingStatus = signal(false);
    isSyncing = signal(false);
    isDisconnecting = signal(false);
    googleStatus = signal<GoogleContactsStatusResponse | null>(null);
    isConnected = signal(false);

    ngOnInit(): void {
        this.checkConnectionStatus();
    }

    /**
     * Conecta con Google Contacts
     */
    async connectWithGoogleContacts(): Promise<void> {
        this.isConnecting.set(true);

        try {
            console.log('Iniciando OAuth2 con Google Contacts...');
            const response = await firstValueFrom(
                this.contactService.getGoogleContactsAuthorizationUrl()
            );

            console.log('URL de autorización obtenida:', response.authorizationUrl);

            // Guardar estado para verificación posterior
            const state = this.extractStateFromUrl(response.authorizationUrl);
            localStorage.setItem('oauth_state', state);
            localStorage.setItem('oauth_provider', 'google_contacts');

            // Redirigir a Google
            window.location.href = response.authorizationUrl;

        } catch (error: any) {
            console.error('Error obteniendo URL de autorización:', error);

            let errorMessage = 'Error al conectar con Google Contacts';
            if (error.status === 401) {
                errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente';
            } else if (error.status === 500) {
                errorMessage = 'Error interno del servidor. Intenta nuevamente';
            }

            this.onOAuthError.emit(errorMessage);
        } finally {
            this.isConnecting.set(false);
        }
    }

    /**
     * Extrae el estado de la URL de autorización
     */
    private extractStateFromUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.searchParams.get('state') || '';
        } catch {
            return '';
        }
    }

    /**
     * Verifica el estado de conexión con Google Contacts
     */
    async checkConnectionStatus(): Promise<void> {
        this.isCheckingStatus.set(true);

        try {
            const status = await firstValueFrom(
                this.contactService.getGoogleContactsStatus()
            );

            this.googleStatus.set(status);
            this.isConnected.set(status.connected);

            if (status.connected) {
                console.log('Google Contacts conectado:', status);
            } else {
                console.log('Google Contacts no conectado');
            }
        } catch (error) {
            console.error('Error verificando estado de conexión:', error);
            this.isConnected.set(false);
            this.googleStatus.set(null);
        } finally {
            this.isCheckingStatus.set(false);
        }
    }

    /**
     * Sincroniza contactos desde Google Contacts
     */
    async syncContacts(): Promise<void> {
        this.isSyncing.set(true);

        try {
            console.log('Sincronizando contactos desde Google Contacts...');
            const result = await firstValueFrom(
                this.contactService.syncGoogleContacts()
            );

            console.log('Sincronización completada:', result);
            this.onOAuthSuccess.emit(`Sincronizados ${result.synced} contactos`);

        } catch (error: any) {
            console.error('Error sincronizando contactos:', error);

            let errorMessage = 'Error al sincronizar contactos';
            if (error.status === 401) {
                errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente';
            } else if (error.status === 400) {
                errorMessage = 'No hay conexión activa con Google Contacts';
            }

            this.onOAuthError.emit(errorMessage);
        } finally {
            this.isSyncing.set(false);
        }
    }

    /**
     * Desconecta Google Contacts
     */
    async disconnectGoogleContacts(): Promise<void> {
        this.isDisconnecting.set(true);

        try {
            console.log('Desconectando Google Contacts...');
            await firstValueFrom(
                this.contactService.disconnectGoogleContacts()
            );

            console.log('Google Contacts desconectado exitosamente');
            this.isConnected.set(false);
            this.googleStatus.set(null);
            this.onOAuthSuccess.emit('Google Contacts desconectado exitosamente');

        } catch (error: any) {
            console.error('Error desconectando Google Contacts:', error);

            let errorMessage = 'Error al desconectar Google Contacts';
            if (error.status === 401) {
                errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente';
            }

            this.onOAuthError.emit(errorMessage);
        } finally {
            this.isDisconnecting.set(false);
        }
    }
}
