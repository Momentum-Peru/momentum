import { Component, signal, inject, viewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Toast } from 'primeng/toast';
import { Router } from '@angular/router';
import { AuthService, LoginRequest } from './services/auth.service';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { PasswordRecoveryDialog } from './components/password-recovery-dialog/password-recovery-dialog';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [Button, InputText, Toast, ReactiveFormsModule, PasswordRecoveryDialog],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  loginForm: FormGroup;
  showPassword = signal(false);
  isLoading = signal(false);
  
  // Referencia al diálogo de recuperación de contraseña
  passwordRecoveryDialog = viewChild(PasswordRecoveryDialog);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  /**
   * Alterna la visibilidad de la contraseña
   */
  togglePassword(): void {
    this.showPassword.update(value => !value);
  }

  /**
   * Verifica si un campo es inválido y ha sido tocado
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Obtiene el mensaje de error para un campo
   */
  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (!field || !field.errors) return '';

    const errors = field.errors;

    if (errors['required']) {
      return `${fieldName === 'email' ? 'Correo' : 'Contraseña'} es requerido`;
    }

    if (errors['email']) {
      return 'Por favor ingresa un correo válido';
    }

    if (errors['minlength']) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }

    return '';
  }

  /**
   * Maneja el envío del formulario de login
   * Usa firstValueFrom() en lugar de toPromise() (deprecado en Angular)
   */
  async onSubmit(): Promise<void> {
    if (this.loginForm.valid) {
      this.isLoading.set(true);

      const loginData: LoginRequest = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password
      };

      try {
        await firstValueFrom(this.authService.login(loginData));

        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Inicio de sesión exitoso'
        });

        // Forzar redirección después del login exitoso
        // Usar navigateByUrl para forzar la navegación
        setTimeout(() => {
          this.router.navigateByUrl('/calendario', { replaceUrl: true });
        }, 500); // Delay más corto para mejor UX

      } catch (error: unknown) {
        console.error('Login error:', error);

        let errorMessage = 'Error al iniciar sesión';

        if (error && typeof error === 'object' && 'status' in error) {
          const httpError = error as { status: number };
          if (httpError.status === 401) {
            errorMessage = 'Credenciales inválidas';
          } else if (httpError.status === 400) {
            errorMessage = 'Datos de entrada inválidos';
          } else if (httpError.status === 0) {
            errorMessage = 'No se pudo conectar con el servidor';
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
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });

      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario inválido',
        detail: 'Por favor completa todos los campos correctamente'
      });
    }
  }

  /**
   * Maneja el login con Google
   */
  onGoogleLogin(): void {
    this.authService.loginWithGoogle();
  }

  /**
   * Maneja el login con Apple (placeholder)
   */
  onAppleLogin(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Próximamente',
      detail: 'Login con Apple estará disponible pronto'
    });
  }

  /**
   * Maneja el login con Facebook (placeholder)
   */
  onFacebookLogin(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Próximamente',
      detail: 'Login con Facebook estará disponible pronto'
    });
  }

  /**
   * Abre el diálogo de recuperación de contraseña
   */
  openPasswordRecovery(): void {
    this.passwordRecoveryDialog()?.open();
  }
}
