import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersApiService, User } from '../../shared/services/users-api.service';
import { CompaniesApiService } from '../../shared/services/companies-api.service';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { MultiSelectModule } from 'primeng/multiselect';

interface CompanyOption {
  _id: string;
  name: string;
  code?: string;
}

interface UserWithTenants extends User {
  tenantIds?: string[];
}

/**
 * Página de configuración para asignar empresas (tenantIds) a usuarios
 * SRP: Solo gestiona la asignación de tenantIds a usuarios
 */
@Component({
  selector: 'app-user-tenants-assignment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    DialogModule,
    TagModule,
    CardModule,
    ToastModule,
    TooltipModule,
    ConfirmDialogModule,
    MultiSelectModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './user-tenants-assignment.html',
  styleUrls: ['./user-tenants-assignment.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserTenantsAssignmentPage implements OnInit {
  private readonly usersApi = inject(UsersApiService);
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  // Estado
  users = signal<UserWithTenants[]>([]);
  companies = signal<CompanyOption[]>([]);
  loading = signal<boolean>(false);
  query = signal<string>('');
  showDialog = signal<boolean>(false);
  editingUser = signal<UserWithTenants | null>(null);
  selectedTenantIds = signal<string[]>([]);

  // Computed
  filteredUsers = computed(() => {
    const q = this.query().toLowerCase().trim();
    const all = this.users();
    if (!q) return all;
    return all.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.usersApi.listWithFilters({}).subscribe({
      next: (response) => {
        this.users.set(response.data || response.users || []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los usuarios',
        });
        this.loading.set(false);
      },
    });

    this.companiesApi.list({ isActive: true }).subscribe({
      next: (companies) => {
        this.companies.set(
          companies.map((c) => ({
            _id: c._id!,
            name: c.name,
            code: c.code,
          }))
        );
      },
      error: (error) => {
        console.error('Error loading companies:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar las empresas',
        });
      },
    });
  }

  setQuery(value: string): void {
    this.query.set(value);
  }

  editUserTenants(user: UserWithTenants): void {
    console.log('editUserTenants llamado con:', user);
    
    // Verificar si el usuario tiene _id o id
    const userId = user?._id || (user as any)?.id;
    if (!user || !userId) {
      console.error('Intento de editar usuario inválido:', user);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Usuario inválido para editar',
      });
      return;
    }
    
    // Crear una copia del usuario para evitar problemas de referencia
    const userCopy: UserWithTenants = {
      ...user,
      _id: userId,
      tenantIds: user.tenantIds ? [...user.tenantIds] : [],
    };
    
    console.log('Editando usuario (copia):', userCopy);
    this.editingUser.set(userCopy);
    this.selectedTenantIds.set(userCopy.tenantIds || []);
    
    // Asegurar que el diálogo se abra después de establecer el usuario
    setTimeout(() => {
      this.showDialog.set(true);
      console.log('Diálogo abierto, usuario actual:', this.editingUser());
    }, 0);
  }

  onDialogVisibilityChange(visible: boolean): void {
    this.showDialog.set(visible);
    // Solo limpiar cuando se cierra el diálogo completamente
    if (!visible) {
      // Esperar un poco para asegurar que cualquier operación pendiente se complete
      setTimeout(() => {
        // Solo limpiar si el diálogo realmente está cerrado
        if (!this.showDialog()) {
          console.log('Limpiando usuario después de cerrar diálogo');
          this.editingUser.set(null);
          this.selectedTenantIds.set([]);
        }
      }, 200);
    }
  }

  closeDialog(): void {
    console.log('Cerrando diálogo manualmente, usuario actual:', this.editingUser());
    this.showDialog.set(false);
    // Limpiar inmediatamente al cerrar manualmente
    setTimeout(() => {
      this.editingUser.set(null);
      this.selectedTenantIds.set([]);
    }, 100);
  }

  getCompanyName(tenantId: string): string {
    const company = this.companies().find((c) => c._id === tenantId);
    return company?.name || tenantId;
  }

  getCompanyCode(tenantId: string): string | undefined {
    const company = this.companies().find((c) => c._id === tenantId);
    return company?.code;
  }

  saveTenants(event?: Event): void {
    // Prevenir comportamiento por defecto si hay evento
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Capturar el usuario inmediatamente para evitar problemas de timing
    const user = this.editingUser();
    const tenantIds = this.selectedTenantIds();
    
    console.log('saveTenants llamado', { 
      user, 
      userId: user?._id, 
      tenantIds,
      editingUserSignal: this.editingUser() 
    });

    if (!user || !user._id) {
      console.warn('No hay usuario seleccionado para guardar', { 
        user, 
        editingUser: this.editingUser(),
        showDialog: this.showDialog() 
      });
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No hay usuario seleccionado. Por favor, seleccione un usuario nuevamente.',
      });
      return;
    }

    console.log('Guardando tenantIds:', { userId: user._id, tenantIds });

    this.usersApi.update(user._id, { tenantIds }).subscribe({
      next: (updatedUser) => {
        console.log('Usuario actualizado exitosamente:', updatedUser);
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Empresas asignadas correctamente',
        });
        this.closeDialog();
        this.load();
      },
      error: (error) => {
        console.error('Error updating user tenants:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.getErrorMessage(error),
        });
      },
    });
  }

  removeAllTenants(user: UserWithTenants): void {
    if (!user._id) return;

    this.confirmationService.confirm({
      message: `¿Estás seguro de quitar todas las empresas asignadas a "${user.name}"?`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, quitar todas',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.usersApi.update(user._id!, { tenantIds: [] }).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Empresas removidas correctamente',
            });
            this.load();
          },
          error: (error) => {
            console.error('Error removing tenants:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: this.getErrorMessage(error),
            });
          },
        });
      },
    });
  }

  private getErrorMessage(error: any): string {
    if (error.error?.message) {
      return Array.isArray(error.error.message)
        ? error.error.message.join(', ')
        : error.error.message;
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

