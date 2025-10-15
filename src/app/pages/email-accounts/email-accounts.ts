import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ActivatedRoute } from '@angular/router';
import { EmailAccountService } from '../../shared/services/email-account.service';
import { EmailAccountsListComponent } from '../../components/email-accounts-list/email-accounts-list';
import { EmailAccountFormComponent } from '../../components/email-account-form/email-account-form';
import { OAuthButtonsComponent } from '../../components/oauth-buttons/oauth-buttons';
import { SmtpTestModalComponent } from '../../components/smtp-test-modal/smtp-test-modal';
import { EmailAccount, CreateEmailAccountRequest, UpdateEmailAccountRequest } from '../../shared/interfaces/email-account.interface';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-email-accounts',
    standalone: true,
    imports: [
        CommonModule,
        Button,
        Toast,
        EmailAccountsListComponent,
        EmailAccountFormComponent,
        OAuthButtonsComponent,
        SmtpTestModalComponent
    ],
    templateUrl: './email-accounts.html',
    styleUrl: './email-accounts.scss'
})
export class EmailAccountsComponent implements OnInit {
    private emailAccountService = inject(EmailAccountService);
    private messageService = inject(MessageService);
    private route = inject(ActivatedRoute);

    // Estados principales
    accounts = signal<EmailAccount[]>([]);
    isLoading = signal(false);
    showForm = signal(false);
    showOAuth = signal(false);
    showTestModal = signal(false);

    // Estados del formulario
    editingAccount = signal<EmailAccount | null>(null);
    isEditing = signal(false);
    isSubmitting = signal(false);

    // Estados del modal de test
    testingAccount = signal<EmailAccount | null>(null);

    ngOnInit(): void {
        this.loadAccounts();
        this.handleQueryParams();
    }

    /**
     * Maneja los parámetros de consulta de la URL
     */
    private handleQueryParams(): void {
        this.route.queryParams.subscribe(params => {
            if (params['success'] === 'true') {
                const provider = params['provider'] || 'email';
                this.messageService.add({
                    severity: 'success',
                    summary: 'Conexión Exitosa',
                    detail: `Cuenta de ${provider} conectada exitosamente`
                });
                this.loadAccounts(); // Recargar la lista
            } else if (params['error'] === 'true') {
                const message = decodeURIComponent(params['message'] || 'Error desconocido');
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error de Conexión',
                    detail: message
                });
            }
        });
    }

    /**
     * Carga las cuentas del usuario
     */
    async loadAccounts(): Promise<void> {
        this.isLoading.set(true);

        try {
            const accounts = await firstValueFrom(this.emailAccountService.getMyAccounts());
            this.accounts.set(accounts);
        } catch (error: any) {
            console.error('Error cargando cuentas:', error);

            let errorMessage = 'Error al cargar las cuentas';
            if (error.status === 401) {
                errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente';
            }

            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: errorMessage
            });
        } finally {
            this.isLoading.set(false);
        }
    }

    /**
     * Muestra el formulario para crear una nueva cuenta
     */
    showCreateForm(): void {
        this.editingAccount.set(null);
        this.isEditing.set(false);
        this.showForm.set(true);
        this.showOAuth.set(false);
    }

    /**
     * Muestra el formulario para editar una cuenta existente
     */
    editAccount(account: EmailAccount): void {
        this.editingAccount.set(account);
        this.isEditing.set(true);
        this.showForm.set(true);
        this.showOAuth.set(false);
    }

    /**
     * Muestra los botones OAuth2
     */
    showOAuthButtons(): void {
        this.showOAuth.set(true);
        this.showForm.set(false);
    }

    /**
     * Cancela la operación actual
     */
    cancelOperation(): void {
        this.showForm.set(false);
        this.showOAuth.set(false);
        this.editingAccount.set(null);
        this.isEditing.set(false);
    }

    /**
     * Maneja el envío del formulario
     */
    async handleFormSubmit(accountData: CreateEmailAccountRequest | UpdateEmailAccountRequest): Promise<void> {
        this.isSubmitting.set(true);

        try {
            if (this.isEditing()) {
                // Actualizar cuenta existente
                const account = this.editingAccount();
                if (account) {
                    await firstValueFrom(
                        this.emailAccountService.updateAccount(account._id, accountData as UpdateEmailAccountRequest)
                    );

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Actualizado',
                        detail: 'Cuenta actualizada exitosamente'
                    });
                }
            } else {
                // Crear nueva cuenta
                await firstValueFrom(
                    this.emailAccountService.createAccount(accountData as CreateEmailAccountRequest)
                );

                this.messageService.add({
                    severity: 'success',
                    summary: 'Creado',
                    detail: 'Cuenta creada exitosamente'
                });
            }

            this.cancelOperation();
            await this.loadAccounts();
        } catch (error: any) {
            console.error('Error guardando cuenta:', error);

            let errorMessage = 'Error al guardar la cuenta';
            if (error.status === 401) {
                errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente';
            } else if (error.status === 400) {
                errorMessage = 'Datos inválidos. Verifica la información ingresada';
            }

            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: errorMessage
            });
        } finally {
            this.isSubmitting.set(false);
        }
    }

    /**
     * Maneja el test de una cuenta
     */
    testAccount(account: EmailAccount): void {
        this.testingAccount.set(account);
        this.showTestModal.set(true);
    }

    /**
     * Maneja el resultado del test
     */
    onTestComplete(success: boolean): void {
        this.showTestModal.set(false);
        this.testingAccount.set(null);

        if (success) {
            // Recargar la lista para actualizar el estado de la cuenta
            this.loadAccounts();
        }
    }

    /**
     * Maneja la eliminación de una cuenta
     */
    async handleAccountDelete(accountId: string): Promise<void> {
        await this.loadAccounts();
    }

    /**
     * Maneja el éxito de OAuth2
     */
    onOAuthSuccess(accountId: string): void {
        this.messageService.add({
            severity: 'success',
            summary: 'Conexión Exitosa',
            detail: 'Cuenta OAuth2 conectada exitosamente'
        });

        this.showOAuth.set(false);
        this.loadAccounts();
    }

    /**
     * Maneja errores de OAuth2
     */
    onOAuthError(message: string): void {
        this.messageService.add({
            severity: 'error',
            summary: 'Error de Conexión',
            detail: message
        });
    }

    /**
     * Refresca la lista de cuentas
     */
    refreshAccounts(): void {
        this.loadAccounts();
    }
}
