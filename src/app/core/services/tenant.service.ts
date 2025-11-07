import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from '../../pages/login/services/auth.service';

/**
 * Servicio de Tenant (empresa seleccionada)
 * SRP: Gestiona exclusivamente el estado del tenant seleccionado y su persistencia.
 */
@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly auth = inject(AuthService);
  private readonly storageKey = 'tenantId';
  private readonly storageNameKey = 'tenantName';

  private tenantIdSignal = signal<string | null>(null);
  private tenantNameSignal = signal<string | null>(null);

  tenantId = computed(() => this.tenantIdSignal());
  tenantName = computed(() => this.tenantNameSignal());
  hasTenant = computed(() => !!this.tenantIdSignal());

  loadFromStorage(): void {
    const id = localStorage.getItem(this.storageKey);
    const name = localStorage.getItem(this.storageNameKey);
    if (this.isValidObjectId(id)) {
      this.tenantIdSignal.set(id);
      this.tenantNameSignal.set(name);
    } else {
      // Limpieza si hay un ID inválido guardado previamente
      this.clearTenant();
    }
  }

  setTenant(tenantId: string, tenantName?: string): void {
    if (!this.isValidObjectId(tenantId)) {
      // No persistir IDs inválidos
      return;
    }
    this.tenantIdSignal.set(tenantId);
    if (tenantName) this.tenantNameSignal.set(tenantName);
    localStorage.setItem(this.storageKey, tenantId);
    if (tenantName) localStorage.setItem(this.storageNameKey, tenantName);
  }

  clearTenant(): void {
    this.tenantIdSignal.set(null);
    this.tenantNameSignal.set(null);
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.storageNameKey);
  }

  /** Verifica acceso del usuario al tenant según tenantIds del perfil */
  userHasAccess(tenantId: string | null | undefined): boolean {
    if (!tenantId || !this.isValidObjectId(tenantId)) return false;
    const user = this.auth.getCurrentUser();
    if (!user || typeof user !== 'object' || !('tenantIds' in user)) return false;
    const ids = (user as { tenantIds?: string[] }).tenantIds;
    if (!ids || ids.length === 0) return true; // sin restricción
    return ids.includes(tenantId);
  }

  private isValidObjectId(id: string | null | undefined): boolean {
    if (!id) return false;
    return /^[a-fA-F0-9]{24}$/.test(id);
  }
}


