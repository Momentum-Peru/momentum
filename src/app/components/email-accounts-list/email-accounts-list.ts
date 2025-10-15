import { Component, signal, inject, OnInit, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { EmailAccountService } from '../../shared/services/email-account.service';
import { EmailAccount, EmailProvider } from '../../shared/interfaces/email-account.interface';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-email-accounts-list',
    standalone: true,
    imports: [CommonModule, Button, Tag, ConfirmDialog],
    templateUrl: './email-accounts-list.html',
    styleUrl: './email-accounts-list.scss'
})
export class EmailAccountsListComponent implements OnInit {
    private emailAccountService = inject(EmailAccountService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    // Inputs y outputs
    accounts = input.required<EmailAccount[]>();
    isLoading = input<boolean>(false);

    // Outputs para eventos
    onEdit = output<EmailAccount>();
    onTest = output<EmailAccount>();
    onDelete = output<string>();
    onRefresh = output<void>();

    // Estados locales
    deletingAccountId = signal<string | null>(null);

    ngOnInit(): void {
        // El componente se inicializa con las cuentas pasadas desde el componente padre
        console.log('EmailAccountsListComponent initialized');
        console.log('Accounts received:', this.accounts());
        console.log('Is loading:', this.isLoading());
    }

    /**
     * Obtiene el icono según el proveedor
     */
    getProviderIcon(provider: EmailProvider): string {
        switch (provider) {
            case 'gmail_oauth2':
                return 'pi pi-google';
            case 'outlook_oauth2':
                return 'pi pi-microsoft';
            case 'smtp':
                return 'pi pi-send';
            case 'imap':
                return 'pi pi-download';
            default:
                return 'pi pi-envelope';
        }
    }

    /**
     * Obtiene el color del tag según el estado
     */
    getStatusSeverity(status: string): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" | null | undefined {
        switch (status) {
            case 'active':
                return 'success';
            case 'inactive':
                return 'secondary';
            case 'error':
                return 'danger';
            case 'testing':
                return 'warn';
            default:
                return 'secondary';
        }
    }

    /**
     * Obtiene el texto del estado en español
     */
    getStatusText(status: string): string {
        switch (status) {
            case 'active':
                return 'Activo';
            case 'inactive':
                return 'Inactivo';
            case 'error':
                return 'Error';
            case 'testing':
                return 'Probando';
            default:
                return status;
        }
    }

    /**
     * Obtiene el nombre del proveedor en español
     */
    getProviderName(provider: EmailProvider): string {
        switch (provider) {
            case 'gmail_oauth2':
                return 'Gmail OAuth2';
            case 'outlook_oauth2':
                return 'Outlook OAuth2';
            case 'smtp':
                return 'SMTP';
            case 'imap':
                return 'IMAP';
            default:
                return provider;
        }
    }

    /**
     * Verifica si una cuenta es OAuth2
     */
    isOAuth2Account(account: EmailAccount): boolean {
        return account.provider === 'gmail_oauth2' || account.provider === 'outlook_oauth2';
    }

    /**
     * Maneja la edición de una cuenta
     */
    editAccount(account: EmailAccount): void {
        this.onEdit.emit(account);
    }

    /**
     * Maneja el test de una cuenta
     */
    testAccount(account: EmailAccount): void {
        this.onTest.emit(account);
    }

    /**
     * Confirma la eliminación de una cuenta
     */
    confirmDelete(account: EmailAccount): void {
        this.confirmationService.confirm({
            message: `¿Estás seguro de que quieres eliminar la cuenta "${account.name}"?`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Eliminar',
            rejectLabel: 'Cancelar',
            accept: () => {
                this.deleteAccount(account._id);
            }
        });
    }

    /**
     * Elimina una cuenta
     */
    private async deleteAccount(accountId: string): Promise<void> {
        this.deletingAccountId.set(accountId);

        try {
            await firstValueFrom(this.emailAccountService.deleteAccount(accountId) as any);

            this.messageService.add({
                severity: 'success',
                summary: 'Eliminado',
                detail: 'Cuenta eliminada exitosamente'
            });

            // Cerrar el modal de confirmación
            this.confirmationService.close();

            this.onDelete.emit(accountId);
        } catch (error: any) {
            console.error('Error eliminando cuenta:', error);

            let errorMessage = 'Error al eliminar la cuenta';
            if (error.status === 401) {
                errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente';
            } else if (error.status === 404) {
                errorMessage = 'La cuenta no fue encontrada';
            }

            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: errorMessage
            });
        } finally {
            this.deletingAccountId.set(null);
        }
    }

    /**
     * Refresca la lista de cuentas
     */
    refreshAccounts(): void {
        this.onRefresh.emit();
    }

    /**
     * Formatea la fecha para mostrar
     */
    formatDate(date: Date | string): string {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}
