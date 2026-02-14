import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CompaniesApiService } from '../../shared/services/companies-api.service';
import { AuthService } from '../../pages/login/services/auth.service';
import { TenantService } from '../../core/services/tenant.service';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';

interface CompanyOption {
  _id: string;
  name: string;
  code?: string;
}

/**
 * Pantalla para seleccionar la Empresa (Tenant) después de login
 * SRP: Solo gestiona selección de empresa y setea el tenant.
 */
@Component({
  selector: 'app-select-company',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    ProgressSpinnerModule,
    TooltipModule,
  ],
  templateUrl: './select-company.html',
  styleUrls: ['./select-company.scss'],
})
export class SelectCompanyPage implements OnInit {
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly tenantService = inject(TenantService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly auth = inject(AuthService);

  loading = signal<boolean>(false);
  companies = signal<CompanyOption[]>([]);
  filtered = signal<CompanyOption[]>([]);
  selectedId = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.companiesApi.list({ isActive: true }).subscribe({
      next: (res: CompanyOption[]) => {
        const opts = (res || []).map((c) => ({ _id: c._id, name: c.name, code: c.code }));
        this.companies.set(opts);
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las empresas',
        });
      },
    });
  }

  applyFilter(): void {
    // Filtrar por acceso del usuario si tiene tenantIds definidos
    const user = this.auth.getCurrentUser();
    if (!user || typeof user !== 'object' || !('tenantIds' in user)) {
      this.filtered.set(this.companies());
      return;
    }
    const tenantIds = (user as { tenantIds?: string[] }).tenantIds;
    const all =
      !tenantIds || tenantIds.length === 0
        ? this.companies()
        : this.companies().filter((c) => tenantIds.includes(c._id));
    this.filtered.set(all);
  }

  selectCompany(company: CompanyOption): void {
    const id = company._id;
    if (!id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'La empresa seleccionada no tiene un ID válido',
      });
      return;
    }
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      this.messageService.add({
        severity: 'error',
        summary: 'ID inválido',
        detail: 'La empresa seleccionada tiene un ID inválido',
      });
      return;
    }
    this.selectedId.set(id);
    this.tenantService.setTenant(id, company.name);
    this.messageService.add({
      severity: 'success',
      summary: 'Empresa seleccionada',
      detail: `Bienvenido a ${company.name}`,
    });
    this.router.navigateByUrl('/dashboard');
  }

  confirm(): void {
    const id = this.selectedId();
    if (!id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Seleccione una empresa',
        detail: 'Debe elegir una empresa para continuar',
      });
      return;
    }
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      this.messageService.add({
        severity: 'error',
        summary: 'ID inválido',
        detail: 'La empresa seleccionada tiene un ID inválido',
      });
      return;
    }
    const company = this.companies().find((c) => c._id === id);
    if (company) {
      this.selectCompany(company);
    }
  }

  logout(): void {
    this.auth.logout();
  }
}
