import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import {
  LogsApiService,
  Log,
  LogQueryParams,
  LogsResponse,
} from '../../shared/services/logs-api.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import { MenuConfigService } from '../../shared/services/menu-config.service';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    DialogModule,
    SelectModule,
    DatePickerModule,
    TooltipModule,
    ToastModule,
    CardModule,
    TagModule,
  ],
  providers: [MessageService],
  templateUrl: './logs.html',
  styleUrls: ['./logs.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogsPage implements OnInit {
  private readonly logsApi = inject(LogsApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly messageService = inject(MessageService);
  private readonly menuConfigService = inject(MenuConfigService);

  // Signals
  logs = signal<Log[]>([]);
  loading = signal<boolean>(false);
  totalRecords = signal<number>(0);
  currentPage = signal<number>(1);
  pageSize = signal<number>(20);
  first = signal<number>(0);

  // Filtros
  moduloFilter = signal<string>('');
  userIdFilter = signal<string>('');
  fechaInicioFilter = signal<Date | null>(null);
  fechaFinFilter = signal<Date | null>(null);

  // Opciones
  users = signal<{ label: string; value: string }[]>([]);
  modulos = signal<{ label: string; value: string }[]>([]);
  expandedRowIds = signal<Record<string, boolean>>({});

  // Diálogo de detalles
  showDetailsDialog = signal<boolean>(false);
  viewingLog = signal<Log | null>(null);

  ngOnInit() {
    this.loadUsers();
    this.loadModulos();
    this.load();
  }

  /**
   * Carga la lista de usuarios para el filtro
   */
  loadUsers() {
    this.usersApi.list().subscribe({
      next: (users) => {
        this.users.set(
          users.map((user) => ({
            label: `${user.name} (${user.email})`,
            value: user._id,
          }))
        );
      },
      error: (error) => {
        console.error('Error loading users:', error);
      },
    });
  }

  /**
   * Carga la lista de módulos disponibles
   */
  loadModulos() {
    const routes = this.menuConfigService.getRoutesConfig();
    const modulosSet = new Set<string>();

    routes.forEach((route) => {
      // Extraer el nombre del módulo de la ruta
      const modulo = route.path.replace('/', '').replace('-', '_');
      if (modulo) {
        modulosSet.add(modulo);
      }
    });

    this.modulos.set(
      Array.from(modulosSet)
        .sort()
        .map((modulo) => ({
          label: modulo.charAt(0).toUpperCase() + modulo.slice(1).replace('_', ' '),
          value: modulo,
        }))
    );
  }

  /**
   * Carga los logs con los filtros actuales
   */
  load() {
    this.loading.set(true);

    const params: LogQueryParams = {
      page: this.currentPage(),
      limit: this.pageSize(),
    };

    if (this.moduloFilter()) {
      params.modulo = this.moduloFilter();
    }

    if (this.userIdFilter()) {
      params.userId = this.userIdFilter();
    }

    if (this.fechaInicioFilter()) {
      params.fechaInicio = this.fechaInicioFilter()!.toISOString();
    }

    if (this.fechaFinFilter()) {
      params.fechaFin = this.fechaFinFilter()!.toISOString();
    }

    this.logsApi.findAll(params).subscribe({
      next: (response: LogsResponse) => {
        this.logs.set(response.logs);
        this.totalRecords.set(response.total);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading logs:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los logs',
        });
        this.loading.set(false);
      },
    });
  }

  /**
   * Maneja el cambio de página
   */
  onPageChange(event: TableLazyLoadEvent) {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.pageSize();
    this.first.set(first);
    this.currentPage.set(Math.floor(first / rows) + 1);
    this.pageSize.set(rows);
    this.load();
  }

  /**
   * Aplica los filtros
   */
  applyFilters() {
    this.currentPage.set(1);
    this.first.set(0);
    this.load();
  }

  /**
   * Limpia los filtros
   */
  clearFilters() {
    this.moduloFilter.set('');
    this.userIdFilter.set('');
    this.fechaInicioFilter.set(null);
    this.fechaFinFilter.set(null);
    this.applyFilters();
  }

  /**
   * Obtiene el nombre del usuario del log
   */
  getUserName(log: Log): string {
    if (typeof log.userId === 'object' && log.userId !== null) {
      return log.userId.name || log.userId.email || 'Usuario desconocido';
    }
    return 'Usuario desconocido';
  }

  /**
   * Obtiene el email del usuario del log
   */
  getUserEmail(log: Log): string {
    if (typeof log.userId === 'object' && log.userId !== null) {
      return log.userId.email || '';
    }
    return '';
  }

  /**
   * Formatea la fecha
   */
  formatDate(date: string | Date): string {
    if (!date) return '-';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  /**
   * Formatea el detalle del log como JSON
   */
  formatDetail(detalle: Record<string, unknown>): string {
    try {
      return JSON.stringify(detalle, null, 2);
    } catch {
      return String(detalle);
    }
  }

  /**
   * Alterna la expansión de una fila (para vista móvil)
   */
  toggleRow(id: string) {
    const expanded = { ...this.expandedRowIds() };
    expanded[id] = !expanded[id];
    this.expandedRowIds.set(expanded);
  }

  /**
   * Verifica si una fila está expandida (para vista móvil)
   */
  isRowExpanded(id: string): boolean {
    return !!this.expandedRowIds()[id];
  }

  /**
   * Abre el diálogo de detalles del log
   */
  viewDetails(log: Log) {
    this.viewingLog.set(log);
    this.showDetailsDialog.set(true);
  }

  /**
   * Cierra el diálogo de detalles
   */
  closeDetailsDialog() {
    this.showDetailsDialog.set(false);
    this.viewingLog.set(null);
  }

  /**
   * Calcula el total de páginas
   */
  getTotalPages(): number {
    return Math.ceil(this.totalRecords() / this.pageSize());
  }

  /**
   * Va a la página anterior
   */
  goToPreviousPage() {
    if (this.currentPage() > 1) {
      const newPage = this.currentPage() - 1;
      this.currentPage.set(newPage);
      this.first.set((newPage - 1) * this.pageSize());
      this.load();
    }
  }

  /**
   * Va a la página siguiente
   */
  goToNextPage() {
    const totalPages = this.getTotalPages();
    if (this.currentPage() < totalPages) {
      const newPage = this.currentPage() + 1;
      this.currentPage.set(newPage);
      this.first.set((newPage - 1) * this.pageSize());
      this.load();
    }
  }
}
