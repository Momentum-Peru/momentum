import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AssociationMembersApiService } from '../../shared/services/association-members-api.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-association-quio-lima-page',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, Toast],
  templateUrl: './association-quio-lima.page.html',
  styleUrl: './association-quio-lima.page.scss',
  providers: [MessageService],
})
export class AssociationQuioLimaPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AssociationMembersApiService);
  private readonly messages = inject(MessageService);

  readonly submittedOk = signal(false);
  readonly loading = signal(false);

  readonly form = this.fb.group({
    nombreCompleto: ['', [Validators.maxLength(250)]],
    dni: ['', [Validators.maxLength(20)]],
    telefono: ['', [Validators.maxLength(30)]],
    email: ['', [Validators.email, Validators.maxLength(120)]],
    direccion: ['', [Validators.maxLength(500)]],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    const v = this.form.getRawValue();
    this.api
      .createPublic({
        nombreCompleto: v.nombreCompleto?.trim() || undefined,
        dni: v.dni?.trim() || undefined,
        telefono: v.telefono?.trim() || undefined,
        email: v.email?.trim() || undefined,
        direccion: v.direccion?.trim() || undefined,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.submittedOk.set(true);
          this.messages.add({
            severity: 'success',
            summary: 'Registro recibido',
            detail: 'Gracias. Tus datos fueron guardados correctamente.',
          });
        },
        error: (err) => {
          const msg =
            err?.error?.message?.[0] ||
            err?.error?.message ||
            err?.message ||
            'No se pudo completar el registro. Intenta más tarde.';
          this.messages.add({
            severity: 'error',
            summary: 'Error',
            detail: typeof msg === 'string' ? msg : 'Error al enviar el formulario.',
          });
        },
      });
  }

  resetForm(): void {
    this.submittedOk.set(false);
    this.form.reset();
  }

  fieldInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.dirty || c.touched);
  }
}
