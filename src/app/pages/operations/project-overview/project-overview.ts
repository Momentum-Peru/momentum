import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';

import { ProjectsApiService } from '../../../shared/services/projects-api.service';
import { ServiceOrderService } from '../services/service-order.service';
import { PlanningApiService } from '../services/planning.service';
import { Project } from '../../../shared/interfaces/project.interface';
import { ServiceOrder } from '../interfaces/service-order.interface';
import { TechnicalFile, ProjectCharter, ProjectRoster, SafetyDocument } from '../interfaces/planning.interface';

type DetailTab = 'overview' | 'orders' | 'files' | 'planning' | 'safety';

@Component({
  selector: 'app-project-overview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ToastModule,
    SelectModule,
    InputTextModule,
  ],
  providers: [MessageService],
  templateUrl: './project-overview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectOverviewPage implements OnInit {
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly serviceOrderApi = inject(ServiceOrderService);
  private readonly planningApi = inject(PlanningApiService);
  private readonly messageService = inject(MessageService);

  // ─── State ────────────────────────────────────────────────────────
  projects       = signal<Project[]>([]);
  query          = signal('');
  statusFilter   = signal('');
  loading        = signal(false);
  loadingDetail  = signal(false);

  selectedProject = signal<Project | null>(null);
  activeTab       = signal<DetailTab>('overview');

  // ─── Per-project data ─────────────────────────────────────────────
  projectOS      = signal<ServiceOrder[]>([]);
  loadedTabs     = signal<Set<DetailTab>>(new Set());

  filesByOS      = signal<Record<string, TechnicalFile[]>>({});
  charterByOS    = signal<Record<string, ProjectCharter | null>>({});
  rosterByOS     = signal<Record<string, ProjectRoster[]>>({});
  safetyByOS     = signal<Record<string, SafetyDocument[]>>({});

  // ─── OS accordion ─────────────────────────────────────────────────
  expandedOS = signal<Set<string>>(new Set());

  // ─── Computed ─────────────────────────────────────────────────────
  readonly filteredProjects = computed(() => {
    let list = this.projects();
    const q = this.query().toLowerCase();
    const s = this.statusFilter();
    if (q) list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      (typeof p.clientId === 'object' ? p.clientId.name : '').toLowerCase().includes(q)
    );
    if (s) list = list.filter(p => p.status === s);
    return list;
  });

  readonly osByStatus = computed(() => {
    const all = this.projectOS();
    return {
      total: all.length,
      pendiente: all.filter(o => o.status === 'PENDIENTE').length,
      enProceso: all.filter(o => o.status === 'EN_PROCESO').length,
      completado: all.filter(o => o.status === 'COMPLETADO').length,
    };
  });

  readonly totalFiles = computed(() =>
    Object.values(this.filesByOS()).reduce((sum, arr) => sum + arr.length, 0)
  );

  readonly totalSafetyDocs = computed(() =>
    Object.values(this.safetyByOS()).reduce((sum, arr) => sum + arr.length, 0)
  );

  readonly approvedSafetyDocs = computed(() =>
    Object.values(this.safetyByOS()).reduce(
      (sum, arr) => sum + arr.filter(d => d.status === 'APROBADO').length, 0
    )
  );

  statusOptions = [
    { label: 'Todos los estados', value: '' },
    { label: 'Pendiente',        value: 'PENDIENTE' },
    { label: 'En Cotización',    value: 'EN_COTIZACION' },
    { label: 'Aprobado',         value: 'APROBADO' },
    { label: 'En Ejecución',     value: 'EN_EJECUCION' },
    { label: 'En Observación',   value: 'EN_OBSERVACION' },
    { label: 'Terminado',        value: 'TERMINADO' },
    { label: 'Cancelado',        value: 'CANCELADO' },
  ];

  // ─── Lifecycle ────────────────────────────────────────────────────
  ngOnInit() {
    this.loading.set(true);
    this.projectsApi.list().subscribe({
      next: (data) => { this.projects.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  // ─── Project selection ────────────────────────────────────────────
  selectProject(project: Project) {
    this.selectedProject.set(project);
    this.activeTab.set('overview');
    this.loadedTabs.set(new Set());
    this.projectOS.set([]);
    this.filesByOS.set({});
    this.charterByOS.set({});
    this.rosterByOS.set({});
    this.safetyByOS.set({});
    this.expandedOS.set(new Set());
    this.loadProjectOS(project._id!);
  }

  goBack() {
    this.selectedProject.set(null);
    this.projectOS.set([]);
  }

  loadProjectOS(projectId: string) {
    this.loadingDetail.set(true);
    this.serviceOrderApi.list({ projectId }).subscribe({
      next: (data) => {
        this.projectOS.set(data);
        this.loadingDetail.set(false);
      },
      error: () => this.loadingDetail.set(false),
    });
  }

  // ─── Tab navigation ───────────────────────────────────────────────
  setTab(tab: DetailTab) {
    this.activeTab.set(tab);
    if (!this.loadedTabs().has(tab)) {
      this.loadTabData(tab);
    }
  }

  loadTabData(tab: DetailTab) {
    const osIds = this.projectOS().map(os => os._id!).filter(Boolean);
    if (osIds.length === 0) { this.loadedTabs.update(s => new Set([...s, tab])); return; }

    this.loadingDetail.set(true);

    const mark = () => {
      this.loadedTabs.update(s => new Set([...s, tab]));
      this.loadingDetail.set(false);
    };

    if (tab === 'files') {
      forkJoin(osIds.map(id =>
        this.planningApi.getTechnicalFiles(id).pipe(catchError(() => of([] as TechnicalFile[])))
      )).subscribe(results => {
        const map: Record<string, TechnicalFile[]> = {};
        osIds.forEach((id, i) => map[id] = results[i]);
        this.filesByOS.set(map);
        mark();
      });

    } else if (tab === 'planning') {
      forkJoin([
        forkJoin(osIds.map(id => this.planningApi.getCharter(id).pipe(catchError(() => of(null))))),
        forkJoin(osIds.map(id => this.planningApi.getRoster(id).pipe(catchError(() => of([] as ProjectRoster[]))))),
      ]).subscribe(([charters, rosters]) => {
        const cm: Record<string, ProjectCharter | null> = {};
        const rm: Record<string, ProjectRoster[]> = {};
        osIds.forEach((id, i) => { cm[id] = charters[i]; rm[id] = rosters[i]; });
        this.charterByOS.set(cm);
        this.rosterByOS.set(rm);
        mark();
      });

    } else if (tab === 'safety') {
      forkJoin(osIds.map(id =>
        this.planningApi.getSafetyDocs(id).pipe(catchError(() => of([] as SafetyDocument[])))
      )).subscribe(results => {
        const map: Record<string, SafetyDocument[]> = {};
        osIds.forEach((id, i) => map[id] = results[i]);
        this.safetyByOS.set(map);
        mark();
      });

    } else {
      mark();
    }
  }

  // ─── OS accordion ─────────────────────────────────────────────────
  toggleOS(id: string | undefined) {
    if (!id) return;
    this.expandedOS.update(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  isOSExpanded(id: string | undefined): boolean {
    return !!id && this.expandedOS().has(id);
  }

  // ─── Helpers ──────────────────────────────────────────────────────
  getClientName(project: Project): string {
    if (!project.clientId) return '-';
    return typeof project.clientId === 'object' ? project.clientId.name : project.clientId;
  }

  getProjectStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDIENTE: 'Pendiente', EN_COTIZACION: 'En Cotización', APROBADO: 'Aprobado',
      EN_EJECUCION: 'En Ejecución', EN_OBSERVACION: 'En Observación',
      TERMINADO: 'Terminado', CANCELADO: 'Cancelado',
    };
    return map[status] ?? status;
  }

  getProjectStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case 'EN_EJECUCION': return 'success';
      case 'APROBADO':     return 'info';
      case 'EN_COTIZACION': return 'contrast';
      case 'EN_OBSERVACION': return 'warn';
      case 'TERMINADO':    return 'secondary';
      case 'CANCELADO':    return 'danger';
      default:             return 'secondary';
    }
  }

  getProjectAccentClass(status: string): string {
    switch (status) {
      case 'EN_EJECUCION':  return 'border-green-500';
      case 'APROBADO':      return 'border-blue-500';
      case 'EN_COTIZACION': return 'border-indigo-400';
      case 'EN_OBSERVACION': return 'border-amber-500';
      case 'TERMINADO':     return 'border-teal-500';
      case 'CANCELADO':     return 'border-red-500';
      default:              return 'border-gray-400';
    }
  }

  getProjectGradient(status: string): string {
    switch (status) {
      case 'EN_EJECUCION':  return 'from-green-700 to-green-900';
      case 'APROBADO':      return 'from-blue-700 to-blue-900';
      case 'EN_COTIZACION': return 'from-indigo-600 to-indigo-900';
      case 'EN_OBSERVACION': return 'from-amber-600 to-amber-900';
      case 'TERMINADO':     return 'from-teal-700 to-teal-900';
      case 'CANCELADO':     return 'from-red-700 to-red-900';
      default:              return 'from-gray-600 to-gray-900';
    }
  }

  getOSStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDIENTE: 'Pendiente', EN_PROCESO: 'En Proceso',
      COMPLETADO: 'Completado', CANCELADO: 'Cancelado',
    };
    return map[status] ?? status;
  }

  getOSStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'PENDIENTE':   return 'warn';
      case 'EN_PROCESO':  return 'info';
      case 'COMPLETADO':  return 'success';
      case 'CANCELADO':   return 'danger';
      default:            return 'secondary';
    }
  }

  getFileTypeLabel(type: string): string {
    const map: Record<string, string> = { PLANO: 'Plano', CRONOGRAMA: 'Cronograma', PRESUPUESTO: 'Presupuesto', OTRO: 'Otro' };
    return map[type] ?? type;
  }

  getFileTypeIcon(type: string): string {
    switch (type) {
      case 'PLANO':       return 'pi pi-map';
      case 'CRONOGRAMA':  return 'pi pi-calendar';
      case 'PRESUPUESTO': return 'pi pi-dollar';
      default:            return 'pi pi-file';
    }
  }

  getSafetyStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDIENTE: 'Pendiente', EN_REVISION: 'En Revisión',
      APROBADO: 'Aprobado', RECHAZADO: 'Rechazado',
    };
    return map[status] ?? status;
  }

  getSafetyStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'APROBADO':    return 'success';
      case 'EN_REVISION': return 'info';
      case 'RECHAZADO':   return 'danger';
      default:            return 'secondary';
    }
  }

  getEmployeeName(emp: any): string {
    if (!emp) return '-';
    return typeof emp === 'object' ? `${emp.name ?? ''} ${emp.lastName ?? ''}`.trim() : emp;
  }

  osHasFiles(osId: string): boolean {
    return (this.filesByOS()[osId]?.length ?? 0) > 0;
  }

  osHasRoster(osId: string): boolean {
    return (this.rosterByOS()[osId]?.length ?? 0) > 0;
  }

  osHasSafety(osId: string): boolean {
    return (this.safetyByOS()[osId]?.length ?? 0) > 0;
  }
}
