import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
  ViewChild,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { FileUploadModule, FileUpload, FileSelectEvent } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ProfileApiService } from '../../shared/services/profile-api.service';
import { UserProfile, UpdateProfileRequest } from '../../shared/interfaces/profile.interface';

/**
 * Componente de página de perfil de usuario
 * Principio de Responsabilidad Única: Responsable únicamente de la presentación y gestión del perfil del usuario
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    CardModule,
    FileUploadModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage implements OnInit {
  private readonly profileApi = inject(ProfileApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);

  @ViewChild('fileUpload') fileUploadComponent!: FileUpload;

  // Signals para estado
  profile = signal<UserProfile | null>(null);
  loading = signal<boolean>(false);
  uploadingPhoto = signal<boolean>(false);
  deletingPhoto = signal<boolean>(false);

  // Formulario reactivo
  profileForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
  });

  constructor() {
    // Efecto para actualizar el formulario cuando cambia el perfil
    effect(() => {
      const currentProfile = this.profile();
      if (currentProfile) {
        this.profileForm.patchValue(
          {
            name: currentProfile.name,
          },
          { emitEvent: false }
        );
      }
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  /**
   * Carga el perfil del usuario autenticado
   */
  loadProfile(): void {
    this.loading.set(true);
    this.profileApi.getProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar perfil:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el perfil. Por favor, intenta nuevamente.',
        });
        this.loading.set(false);
      },
    });
  }

  /**
   * Actualiza el perfil del usuario
   */
  updateProfile(): void {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched(this.profileForm);
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'Por favor, completa todos los campos requeridos correctamente.',
      });
      return;
    }

    const formValue = this.profileForm.value;
    const updateData: UpdateProfileRequest = {
      name: formValue.name?.trim(),
    };

    this.loading.set(true);
    this.profileApi.updateProfile(updateData).subscribe({
      next: (updatedProfile) => {
        this.profile.set(updatedProfile);
        this.loading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Perfil actualizado correctamente.',
        });
      },
      error: (error) => {
        console.error('Error al actualizar perfil:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail:
            error.error?.message ||
            'No se pudo actualizar el perfil. Por favor, intenta nuevamente.',
        });
        this.loading.set(false);
      },
    });
  }

  /**
   * Maneja la selección de archivo para la foto de perfil
   */
  onFileSelect(event: FileSelectEvent): void {
    const file = event.files[0];
    if (!file) {
      return;
    }

    // Validar tipo de archivo
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml',
      'image/tiff',
      'image/heic',
      'image/heif',
      'image/x-icon',
      'image/vnd.microsoft.icon',
      'image/avif',
      'image/apng',
    ];

    if (!validTypes.includes(file.type)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Tipo de archivo inválido',
        detail: 'Por favor, selecciona una imagen válida (JPEG, PNG, GIF, WebP, etc.).',
      });
      if (this.fileUploadComponent) {
        this.fileUploadComponent.clear();
      }
      return;
    }

    // Validar tamaño (20MB máximo)
    const maxSize = 20 * 1024 * 1024; // 20MB en bytes
    if (file.size > maxSize) {
      this.messageService.add({
        severity: 'error',
        summary: 'Archivo demasiado grande',
        detail: 'El archivo no puede exceder 20MB. Por favor, selecciona una imagen más pequeña.',
      });
      if (this.fileUploadComponent) {
        this.fileUploadComponent.clear();
      }
      return;
    }

    // Subir el archivo
    this.uploadPhoto(file);
  }

  /**
   * Sube la foto de perfil al servidor
   */
  uploadPhoto(file: File): void {
    this.uploadingPhoto.set(true);
    this.profileApi.uploadProfilePicture(file).subscribe({
      next: (updatedProfile) => {
        this.profile.set(updatedProfile);
        this.uploadingPhoto.set(false);
        if (this.fileUploadComponent) {
          this.fileUploadComponent.clear();
        }
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Foto de perfil actualizada correctamente.',
        });
      },
      error: (error) => {
        console.error('Error al subir foto:', error);
        this.uploadingPhoto.set(false);
        if (this.fileUploadComponent) {
          this.fileUploadComponent.clear();
        }
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail:
            error.error?.message || 'No se pudo subir la foto. Por favor, intenta nuevamente.',
        });
      },
    });
  }

  /**
   * Elimina la foto de perfil
   */
  deletePhoto(): void {
    this.confirmationService.confirm({
      message: '¿Estás seguro de que deseas eliminar tu foto de perfil?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deletingPhoto.set(true);
        this.profileApi.deleteProfilePicture().subscribe({
          next: (updatedProfile) => {
            this.profile.set(updatedProfile);
            this.deletingPhoto.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Foto de perfil eliminada correctamente.',
            });
          },
          error: (error) => {
            console.error('Error al eliminar foto:', error);
            this.deletingPhoto.set(false);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail:
                error.error?.message ||
                'No se pudo eliminar la foto. Por favor, intenta nuevamente.',
            });
          },
        });
      },
    });
  }

  /**
   * Marca todos los campos del formulario como touched para mostrar errores
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Obtiene el mensaje de error para un campo del formulario
   */
  getFieldError(fieldName: string): string {
    const field = this.profileForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return 'Este campo es requerido';
      }
      if (field.errors['minlength']) {
        return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      }
      if (field.errors['maxlength']) {
        return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
      }
    }
    return '';
  }

  /**
   * Verifica si un campo tiene error
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  /**
   * Obtiene el severity del tag según el rol del usuario
   */
  getRoleSeverity(role: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    if (role === 'admin') {
      return 'danger';
    }
    if (role === 'gerencia') {
      return 'warn';
    }
    return 'info';
  }
}
