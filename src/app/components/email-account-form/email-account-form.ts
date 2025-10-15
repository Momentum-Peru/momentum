import { Component, signal, inject, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { EmailAccount, CreateEmailAccountRequest, UpdateEmailAccountRequest, EmailProvider } from '../../shared/interfaces/email-account.interface';

@Component({
    selector: 'app-email-account-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, Button],
    templateUrl: './email-account-form.html',
    styleUrl: './email-account-form.scss'
})
export class EmailAccountFormComponent implements OnInit {
    private fb = inject(FormBuilder);
    private messageService = inject(MessageService);

    // Inputs
    account = input<EmailAccount | null>(null);
    isEditing = input<boolean>(false);
    isLoading = input<boolean>(false);

    // Outputs
    onSubmit = output<CreateEmailAccountRequest | UpdateEmailAccountRequest>();
    onCancel = output<void>();

    // Formulario reactivo
    emailForm!: FormGroup;

    // Estados locales
    selectedProvider = signal<EmailProvider>('smtp');

    constructor() {
        console.log('EmailAccountFormComponent initialized');
    }

    ngOnInit(): void {
        this.initializeForm();
        this.setupFormSubscriptions();
    }

    /**
     * Inicializa el formulario reactivo
     */
    private initializeForm(): void {
        const account = this.account();

        this.emailForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
            provider: ['smtp', Validators.required],
            host: ['', [Validators.required, Validators.minLength(3)]],
            port: [587, [Validators.required, Validators.min(1), Validators.max(65535)]],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            secure: [true]
        });

        // Si estamos editando, cargar los datos existentes
        if (account && this.isEditing()) {
            this.loadAccountData(account);
        }
    }

    /**
     * Configura las suscripciones del formulario
     */
    private setupFormSubscriptions(): void {
        // Suscribirse a cambios en el tipo de conexión
        this.emailForm.get('provider')?.valueChanges.subscribe((provider: EmailProvider) => {
            this.selectedProvider.set(provider);
            this.updatePortForProvider(provider);
        });
    }

    /**
     * Actualiza el puerto según el tipo de conexión
     */
    private updatePortForProvider(provider: EmailProvider): void {
        const portControl = this.emailForm.get('port');
        if (portControl) {
            if (provider === 'smtp') {
                portControl.setValue(587);
            } else if (provider === 'imap') {
                portControl.setValue(993);
            }
        }
    }

    /**
     * Carga los datos de una cuenta existente en el formulario
     */
    private loadAccountData(account: EmailAccount): void {
        this.emailForm.patchValue({
            name: account.name,
            provider: account.provider,
            host: account.host,
            port: account.port,
            email: account.email,
            password: '', // No cargar la contraseña por seguridad
            secure: account.secure
        });
    }

    /**
     * Maneja el envío del formulario
     */
    onSubmitForm(): void {
        if (this.emailForm.valid) {
            const formData = this.emailForm.value;

            if (this.isEditing()) {
                // Actualizar cuenta existente
                const updateRequest: UpdateEmailAccountRequest = {
                    name: formData.name,
                    provider: formData.provider,
                    host: formData.host,
                    port: formData.port,
                    email: formData.email,
                    password: formData.password,
                    secure: formData.secure
                };
                this.onSubmit.emit(updateRequest);
            } else {
                // Crear nueva cuenta
                const createRequest: CreateEmailAccountRequest = {
                    name: formData.name,
                    provider: formData.provider,
                    host: formData.host,
                    port: formData.port,
                    email: formData.email,
                    password: formData.password,
                    secure: formData.secure
                };
                this.onSubmit.emit(createRequest);
            }
        } else {
            // Marcar todos los campos como tocados para mostrar errores
            this.emailForm.markAllAsTouched();

            this.messageService.add({
                severity: 'error',
                summary: 'Formulario Inválido',
                detail: 'Por favor, completa todos los campos requeridos correctamente'
            });
        }
    }

    /**
     * Verifica si un campo tiene error
     */
    hasFieldError(fieldName: string): boolean {
        const field = this.emailForm.get(fieldName);
        return !!(field && field.invalid && field.touched);
    }

    /**
     * Obtiene el mensaje de error para un campo
     */
    getFieldError(fieldName: string): string {
        const field = this.emailForm.get(fieldName);
        if (field && field.errors && field.touched) {
            if (field.errors['required']) {
                return 'Este campo es requerido';
            }
            if (field.errors['email']) {
                return 'Ingresa un email válido';
            }
            if (field.errors['minlength']) {
                return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
            }
            if (field.errors['maxlength']) {
                return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
            }
            if (field.errors['min']) {
                return `Valor mínimo: ${field.errors['min'].min}`;
            }
            if (field.errors['max']) {
                return `Valor máximo: ${field.errors['max'].max}`;
            }
        }
        return '';
    }
}