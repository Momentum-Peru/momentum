import { Component, OnInit, signal, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FaceRecognitionApiService } from '../../shared/services/face-recognition-api.service';
import { UsersApiService, User } from '../../shared/services/users-api.service';
import { UserOption } from '../../shared/interfaces/menu-permission.interface';
import { FaceDescriptor } from '../../shared/interfaces/face-recognition.interface';
import { TenantService } from '../../core/services/tenant.service';

/**
 * Componente de Registro de Reconocimiento Facial
 * Principio de Responsabilidad Única: Gestiona la UI y estado del registro de rostros
 */
@Component({
  selector: 'app-face-recognition-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    DialogModule,
    SelectModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    CardModule,
    FileUploadModule,
  ],
  templateUrl: './face-recognition-register.html',
  styleUrl: './face-recognition-register.scss',
  providers: [MessageService, ConfirmationService],
})
export class FaceRecognitionRegisterPage implements OnInit {
  private readonly faceRecognitionApi = inject(FaceRecognitionApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly tenantService = inject(TenantService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  users = signal<UserOption[]>([]);
  descriptors = signal<FaceDescriptor[]>([]);
  selectedUserId = signal<string>('');
  selectedImage = signal<File | null>(null);
  imagePreview = signal<string | null>(null);
  showDialog = signal(false);
  loading = signal(false);
  query = signal('');

  // Filtrado de usuarios
  filteredUsers = computed(() => {
    const searchQuery = this.query().toLowerCase().trim();
    const list = this.users();

    if (!searchQuery) return list;
    return list.filter((user) => {
      const nameMatch = user.name?.toLowerCase().includes(searchQuery) ?? false;
      const emailMatch = user.email?.toLowerCase().includes(searchQuery) ?? false;
      return nameMatch || emailMatch;
    });
  });

  // Descriptores filtrados por usuario seleccionado
  filteredDescriptors = computed(() => {
    const userId = this.selectedUserId();
    if (!userId) return [];
    return this.descriptors().filter((d) => {
      const id = typeof d.userId === 'object' && d.userId && '_id' in d.userId
        ? (d.userId as any)._id
        : d.userId;
      return id === userId;
    });
  });

  ngOnInit() {
    this.loadUsers();
  }

  constructor() {
    effect(() => {
      if (!this.showDialog()) {
        this.selectedImage.set(null);
        this.imagePreview.set(null);
        this.selectedUserId.set('');
      }
    });
  }

  loadUsers() {
    this.usersApi.list().subscribe({
      next: (users) => {
        this.users.set(users);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los usuarios',
        });
      },
    });
  }

  loadDescriptors(userId: string) {
    const tenantId = this.tenantService.tenantId();
    if (!tenantId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No hay una empresa seleccionada',
      });
      return;
    }

    this.loading.set(true);
    this.faceRecognitionApi.getDescriptorsByUser(userId, tenantId).subscribe({
      next: (descriptors) => {
        this.descriptors.set(descriptors);
        this.loading.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los descriptores faciales',
        });
        this.loading.set(false);
      },
    });
  }

  setQuery(value: string) {
    this.query.set(value);
  }

  onUserSelect(userId: string) {
    this.selectedUserId.set(userId);
    if (userId) {
      this.loadDescriptors(userId);
    } else {
      this.descriptors.set([]);
    }
  }

  onImageSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El archivo debe ser una imagen',
      });
      input.value = '';
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'La imagen no debe exceder 5MB',
      });
      input.value = '';
      return;
    }

    this.selectedImage.set(file);

    // Crear preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.selectedImage.set(null);
    this.imagePreview.set(null);
    const input = document.getElementById('imageInput') as HTMLInputElement;
    if (input) input.value = '';
  }

  openRegisterDialog() {
    this.selectedUserId.set('');
    this.selectedImage.set(null);
    this.imagePreview.set(null);
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  registerFace() {
    const userId = this.selectedUserId();
    const image = this.selectedImage();

    if (!userId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debes seleccionar un usuario',
      });
      return;
    }

    if (!image) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debes seleccionar una imagen',
      });
      return;
    }

    const tenantId = this.tenantService.tenantId();
    if (!tenantId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No hay una empresa seleccionada',
      });
      return;
    }

    this.loading.set(true);
    this.faceRecognitionApi.registerFace(userId, image, tenantId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Rostro registrado correctamente',
        });
        this.closeDialog();
        if (userId) {
          this.loadDescriptors(userId);
        }
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.getErrorMessage(error),
        });
        this.loading.set(false);
      },
    });
  }

  deleteDescriptor(descriptor: FaceDescriptor) {
    const userName = this.getUserName(descriptor.userId);
    this.confirmationService.confirm({
      message: `¿Estás seguro de que quieres eliminar el descriptor facial de "${userName}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        const tenantId = this.tenantService.tenantId();
        if (!tenantId) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No hay una empresa seleccionada',
          });
          return;
        }

        this.loading.set(true);
        this.faceRecognitionApi.deleteDescriptor(descriptor._id, tenantId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Descriptor facial eliminado correctamente',
            });
            const userId = this.selectedUserId();
            if (userId) {
              this.loadDescriptors(userId);
            }
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: this.getErrorMessage(error),
            });
            this.loading.set(false);
          },
        });
      },
    });
  }

  getUserName(userId: string | any): string {
    if (!userId) return 'Usuario desconocido';
    const id = typeof userId === 'object' && userId && '_id' in userId
      ? (userId as any)._id
      : userId;
    const user = this.users().find((u) => u._id === id);
    return user?.name || 'Usuario desconocido';
  }

  getUserEmail(userId: string | any): string {
    if (!userId) return '';
    const id = typeof userId === 'object' && userId && '_id' in userId
      ? (userId as any)._id
      : userId;
    const user = this.users().find((u) => u._id === id);
    return user?.email || '';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private getErrorMessage(error: any): string {
    if (error.error?.message) {
      const message = error.error.message;
      if (message.includes('No se detectó ninguna cara')) {
        return 'No se detectó ninguna cara en la imagen. Asegúrate de que la imagen contenga un rostro visible.';
      }
      if (message.includes('Ya existe un descriptor facial activo')) {
        return 'Ya existe un descriptor facial activo para este usuario. Elimina el existente antes de registrar uno nuevo.';
      }
      return message;
    }

    if (error.error?.error) {
      return error.error.error;
    }

    if (error.message) {
      return error.message;
    }

    return 'Ha ocurrido un error inesperado';
  }
}

