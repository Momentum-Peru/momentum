import { Component, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';

// PrimeNG Components
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Services
import { AuthService, RegisterRequest } from '../login/services/auth.service';

/**
 * Componente de registro de usuarios
 * Principio de Responsabilidad Única: Solo maneja el registro de nuevos usuarios
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  registerForm: FormGroup;
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  isLoading = signal(false);

  constructor() {
    this.registerForm = this.fb.group(
      {
        name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );
  }

  /**
   * Validador personalizado para verificar que las contraseñas coincidan
   */
  passwordMatchValidator(form: FormGroup): Record<string, boolean> | null {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    if (confirmPassword.hasError('passwordMismatch')) {
      confirmPassword.setErrors(null);
    }

    return null;
  }

  /**
   * Alterna la visibilidad de la contraseña
   */
  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  /**
   * Alterna la visibilidad de la confirmación de contraseña
   */
  toggleConfirmPassword(): void {
    this.showConfirmPassword.update((value) => !value);
  }

  /**
   * Verifica si un campo es inválido y ha sido tocado
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Obtiene el mensaje de error para un campo
   */
  getFieldError(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    if (!field || !field.errors) return '';

    const errors = field.errors;

    if (errors['required']) {
      const labels: Record<string, string> = {
        name: 'Nombre',
        email: 'Correo',
        password: 'Contraseña',
        confirmPassword: 'Confirmar contraseña',
      };
      return `${labels[fieldName] || fieldName} es requerido`;
    }

    if (errors['email']) {
      return 'Por favor ingresa un correo válido';
    }

    if (errors['minlength']) {
      if (fieldName === 'name') {
        return 'El nombre debe tener al menos 2 caracteres';
      }
      return 'La contraseña debe tener al menos 6 caracteres';
    }

    if (errors['maxlength']) {
      return 'El nombre no puede exceder los 50 caracteres';
    }

    if (errors['passwordMismatch']) {
      return 'Las contraseñas no coinciden';
    }

    return '';
  }

  /**
   * Maneja el envío del formulario de registro
   */
  async onSubmit(): Promise<void> {
    if (this.registerForm.valid) {
      this.isLoading.set(true);

      const registerData: RegisterRequest = {
        name: this.registerForm.value.name,
        email: this.registerForm.value.email,
        password: this.registerForm.value.password,
        role: 'user', // Por defecto 'user'
      };

      try {
        const response = await firstValueFrom(this.authService.register(registerData));

        // El backend ya asigna automáticamente el tenant "momentum" al registrarse
        // Verificar que se asignó correctamente
        if (response.user?.tenantIds && response.user.tenantIds.length > 0) {
          console.log('Tenant asignado correctamente:', response.user.tenantIds);
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Registro exitoso. Bienvenido a Momentum!',
        });

        // Redirigir al login después de un breve delay
        setTimeout(() => {
          this.router.navigateByUrl('/ingreso', { replaceUrl: true });
        }, 1500);
      } catch (error: unknown) {
        console.error('Register error:', error);

        let errorMessage = 'Error al registrar usuario';

        if (error && typeof error === 'object' && 'status' in error) {
          const httpError = error as { status: number; error?: { message?: string } };
          if (httpError.status === 409) {
            errorMessage = 'El email ya está registrado';
          } else if (httpError.status === 400) {
            errorMessage = httpError.error?.message || 'Datos de entrada inválidos';
          } else if (httpError.status === 0) {
            errorMessage = 'No se pudo conectar con el servidor';
          }
        }

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
        });
      } finally {
        this.isLoading.set(false);
      }
    } else {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.registerForm.controls).forEach((key) => {
        this.registerForm.get(key)?.markAsTouched();
      });

      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario inválido',
        detail: 'Por favor completa todos los campos correctamente',
      });
    }
  }

  /**
   * Navega al login
   */
  goToLogin(): void {
    this.router.navigateByUrl('/ingreso');
  }
}
