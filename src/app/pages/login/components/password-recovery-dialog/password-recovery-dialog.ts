import { Component, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { MessageService } from 'primeng/api';
import { PasswordRecoveryService } from '../../services/password-recovery.service';
import { firstValueFrom } from 'rxjs';

/**
 * Componente responsable de mostrar el diálogo de recuperación de contraseña
 * Principio de Responsabilidad Única: Solo maneja la UI y el flujo de recuperación de contraseña
 */
@Component({
    selector: 'app-password-recovery-dialog',
    standalone: true,
    imports: [Dialog, Button, InputText, Password, ReactiveFormsModule],
    templateUrl: './password-recovery-dialog.html',
    styleUrl: './password-recovery-dialog.scss'
})
export class PasswordRecoveryDialog {
    private readonly passwordRecoveryService = inject(PasswordRecoveryService);
    private readonly messageService = inject(MessageService);
    private readonly fb = inject(FormBuilder);

    // Estado del diálogo
    private _visible = signal(false);
    
    // Getter y setter para binding bidireccional con PrimeNG Dialog
    get visible(): boolean {
        return this._visible();
    }
    
    set visible(value: boolean) {
        this._visible.set(value);
        if (!value) {
            this.resetDialog();
        }
    }
    
    // Paso actual del proceso (1: email, 2: código, 3: nueva contraseña)
    currentStep = signal(1);
    
    // Email del usuario (se mantiene entre pasos)
    userEmail = signal('');
    
    // Estados de carga
    isLoading = signal(false);
    
    // Formularios
    emailForm: FormGroup;
    codeForm: FormGroup;
    passwordForm: FormGroup;

    constructor() {
        this.emailForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]]
        });

        this.codeForm = this.fb.group({
            code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
        });

        this.passwordForm = this.fb.group({
            newPassword: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', [Validators.required]]
        }, { validators: this.passwordMatchValidator });
    }

    /**
     * Validador personalizado para verificar que las contraseñas coincidan
     */
    private passwordMatchValidator(form: FormGroup) {
        const newPassword = form.get('newPassword');
        const confirmPassword = form.get('confirmPassword');
        
        if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
            confirmPassword.setErrors({ passwordMismatch: true });
            return { passwordMismatch: true };
        }
        
        if (confirmPassword && confirmPassword.hasError('passwordMismatch')) {
            confirmPassword.setErrors(null);
        }
        
        return null;
    }

    /**
     * Abre el diálogo de recuperación de contraseña
     */
    open(): void {
        this._visible.set(true);
        this.currentStep.set(1);
        this.userEmail.set('');
        this.emailForm.reset();
        this.codeForm.reset();
        this.passwordForm.reset();
    }

    /**
     * Cierra el diálogo
     */
    close(): void {
        this._visible.set(false);
        this.resetDialog();
    }

    /**
     * Resetea el estado del diálogo
     */
    private resetDialog(): void {
        this.currentStep.set(1);
        this.userEmail.set('');
        this.emailForm.reset();
        this.codeForm.reset();
        this.passwordForm.reset();
    }

    /**
     * Maneja el envío del formulario de email
     */
    async onEmailSubmit(): Promise<void> {
        if (this.emailForm.valid) {
            this.isLoading.set(true);
            const email = this.emailForm.value.email;
            this.userEmail.set(email);

            try {
                await firstValueFrom(this.passwordRecoveryService.requestResetCode(email));
                
                this.messageService.add({
                    severity: 'success',
                    summary: 'Código enviado',
                    detail: 'Se ha enviado un código de verificación a tu correo electrónico'
                });

                // Avanzar al siguiente paso
                this.currentStep.set(2);
            } catch (error: unknown) {
                console.error('Error al solicitar código:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo enviar el código. Por favor intenta nuevamente.'
                });
            } finally {
                this.isLoading.set(false);
            }
        } else {
            this.emailForm.markAllAsTouched();
        }
    }

    /**
     * Maneja la verificación del código
     */
    async onCodeSubmit(): Promise<void> {
        if (this.codeForm.valid) {
            this.isLoading.set(true);
            const code = this.codeForm.value.code;

            try {
                await firstValueFrom(
                    this.passwordRecoveryService.verifyResetCode(this.userEmail(), code)
                );

                this.messageService.add({
                    severity: 'success',
                    summary: 'Código verificado',
                    detail: 'Código verificado correctamente'
                });

                // Avanzar al siguiente paso
                this.currentStep.set(3);
            } catch (error: unknown) {
                console.error('Error al verificar código:', error);
                
                let errorMessage = 'Código inválido. Por favor verifica e intenta nuevamente.';
                
                if (error && typeof error === 'object' && 'status' in error) {
                    const httpError = error as { status: number };
                    if (httpError.status === 400) {
                        errorMessage = 'Código inválido o expirado. Por favor solicita uno nuevo.';
                    }
                }

                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: errorMessage
                });
            } finally {
                this.isLoading.set(false);
            }
        } else {
            this.codeForm.markAllAsTouched();
        }
    }

    /**
     * Maneja el cambio de contraseña
     */
    async onPasswordSubmit(): Promise<void> {
        if (this.passwordForm.valid) {
            this.isLoading.set(true);
            const { newPassword } = this.passwordForm.value;
            const code = this.codeForm.value.code;

            try {
                await firstValueFrom(
                    this.passwordRecoveryService.resetPassword(
                        this.userEmail(),
                        code,
                        newPassword
                    )
                );

                this.messageService.add({
                    severity: 'success',
                    summary: 'Contraseña actualizada',
                    detail: 'Tu contraseña ha sido actualizada exitosamente'
                });

                // Cerrar el diálogo después de un breve delay
                setTimeout(() => {
                    this.close();
                }, 1500);
            } catch (error: unknown) {
                console.error('Error al cambiar contraseña:', error);
                
                let errorMessage = 'No se pudo cambiar la contraseña. Por favor intenta nuevamente.';
                
                if (error && typeof error === 'object' && 'status' in error) {
                    const httpError = error as { status: number };
                    if (httpError.status === 400) {
                        errorMessage = 'El código ha expirado o es inválido. Por favor solicita uno nuevo.';
                    }
                }

                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: errorMessage
                });
            } finally {
                this.isLoading.set(false);
            }
        } else {
            this.passwordForm.markAllAsTouched();
        }
    }

    /**
     * Verifica si un campo es inválido y ha sido tocado
     */
    isFieldInvalid(form: FormGroup, fieldName: string): boolean {
        const field = form.get(fieldName);
        return !!(field && field.invalid && (field.dirty || field.touched));
    }

    /**
     * Obtiene el mensaje de error para un campo
     */
    getFieldError(form: FormGroup, fieldName: string): string {
        const field = form.get(fieldName);
        if (!field || !field.errors) return '';

        const errors = field.errors;

        if (errors['required']) {
            return 'Este campo es requerido';
        }

        if (errors['email']) {
            return 'Por favor ingresa un correo válido';
        }

        if (errors['pattern']) {
            return 'El código debe tener 6 dígitos';
        }

        if (errors['minlength']) {
            return 'La contraseña debe tener al menos 6 caracteres';
        }

        if (errors['passwordMismatch']) {
            return 'Las contraseñas no coinciden';
        }

        return '';
    }

    /**
     * Permite volver al paso anterior
     */
    goBack(): void {
        if (this.currentStep() > 1) {
            this.currentStep.update(step => step - 1);
        }
    }
}

