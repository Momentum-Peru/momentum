import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { MessageService, ConfirmationService } from 'primeng/api';

import { ServiceOrderService } from '../services/service-order.service';
import { PlanningApiService } from '../services/planning.service';
import { EmployeesApiService } from '../../../shared/services/employees-api.service';
import { ServiceOrder } from '../interfaces/service-order.interface';
import { ProjectCharter, ProjectRoster } from '../interfaces/planning.interface';
import { MenuService } from '../../../shared/services/menu.service';

type Tab = 'charter' | 'roster';

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    SelectModule,
    TagModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    DatePickerModule,
    CardModule,
    TableModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './planning.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningPage implements OnInit {
  private readonly serviceOrderApi = inject(ServiceOrderService);
  private readonly planningApi = inject(PlanningApiService);
  private readonly employeesApi = inject(EmployeesApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly menuService = inject(MenuService);
  private readonly fb = inject(FormBuilder);

  // State
  serviceOrders = signal<ServiceOrder[]>([]);
  employees = signal<any[]>([]);
  selectedOSId = signal<string>('');
  activeTab = signal<Tab>('charter');
  loading = signal(false);

  // Charter
  charter = signal<ProjectCharter | null>(null);
  charterEditing = signal(false);
  objectives = signal<string[]>(['']);
  constraints = signal<string[]>(['']);
  stakeholders = signal<{ role: string; name: string; responsibility: string }[]>([]);

  charterForm = this.fb.group({
    projectGoal: ['', Validators.required],
    scope: ['', Validators.required],
  });

  // Roster
  roster = signal<ProjectRoster[]>([]);
  showRosterDialog = signal(false);
  rosterForm = this.fb.group({
    employeeId: ['', Validators.required],
    role: ['', Validators.required],
    startDate: [null as Date | null],
    endDate: [null as Date | null],
  });

  // Accordion mobile
  expandedRosterRows = signal<Set<string>>(new Set());

  readonly canEdit = computed(() => this.menuService.canEdit('/operations/planning'));
  readonly selectedOS = computed(() => this.serviceOrders().find(os => os._id === this.selectedOSId()));

  ngOnInit() {
    this.serviceOrderApi.list().subscribe({ next: (data) => this.serviceOrders.set(data) });
    this.employeesApi.list().subscribe({ next: (data) => this.employees.set(data) });
  }

  onSelectOS(id: string) {
    this.selectedOSId.set(id);
    this.charterEditing.set(false);
    this.loadCharter();
    this.loadRoster();
  }

  setTab(tab: Tab) {
    this.activeTab.set(tab);
  }

  // ─── Charter ──────────────────────────────────────────────────────

  loadCharter() {
    const id = this.selectedOSId();
    if (!id) return;
    this.loading.set(true);
    this.planningApi.getCharter(id).subscribe({
      next: (data) => {
        this.charter.set(data);
        if (data) {
          this.charterForm.patchValue({ projectGoal: data.projectGoal, scope: data.scope });
          this.objectives.set(data.objectives?.length ? data.objectives : ['']);
          this.constraints.set(data.constraints?.length ? data.constraints : ['']);
          this.stakeholders.set(data.stakeholders ?? []);
        } else {
          this.charterForm.reset();
          this.objectives.set(['']);
          this.constraints.set(['']);
          this.stakeholders.set([]);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  startEditCharter() {
    this.charterEditing.set(true);
  }

  cancelEditCharter() {
    this.charterEditing.set(false);
    this.loadCharter();
  }

  saveCharter() {
    if (this.charterForm.invalid) return;
    const v = this.charterForm.value;
    const data: Partial<ProjectCharter> = {
      serviceOrderId: this.selectedOSId(),
      projectGoal: v.projectGoal!,
      scope: v.scope!,
      objectives: this.objectives().filter(o => o.trim()),
      constraints: this.constraints().filter(c => c.trim()),
      stakeholders: this.stakeholders().filter(s => s.name.trim()),
    };
    this.planningApi.upsertCharter(data).subscribe({
      next: (saved) => {
        this.charter.set(saved);
        this.charterEditing.set(false);
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Acta de constitución guardada' });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el acta' }),
    });
  }

  // Arrays management
  addObjective() { this.objectives.update(arr => [...arr, '']); }
  removeObjective(i: number) { this.objectives.update(arr => arr.filter((_, idx) => idx !== i)); }
  updateObjective(i: number, value: string) { this.objectives.update(arr => arr.map((v, idx) => idx === i ? value : v)); }

  addConstraint() { this.constraints.update(arr => [...arr, '']); }
  removeConstraint(i: number) { this.constraints.update(arr => arr.filter((_, idx) => idx !== i)); }
  updateConstraint(i: number, value: string) { this.constraints.update(arr => arr.map((v, idx) => idx === i ? value : v)); }

  addStakeholder() { this.stakeholders.update(arr => [...arr, { role: '', name: '', responsibility: '' }]); }
  removeStakeholder(i: number) { this.stakeholders.update(arr => arr.filter((_, idx) => idx !== i)); }
  updateStakeholder(i: number, field: 'role' | 'name' | 'responsibility', value: string) {
    this.stakeholders.update(arr => arr.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  // ─── Roster ───────────────────────────────────────────────────────

  loadRoster() {
    const id = this.selectedOSId();
    if (!id) return;
    this.planningApi.getRoster(id).subscribe({ next: (data) => this.roster.set(data) });
  }

  openRosterDialog() {
    this.rosterForm.reset({ employeeId: '', role: '', startDate: null, endDate: null });
    this.showRosterDialog.set(true);
  }

  saveRosterEntry() {
    if (this.rosterForm.invalid) return;
    const v = this.rosterForm.value;
    const data: Partial<ProjectRoster> = {
      serviceOrderId: this.selectedOSId(),
      employeeId: v.employeeId!,
      role: v.role!,
      startDate: v.startDate ?? undefined,
      endDate: v.endDate ?? undefined,
    };
    this.planningApi.addToRoster(data).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Asignado', detail: 'Personal asignado al roster' });
        this.showRosterDialog.set(false);
        this.loadRoster();
      },
      error: (err) => {
        const detail = err?.error?.message ?? 'No se pudo asignar el personal';
        this.messageService.add({ severity: 'error', summary: 'Error', detail });
      },
    });
  }

  removeRosterEntry(entry: ProjectRoster) {
    const emp = entry.employeeId;
    const name = typeof emp === 'object' ? `${emp.name} ${emp.lastName}` : 'este empleado';
    this.confirmationService.confirm({
      message: `¿Quitar a ${name} del roster?`,
      header: 'Confirmar',
      accept: () => {
        this.planningApi.removeFromRoster(entry._id!).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Quitado', detail: 'Empleado quitado del roster' });
            this.loadRoster();
          },
        });
      },
    });
  }

  getEmployeeName(emp: any): string {
    if (!emp) return '-';
    return typeof emp === 'object' ? `${emp.name ?? ''} ${emp.lastName ?? ''}`.trim() : emp;
  }

  toggleRosterRow(id: string | undefined) {
    if (!id) return;
    this.expandedRosterRows.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  isRosterRowExpanded(id: string | undefined): boolean {
    return !!id && this.expandedRosterRows().has(id);
  }
}
