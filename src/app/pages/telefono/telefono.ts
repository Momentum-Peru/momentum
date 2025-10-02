import { Component, signal, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Toast } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PhoneService, Phone, CreatePhoneRequest, UpdatePhoneRequest } from './services/phone.service';
import { AuthService } from '../login/services/auth.service';
import { firstValueFrom } from 'rxjs';

interface Country {
    name: string;
    code: string;
    dialCode: string;
    flag: string;
}

@Component({
    selector: 'app-telefono',
    standalone: true,
    imports: [Button, InputText, Toast, ConfirmDialogModule, ReactiveFormsModule],
    providers: [ConfirmationService],
    templateUrl: './telefono.html',
    styleUrl: './telefono.scss'
})
export class Telefono implements OnInit {
    private phoneService = inject(PhoneService);
    private authService = inject(AuthService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    private fb = inject(FormBuilder);

    // Estados
    phoneData = signal<Phone | null>(null);
    isLoading = signal(false);
    isDeleting = signal(false);
    selectedCountry = signal<Country | null>(null);

    // Formulario
    phoneForm: FormGroup;

    // Lista de países con códigos de marcación (ordenados alfabéticamente)
    countries: Country[] = [
        { name: 'Alemania', code: 'DE', dialCode: '+49', flag: '🇩🇪' },
        { name: 'Argentina', code: 'AR', dialCode: '+54', flag: '🇦🇷' },
        { name: 'Bolivia', code: 'BO', dialCode: '+591', flag: '🇧🇴' },
        { name: 'Brasil', code: 'BR', dialCode: '+55', flag: '🇧🇷' },
        { name: 'Canadá', code: 'CA', dialCode: '+1', flag: '🇨🇦' },
        { name: 'Chile', code: 'CL', dialCode: '+56', flag: '🇨🇱' },
        { name: 'Colombia', code: 'CO', dialCode: '+57', flag: '🇨🇴' },
        { name: 'Ecuador', code: 'EC', dialCode: '+593', flag: '🇪🇨' },
        { name: 'España', code: 'ES', dialCode: '+34', flag: '🇪🇸' },
        { name: 'Estados Unidos', code: 'US', dialCode: '+1', flag: '🇺🇸' },
        { name: 'Francia', code: 'FR', dialCode: '+33', flag: '🇫🇷' },
        { name: 'Italia', code: 'IT', dialCode: '+39', flag: '🇮🇹' },
        { name: 'México', code: 'MX', dialCode: '+52', flag: '🇲🇽' },
        { name: 'Países Bajos', code: 'NL', dialCode: '+31', flag: '🇳🇱' },
        { name: 'Paraguay', code: 'PY', dialCode: '+595', flag: '🇵🇾' },
        { name: 'Perú', code: 'PE', dialCode: '+51', flag: '🇵🇪' },
        { name: 'Portugal', code: 'PT', dialCode: '+351', flag: '🇵🇹' },
        { name: 'Reino Unido', code: 'GB', dialCode: '+44', flag: '🇬🇧' },
        { name: 'Uruguay', code: 'UY', dialCode: '+598', flag: '🇺🇾' },
        { name: 'Venezuela', code: 'VE', dialCode: '+58', flag: '🇻🇪' }
    ];

    constructor() {
        this.phoneForm = this.fb.group({
            country: ['PE', [Validators.required]],
            phone: ['', [Validators.required, Validators.pattern(/^\d{6,15}$/)]]
        });

        // Establecer Perú como país por defecto
        const defaultCountry = this.countries.find(c => c.code === 'PE');
        if (defaultCountry) {
            this.selectedCountry.set(defaultCountry);
        }
    }

    ngOnInit(): void {
        this.loadPhoneData();
    }

    /**
     * Carga los datos del teléfono del usuario
     */
    async loadPhoneData(): Promise<void> {
        try {
            const user = this.authService.getCurrentUser();
            if (user) {
                const phone = await firstValueFrom(this.phoneService.getUserPhone(user.id));
                this.phoneData.set(phone);

                // Prellenar el formulario si existe teléfono
                if (phone) {
                    // Extraer código de país y número del teléfono existente
                    const phoneNumber = phone.phone;
                    const country = this.countries.find(c => phoneNumber.startsWith(c.dialCode));

                    if (country) {
                        const numberWithoutCode = phoneNumber.replace(country.dialCode, '');
                        this.selectedCountry.set(country);
                        this.phoneForm.patchValue({
                            country: country.code,
                            phone: numberWithoutCode
                        });
                    }
                }
            }
        } catch (error: any) {
            if (error.status === 404) {
                // No hay teléfono registrado, es normal
                this.phoneData.set(null);
            } else {
                console.error('Error cargando datos del teléfono:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudieron cargar los datos del teléfono'
                });
            }
        }
    }

    /**
     * Verifica si un campo es inválido y ha sido tocado
     */
    isFieldInvalid(fieldName: string): boolean {
        const field = this.phoneForm.get(fieldName);
        return !!(field && field.invalid && (field.dirty || field.touched));
    }

    /**
     * Obtiene el mensaje de error para un campo
     */
    getFieldError(fieldName: string): string {
        const field = this.phoneForm.get(fieldName);
        if (!field || !field.errors) return '';

        const errors = field.errors;

        if (errors['required']) {
            return 'El número de teléfono es requerido';
        }

        if (errors['pattern']) {
            return 'Formato inválido. Solo números (6-15 dígitos)';
        }

        return '';
    }

    /**
     * Maneja el envío del formulario
     */
    async onSubmit(): Promise<void> {
        if (this.phoneForm.valid) {
            this.isLoading.set(true);

            const user = this.authService.getCurrentUser();
            console.log('👤 Usuario actual:', user);
            if (!user) {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Usuario no autenticado'
                });
                this.isLoading.set(false);
                return;
            }

            try {
                // Construir número completo con código de país
                const countryCode = this.phoneForm.value.country;
                const phoneNumber = this.phoneForm.value.phone;
                const country = this.countries.find(c => c.code === countryCode);
                const fullPhoneNumber = `${country?.dialCode}${phoneNumber}`;

                if (this.phoneData()) {
                    // Actualizar teléfono existente
                    const updateData: UpdatePhoneRequest = {
                        phone: fullPhoneNumber,
                        isActive: true
                    };

                    const updatedPhone = await firstValueFrom(
                        this.phoneService.updatePhone(this.phoneData()!.id, updateData)
                    );

                    this.phoneData.set(updatedPhone);

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Actualizado',
                        detail: 'Teléfono actualizado exitosamente. El agente podrá reconocer tu nuevo número.'
                    });
                } else {
                    // Crear nuevo teléfono
                    const createData: CreatePhoneRequest = {
                        userId: user.id,
                        phone: fullPhoneNumber,
                        isActive: true,
                        isVerified: false
                    };

                    console.log('📱 Enviando datos al backend:', createData);
                    console.log('👤 Usuario actual:', user);

                    const newPhone = await firstValueFrom(this.phoneService.createPhone(createData));
                    this.phoneData.set(newPhone);

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Registrado',
                        detail: 'Teléfono registrado exitosamente. El agente podrá reconocer tu número.'
                    });
                }
            } catch (error: any) {
                console.error('Error guardando teléfono:', error);

                let errorMessage = 'Error al guardar el teléfono';

                if (error.status === 400) {
                    errorMessage = 'Datos de entrada inválidos';
                } else if (error.status === 409) {
                    errorMessage = 'Ya tienes un teléfono registrado o el número está en uso';
                } else if (error.status === 401) {
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
        } else {
            // Marcar todos los campos como tocados para mostrar errores
            Object.keys(this.phoneForm.controls).forEach(key => {
                this.phoneForm.get(key)?.markAsTouched();
            });

            this.messageService.add({
                severity: 'warn',
                summary: 'Formulario inválido',
                detail: 'Por favor completa todos los campos correctamente'
            });
        }
    }

    /**
     * Muestra el diálogo de confirmación para eliminar el teléfono
     */
    confirmDeletePhone(): void {
        this.confirmationService.confirm({
            message: '¿Estás seguro de que deseas eliminar tu número de teléfono? Esta acción no se puede deshacer.',
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            accept: () => {
                this.deletePhone();
            }
        });
    }

    /**
     * Elimina el teléfono del usuario
     */
    async deletePhone(): Promise<void> {
        if (!this.phoneData()) return;

        this.isDeleting.set(true);

        try {
            await firstValueFrom(this.phoneService.deletePhone(this.phoneData()!.id));

            this.phoneData.set(null);
            this.phoneForm.reset();

            this.messageService.add({
                severity: 'success',
                summary: 'Eliminado',
                detail: 'Teléfono eliminado exitosamente'
            });
        } catch (error: any) {
            console.error('Error eliminando teléfono:', error);

            let errorMessage = 'Error al eliminar el teléfono';
            if (error.status === 401) {
                errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente';
            } else if (error.status === 404) {
                errorMessage = 'Teléfono no encontrado';
            }

            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: errorMessage
            });
        } finally {
            this.isDeleting.set(false);
        }
    }

    /**
     * Maneja el cambio de país seleccionado
     */
    onCountryChange(event: any): void {
        const countryCode = event.target.value;
        const country = this.countries.find(c => c.code === countryCode);
        if (country) {
            this.selectedCountry.set(country);
        }
    }

    /**
     * Formatea una fecha para mostrar
     */
    formatDate(dateString: string | undefined): string {
        if (!dateString) return 'N/A';

        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return 'N/A';
        }
    }
}
