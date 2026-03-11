import { Component, input, output, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import {
  PurchaseRequirement,
  PurchaseRequirementItem,
  CreatePurchaseRequirementRequest,
} from '../../../../shared/interfaces/purchase.interface';
import { PurchasesRequirementsApiService } from '../../../../shared/services/purchases-requirements-api.service';
import { AreasApiService } from '../../../../shared/services/areas-api.service';
import { ProjectsApiService } from '../../../../shared/services/projects-api.service';
import { UsersApiService } from '../../../../shared/services/users-api.service';
import { AuthService } from '../../../login/services/auth.service';
import { TenantService } from '../../../../core/services/tenant.service';

/**
 * Formulario de requerimiento de compra (crear/editar).
 * SRP: solo presentación y validación del formulario; emite save con el payload.
 */
@Component({
  selector: 'app-purchase-requirement-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    InputNumberModule,
    ButtonModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
  ],
  templateUrl: './purchase-requirement-form.component.html',
})
export class PurchaseRequirementFormComponent implements OnInit {
  private readonly requirementsApi = inject(PurchasesRequirementsApiService);
  private readonly areasApi = inject(AreasApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly authService = inject(AuthService);
  private readonly tenantService = inject(TenantService);

  readonly initial = input<PurchaseRequirement | null>(null);
  readonly saveLabel = input<string>('Guardar');
  readonly cancelLabel = input<string>('Cancelar');

  readonly save = output<CreatePurchaseRequirementRequest>();
  readonly cancelRequest = output<void>();

  areas = signal<{ label: string; value: string }[]>([]);
  projects = signal<{ label: string; value: string }[]>([]);
  users = signal<{ label: string; value: string }[]>([]);

  title = '';
  description = '';
  priority: 'baja' | 'media' | 'alta' | 'urgente' = 'media';
  projectId: string | null = null;
  dueDate: string | null = null;
  items: PurchaseRequirementItem[] = [];
  requestedBy: string | null = null;

  loading = signal(false);

  ngOnInit(): void {
    const init = this.initial();
    if (init) {
      this.title = init.title;
      this.description = init.description ?? '';
      this.priority = init.priority;
      this.projectId =
        typeof init.projectId === 'object'
          ? (init.projectId?._id ?? null)
          : (init.projectId ?? null);
      this.dueDate = init.dueDate ? init.dueDate.slice(0, 10) : null;
      this.items = init.items?.length
        ? init.items.map((i) => ({ ...i }))
        : [{ description: '', quantity: 0, unit: 'UND' }];
      this.requestedBy =
        typeof init.requestedBy === 'object'
          ? ((init.requestedBy as any)._id ?? null)
          : (init.requestedBy ?? null);
    } else {
      this.items = [{ description: '', quantity: 0, unit: 'UND' }];
      this.requestedBy = this.authService.getCurrentUser()?.id ?? null;
    }
    this.loadAreas();
    this.loadProjects();
    this.loadUsers();
  }

  private loadAreas(): void {
    this.areasApi.list().subscribe({
      next: (list) =>
        this.areas.set(
          list.map((a: any) => ({ label: a.name ?? a.nombre ?? a._id, value: a._id })),
        ),
    });
  }

  private loadProjects(): void {
    this.projectsApi.listActive().subscribe({
      next: (list: any[]) =>
        this.projects.set(
          list.map((p) => ({ label: p.name ?? p.code ?? p._id, value: p._id ?? p.id })),
        ),
    });
  }

  private loadUsers(): void {
    const tenantId = this.tenantService.tenantId();
    this.usersApi.listAll(tenantId ?? undefined).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.data ?? []);
        this.users.set(data.map((u: any) => ({ label: u.name ?? u.email, value: u.id ?? u._id })));
      },
    });
  }

  addItem(): void {
    this.items.push({ description: '', quantity: 0, unit: 'UND' });
  }

  removeItem(index: number): void {
    if (this.items.length > 1) this.items.splice(index, 1);
  }

  trackByIndex(i: number): number {
    return i;
  }

  onSubmit(): void {
    if (!this.title.trim()) return;
    const validItems = this.items.filter((i) => i.description.trim() && i.quantity > 0);
    if (validItems.length === 0) return;
    if (!this.requestedBy) return;
    this.save.emit({
      title: this.title.trim(),
      description: this.description.trim() || undefined,
      items: validItems,
      requestedBy: this.requestedBy,
      priority: this.priority,
      projectId: this.projectId ?? undefined,
      dueDate: this.dueDate ?? undefined,
    });
  }

  onCancel(): void {
    this.cancelRequest.emit();
  }
}
