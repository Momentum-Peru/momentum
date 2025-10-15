import { Component, signal, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { EmailAccount, SmtpTestRequest } from '../../shared/interfaces/email-account.interface';
import { EmailAccountService } from '../../shared/services/email-account.service';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-smtp-test-modal',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        Button
    ],
    templateUrl: './smtp-test-modal.html',
    styleUrl: './smtp-test-modal.scss'
})
export class SmtpTestModalComponent {
    private fb = inject(FormBuilder);
    private messageService = inject(MessageService);
    private emailAccountService = inject(EmailAccountService);

    // Inputs
    visible = input<boolean>(false);
    account = input<EmailAccount | null>(null);

    // Outputs
    onClose = output<void>();
    onTestComplete = output<boolean>(); // true si el test fue exitoso

    // Formulario reactivo
    testForm!: FormGroup;

    // Estados locales
    isTesting = signal(false);
    testResult = signal<any>(null);
    showResult = signal(false);

    constructor() {
        console.log('SmtpTestModalComponent initialized');
        this.initializeForm();
    }

    /**
     * Inicializa el formulario reactivo
     */
    private initializeForm(): void {
        this.testForm = this.fb.group({
            testEmail: ['', [Validators.required, Validators.email]],
            subject: ['Prueba de Conexión SMTP', [Validators.required, Validators.minLength(3)]],
            message: [this.getDefaultMessage(), [Validators.required, Validators.minLength(10)]]
        });
    }

    /**
     * Obtiene el mensaje por defecto para el test
     */
    private getDefaultMessage(): string {
        const now = new Date().toLocaleString('es-ES');
        return `¡Hola!

Este es un email de prueba enviado desde MayaAgent el ${now}.

Si recibes este mensaje, significa que tu configuración SMTP está funcionando correctamente.

¡Felicitaciones! Tu cuenta de email está lista para usar.

Saludos,
MayaAgent`;
    }

    /**
     * Maneja la visibilidad del modal
     */
    onVisibleChange(visible: boolean): void {
        if (!visible) {
            this.closeModal();
        }
    }

    /**
     * Cierra el modal y resetea el estado
     */
    closeModal(): void {
        this.showResult.set(false);
        this.testResult.set(null);
        this.testForm.reset();
        this.testForm.patchValue({
            subject: 'Prueba de Conexión SMTP',
            message: this.getDefaultMessage()
        });
        this.onClose.emit();
    }

    /**
     * Ejecuta el test SMTP
     */
    async runSmtpTest(): Promise<void> {
        if (this.testForm.valid && this.account()) {
            this.isTesting.set(true);
            this.showResult.set(false);

            try {
                const testData: SmtpTestRequest = {
                    testEmail: this.testForm.value.testEmail,
                    subject: this.testForm.value.subject,
                    message: this.testForm.value.message
                };

                const result = await firstValueFrom(
                    this.emailAccountService.testSmtpConnection(this.account()!._id, testData)
                );

                this.testResult.set(result);
                this.showResult.set(true);

                if (result.success) {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Test Exitoso',
                        detail: 'El email de prueba se envió correctamente'
                    });
                    this.onTestComplete.emit(true);
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Test Fallido',
                        detail: result.message || 'Error al enviar el email de prueba'
                    });
                    this.onTestComplete.emit(false);
                }
            } catch (error: any) {
                console.error('Error ejecutando test SMTP:', error);

                let errorMessage = 'Error al ejecutar el test SMTP';
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

                this.testResult.set({
                    success: false,
                    message: errorMessage
                });
                this.showResult.set(true);
                this.onTestComplete.emit(false);
            } finally {
                this.isTesting.set(false);
            }
        } else {
            this.markFormGroupTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Formulario Inválido',
                detail: 'Por favor, completa todos los campos requeridos'
            });
        }
    }

    /**
     * Marca todos los campos del formulario como tocados
     */
    private markFormGroupTouched(): void {
        Object.keys(this.testForm.controls).forEach(key => {
            const control = this.testForm.get(key);
            control?.markAsTouched();
        });
    }

    /**
     * Verifica si un campo tiene errores
     */
    hasFieldError(fieldName: string): boolean {
        const field = this.testForm.get(fieldName);
        return !!(field && field.invalid && field.touched);
    }

    /**
     * Obtiene el mensaje de error para un campo
     */
    getFieldError(fieldName: string): string {
        const field = this.testForm.get(fieldName);

        if (!field || !field.errors || !field.touched) {
            return '';
        }

        const errors = field.errors;

        if (errors['required']) {
            return `${this.getFieldLabel(fieldName)} es requerido`;
        }

        if (errors['email']) {
            return 'Formato de email inválido';
        }

        if (errors['minlength']) {
            return `${this.getFieldLabel(fieldName)} debe tener al menos ${errors['minlength'].requiredLength} caracteres`;
        }

        return 'Campo inválido';
    }

    /**
     * Obtiene la etiqueta de un campo
     */
    private getFieldLabel(fieldName: string): string {
        const labels: { [key: string]: string } = {
            testEmail: 'Email de prueba',
            subject: 'Asunto',
            message: 'Mensaje'
        };

        return labels[fieldName] || fieldName;
    }

    /**
     * Obtiene el icono según el resultado del test
     */
    getResultIcon(): string {
        const result = this.testResult();
        return result?.success ? 'pi pi-check-circle' : 'pi pi-times-circle';
    }

    /**
     * Obtiene la clase CSS según el resultado del test
     */
    getResultClass(): string {
        const result = this.testResult();
        return result?.success ? 'text-green-600' : 'text-red-600';
    }
}
