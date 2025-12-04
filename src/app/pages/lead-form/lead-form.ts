import { Component, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Toast } from 'primeng/toast';
import { Dialog } from 'primeng/dialog';
import { Checkbox } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { LeadFormService } from './services/lead-form.service';
import { firstValueFrom } from 'rxjs';

/**
 * Componente del formulario de leads
 * Responsabilidad: Gestión de la UI del formulario y presentación
 */
@Component({
  selector: 'app-lead-form',
  standalone: true,
  imports: [Button, InputText, ToggleSwitch, Toast, Dialog, Checkbox, ReactiveFormsModule],
  templateUrl: './lead-form.html',
  styleUrl: './lead-form.scss'
})
export class LeadFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly leadFormService = inject(LeadFormService);

  leadForm: FormGroup;
  isLoading = signal(false);
  isSubmitted = signal(false);
  privacyModalVisible = signal(false);

  constructor() {
    this.leadForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(20)]],
      address: ['', [Validators.maxLength(200)]],
      referredBy: ['', [Validators.maxLength(120)]],
      hasCompany: [false],
      company: ['', [Validators.minLength(2), Validators.maxLength(120)]],
      dni: ['', [Validators.maxLength(15)]],
      ruc: ['', [Validators.maxLength(20)]],
      acceptPrivacyPolicy: [false, [Validators.requiredTrue]],
    });
  }

  /**
   * Verifica si un campo es inválido y ha sido tocado
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.leadForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Obtiene el mensaje de error para un campo
   */
  getFieldError(fieldName: string): string {
    const field = this.leadForm.get(fieldName);
    if (!field || !field.errors) return '';

    const errors = field.errors;

    if (errors['required']) {
      return `${this.getFieldLabel(fieldName)} es requerido`;
    }

    if (errors['email']) {
      return 'Por favor ingresa un correo válido';
    }

    if (errors['minlength']) {
      const minLength = errors['minlength'].requiredLength;
      return `${this.getFieldLabel(fieldName)} debe tener al menos ${minLength} caracteres`;
    }

    if (errors['maxlength']) {
      const maxLength = errors['maxlength'].requiredLength;
      return `${this.getFieldLabel(fieldName)} no puede exceder ${maxLength} caracteres`;
    }

    return '';
  }

  /**
   * Obtiene la etiqueta del campo para mensajes de error
   */
  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      name: 'Nombre',
      email: 'Correo',
      phone: 'Teléfono',
      address: 'Dirección',
      referredBy: 'Referido por',
      hasCompany: '¿Tiene empresa?',
      company: 'Empresa',
      dni: 'DNI',
      ruc: 'RUC',
      acceptPrivacyPolicy: 'Política de Privacidad'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Abre el modal de política de privacidad
   */
  openPrivacyModal(): void {
    this.privacyModalVisible.set(true);
  }

  /**
   * Cierra el modal de política de privacidad
   */
  closePrivacyModal(): void {
    this.privacyModalVisible.set(false);
  }

  /**
   * Maneja el envío del formulario
   */
  async onSubmit(): Promise<void> {
    this.isSubmitted.set(true);

    if (this.leadForm.valid) {
      this.isLoading.set(true);

      const formValue = this.leadForm.value;
      const formData = {
        name: formValue.name,
        email: formValue.email,
        phone: formValue.phone,
        address: formValue.address,
        referredBy: formValue.referredBy,
        hasCompany: formValue.hasCompany,
        company: formValue.company,
        dni: formValue.dni,
        ruc: formValue.ruc
      };

      try {
        await firstValueFrom(this.leadFormService.submitLead(formData));

        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Tu información ha sido enviada correctamente. Te contactaremos pronto.'
        });

        // Resetear el formulario después de 1 segundo
        setTimeout(() => {
          this.leadForm.reset({
            hasCompany: false,
            acceptPrivacyPolicy: false,
          });
          this.isSubmitted.set(false);
        }, 1500);

      } catch (error: unknown) {
        console.error('Error al enviar el formulario:', error);

        let errorMessage = 'Error al enviar la información. Por favor intenta nuevamente.';
        const status = typeof (error as { status?: unknown })?.status === 'number'
          ? (error as { status: number }).status
          : undefined;

        if (status === 400) {
          errorMessage = 'Datos de entrada inválidos. Por favor verifica la información.';
        } else if (status === 0) {
          errorMessage = 'No se pudo conectar con el servidor. Por favor intenta más tarde.';
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
      Object.keys(this.leadForm.controls).forEach(key => {
        this.leadForm.get(key)?.markAsTouched();
      });

      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario inválido',
        detail: 'Por favor completa todos los campos correctamente'
      });
    }
  }
}

