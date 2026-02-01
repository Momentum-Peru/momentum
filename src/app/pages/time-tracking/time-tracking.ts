import {
  Component,
  OnInit,
  signal,
  inject,
  effect,
  computed,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TimeTrackingApiService } from '../../shared/services/time-tracking-api.service';
import { ProjectsApiService } from '../../shared/services/projects-api.service';
import { FaceRecognitionApiService } from '../../shared/services/face-recognition-api.service';
import { GeocodingService } from '../../shared/services/geocoding.service';
import { UsersApiService } from '../../shared/services/users-api.service';
import { AuthService } from '../login/services/auth.service';
import { TenantService } from '../../core/services/tenant.service';
import {
  TimeTracking,
  TimeTrackingType,
  Location,
  CreateTimeTrackingRequest,
  UpdateTimeTrackingRequest,
  TimeTrackingQueryParams,
} from '../../shared/interfaces/time-tracking.interface';
import { AttendanceRecord } from '../../shared/interfaces/face-recognition.interface';
import {
  FaceDetectionService,
  FaceDetectionResult,
} from '../../shared/services/face-detection.service';
import { ProjectOption, Project } from '../../shared/interfaces/project.interface';
import {
  TimeTrackingPdfService,
  TimeTrackingReportData,
  TimeTrackingReportUser,
  TimeTrackingReportMark,
} from '../../shared/services/time-tracking-pdf.service';
import JSZip from 'jszip';

/** Cargos en duro por nombre completo (Nombre Apellido) normalizado a minúsculas. */
const CARGO_POR_NOMBRE: Record<string, string> = {
  'petter marcel torres angulo': 'OPERARIO',
  'jordan polosefer mendoza anton': 'SSOMA',
  'jose luis tello ostos': 'CHOFER-ALMACENERO',
  'elder jasinto lucas andrade': 'OFICIAL MONTAJISTA',
  'hugo benigno casimiro huaman': 'INGENIERO RESIDENTE',
  'yerlin torres estela': 'OFICIAL MONTAJISTA',
  'aldo torres estela': 'AYUDANTE',
  'rosa chipana llacchua': 'LOGISTICA',
  'david angel cueva rosales': 'ARQUITECTO',
  'beltran torres estela': 'JEFE DE PRODUCCION',
  'nilda nicole nolasco chipana': 'ASIST. ADMINISTRATIVO',
  'sergio nolasco estela': 'GERENTE GENERAL',
};

/**
 * Componente de Marcación de Hora
 * Principio de Responsabilidad Única: Gestiona la UI y estado de los registros de tiempo
 */
@Component({
  selector: 'app-time-tracking',
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
    TextareaModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  templateUrl: './time-tracking.html',
  styleUrl: './time-tracking.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService, ConfirmationService],
})
export class TimeTrackingPage implements OnInit {
  private readonly timeTrackingApi = inject(TimeTrackingApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly faceRecognitionApi = inject(FaceRecognitionApiService);
  private readonly faceDetection = inject(FaceDetectionService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly usersApi = inject(UsersApiService);
  private readonly authService = inject(AuthService);
  private readonly tenantService = inject(TenantService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly timeTrackingPdfService = inject(TimeTrackingPdfService);

  items = signal<TimeTracking[]>([]);
  projects = signal<ProjectOption[]>([]);
  users = signal<{ _id: string; name: string; email: string }[]>([]);
  query = signal('');
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);
  /** Filtro de usuario para gerencia/admin: null = todos */
  filterUserId = signal<string | null>(null);
  showDialog = signal(false);
  showViewDialog = signal(false);
  showFaceDialog = signal(false);
  showAddMarkDialog = signal(false);
  editing = signal<TimeTracking | null>(null);
  viewing = signal<TimeTracking | null>(null);
  private expandedRowKeys = signal<Set<string>>(new Set());
  /** Usuarios con detalle expandido (gerencia) */
  expandedUserDetail = signal<Set<string>>(new Set());
  /** Descargando PDFs por usuario (evita múltiples clics) */
  downloadingAllPdfs = signal(false);

  currentUser = toSignal(this.authService.currentUser$, {
    initialValue: this.authService.getCurrentUser(),
  });

  /** Solo administración puede editar o eliminar marcaciones */
  canEditOrDelete = computed(() => this.authService.isAdmin());

  /** Gerencia y admin pueden ver marcaciones de todos los usuarios */
  canViewAllUsers = computed(() => this.authService.isAdminOrGerencia());

  /** Solo admin puede agregar marcación para otros usuarios */
  canAddForOthers = computed(() => this.authService.isAdmin());

  // Estado para marcación con reconocimiento facial
  faceImage = signal<File | null>(null);
  faceImagePreview = signal<string | null>(null);
  isMarkingAttendance = signal(false);
  markingType = signal<TimeTrackingType>('INGRESO');
  currentLocation = signal<Location | null>(null);
  locationError = signal<string | null>(null);
  modelsLoading = signal(false);
  modelsLoaded = signal(false);

  // Cámara y detección en tiempo real
  @ViewChild('cameraVideo', { static: false }) cameraVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('detectionCanvas', { static: false })
  detectionCanvasRef?: ElementRef<HTMLCanvasElement>;
  cameraStream = signal<MediaStream | null>(null);
  isCameraActive = signal(false);
  isVideoReady = signal(false);
  faceDetectionResult = signal<FaceDetectionResult | null>(null);
  isDetecting = signal(false);
  private detectionInterval?: ReturnType<typeof setInterval>;
  private autoCaptureTriggered = signal(false);
  private isDetectionInProgress = false;

  /** Lista base aplicando filtro de usuario (gerencia) */
  private itemsFilteredByUser = computed(() => {
    const list = this.items();
    if (!this.canViewAllUsers()) return list;
    const uid = this.filterUserId();
    if (!uid) return list;
    return list.filter((item) => this.getUserId(item) === uid);
  });

  filteredItems = computed(() => {
    const searchQuery = this.query().toLowerCase().trim();
    const list = this.itemsFilteredByUser()
      .slice()
      .sort((a, b) => {
        const aDt = new Date(a.date).getTime();
        const bDt = new Date(b.date).getTime();
        return bDt - aDt;
      });
    if (!searchQuery) return list;
    return list.filter((item) => {
      const dateMatch = item.date?.toLowerCase().includes(searchQuery) ?? false;
      const typeMatch = item.type?.toLowerCase().includes(searchQuery) ?? false;
      const userMatch =
        this.getUserName(item)?.toLowerCase().includes(searchQuery) ?? false;
      return dateMatch || typeMatch || userMatch;
    });
  });

  /** Opciones para el selector de usuario (gerencia): orden alfabético por nombre, sin correo. */
  userFilterOptions = computed(() => {
    const list = [...this.users()].sort((a, b) =>
      (a.name ?? '').localeCompare(b.name ?? '', 'es')
    );
    const options: { label: string; value: string | null }[] = [
      { label: 'Todos los usuarios', value: null },
    ];
    list.forEach((u) => {
      options.push({ label: u.name ?? '', value: u._id });
    });
    return options;
  });

  /**
   * Indica si una marcación de INGRESO es tardanza (después de las 8:00 AM en hora local).
   */
  isTardanza(dateIso: string | undefined): boolean {
    if (!dateIso) return false;
    try {
      const d = new Date(dateIso);
      if (isNaN(d.getTime())) return false;
      const minutesSinceMidnight = d.getHours() * 60 + d.getMinutes();
      return minutesSinceMidnight > 8 * 60; // después de 8:00 AM
    } catch {
      return false;
    }
  }

  /**
   * Resumen para dashboard.
   * - total: total de marcaciones (INGRESO + SALIDA).
   * - totalIngresos: cantidad de registros tipo INGRESO.
   * - totalTardanzas: ingresos después de las 8:00 AM.
   * - diasConAsistencia: días distintos con al menos un INGRESO (para cálculo de faltas).
   * - faltas: días del rango sin ningún INGRESO.
   */
  dashboardStats = computed(() => {
    const list = this.itemsFilteredByUser();
    const start = this.startDate();
    const end = this.endDate();
    const total = list.length;
    const totalIngresos = list.filter((item) => item.type === 'INGRESO').length;
    const totalTardanzas = list.filter(
      (item) => item.type === 'INGRESO' && this.isTardanza(item.date)
    ).length;
    const diasConIngreso = new Set<string>();
    const userIds = new Set<string>();
    list.forEach((item) => {
      if (item.type === 'INGRESO' && item.date) {
        diasConIngreso.add(item.date.slice(0, 10));
      }
      const uid = typeof item.userId === 'string' ? item.userId : item.userId?._id;
      if (uid) userIds.add(uid);
    });
    const diasConAsistencia = diasConIngreso.size;
    let diasEnRango = 0;
    if (start && end) {
      const s = new Date(start + 'T00:00:00');
      const e = new Date(end + 'T00:00:00');
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
        diasEnRango = Math.floor((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      }
    }
    const faltas = Math.max(0, diasEnRango - diasConAsistencia);
    return {
      total,
      totalIngresos,
      totalTardanzas,
      diasConAsistencia,
      faltas,
      diasEnRango,
      usuariosConMarcacion: userIds.size,
    };
  });

  /** Marcaciones agrupadas por día (clave YYYY-MM-DD) para vista por días */
  itemsByDay = computed(() => {
    const list = this.filteredItems();
    const map = new Map<string, TimeTracking[]>();
    list.forEach((item) => {
      const key = item.date ? item.date.slice(0, 10) : '';
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    map.forEach((arr) => arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    const entries = Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    return entries.map(([date, items]) => ({ date, items }));
  });

  /** Resumen por usuario para gerencia: asistencias, faltas, detalle por día */
  summaryByUser = computed(() => {
    const list = this.itemsFilteredByUser();
    const start = this.startDate();
    const end = this.endDate();
    const filterUid = this.filterUserId();
    const usersList = this.users();
    let diasEnRango = 0;
    if (start && end) {
      const s = new Date(start + 'T00:00:00');
      const e = new Date(end + 'T00:00:00');
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
        diasEnRango = Math.floor((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      }
    }
    const byUser = new Map<
      string,
      { userName: string; asistencias: Set<string>; items: TimeTracking[] }
    >();
    list.forEach((item) => {
      const uid = this.getUserId(item);
      if (!uid) return;
      const name = this.getUserName(item);
      if (!byUser.has(uid)) {
        byUser.set(uid, { userName: name, asistencias: new Set(), items: [] });
      }
      const row = byUser.get(uid)!;
      row.items.push(item);
      if (item.type === 'INGRESO' && item.date) {
        row.asistencias.add(item.date.slice(0, 10));
      }
    });
    if (filterUid && !byUser.has(filterUid)) {
      const u = usersList.find((x) => x._id === filterUid);
      if (u) {
        byUser.set(filterUid, {
          userName: u.name,
          asistencias: new Set(),
          items: [],
        });
      }
    }
    const result: {
      userId: string;
      userName: string;
      cargo: string;
      totalMarcaciones: number;
      asistencias: number;
      faltas: number;
      tardanzas: number;
      items: TimeTracking[];
      itemsByDay: { date: string; items: TimeTracking[] }[];
    }[] = [];
    byUser.forEach((row, userId) => {
      const items = row.items.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const asistencias = row.asistencias.size;
      const faltas = Math.max(0, diasEnRango - asistencias);
      const tardanzas = items.filter(
        (item) => item.type === 'INGRESO' && this.isTardanza(item.date)
      ).length;
      const dayMap = new Map<string, TimeTracking[]>();
      items.forEach((item) => {
        const key = item.date ? item.date.slice(0, 10) : '';
        if (!key) return;
        if (!dayMap.has(key)) dayMap.set(key, []);
        dayMap.get(key)!.push(item);
      });
      dayMap.forEach((arr) =>
        arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      );
      const itemsByDay = Array.from(dayMap.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([date, dayItems]) => ({ date, items: dayItems }));
      const cargo = CARGO_POR_NOMBRE[this.normalizeName(row.userName)] ?? '';
      result.push({
        userId,
        userName: row.userName,
        cargo,
        totalMarcaciones: items.length,
        asistencias,
        faltas,
        tardanzas,
        items,
        itemsByDay,
      });
    });
    result.sort((a, b) => a.userName.localeCompare(b.userName));
    return result;
  });

  ngOnInit() {
    this.setDefaultDateRange();
    this.load();
    this.loadProjects();
    if (this.canViewAllUsers() || this.canAddForOthers()) {
      this.loadUsers();
    }
  }

  private setDefaultDateRange() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    this.startDate.set(this.formatDateYMD(start));
    this.endDate.set(this.formatDateYMD(end));
  }

  private formatDateYMD(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  constructor() {
    // Efecto para manejar el cierre del diálogo
    effect(() => {
      if (!this.showDialog()) {
        this.editing.set(null);
      }
      if (!this.showViewDialog()) this.viewing.set(null);
      if (!this.showFaceDialog()) {
        this.faceImage.set(null);
        this.faceImagePreview.set(null);
        this.markingType.set('INGRESO');
        this.currentLocation.set(null);
        this.locationError.set(null);
        this.stopCamera();
        this.isVideoReady.set(false);
        this.stopDetection();
        this.autoCaptureTriggered.set(false);
        this.modelsLoaded.set(false);
        this.modelsLoading.set(false);
      }
    });

    // Efecto para auto-capturar y enviar cuando el rostro sea válido
    effect(() => {
      const result = this.faceDetectionResult();
      const isValid = result?.isValid ?? false;
      const alreadyTriggered = this.autoCaptureTriggered();
      const isMarking = this.isMarkingAttendance();

      // Solo auto-capturar si:
      // - El rostro es válido
      // - No se ha disparado ya
      // - No se está marcando actualmente
      // - El video está listo
      if (isValid && !alreadyTriggered && !isMarking && this.isVideoReady()) {
        this.autoCaptureTriggered.set(true);
        // Pequeño delay para asegurar estabilidad
        setTimeout(() => {
          this.autoCaptureAndMark();
        }, 500);
      }
    });
  }

  load() {
    const currentUser = this.currentUser();
    const filters: TimeTrackingQueryParams = {};
    if (this.canViewAllUsers()) {
      // Gerencia y admin: cargar todos los usuarios del tenant seleccionado
      const tenantId = this.tenantService.tenantId();
      if (tenantId) filters.tenantId = tenantId;
    } else {
      if (!currentUser?.id) {
        this.items.set([]);
        return;
      }
      filters.userId = currentUser.id;
      const tenantId = this.tenantService.tenantId();
      if (tenantId) filters.tenantId = tenantId;
    }
    const start = this.startDate();
    const end = this.endDate();
    if (start) filters.startDate = start;
    if (end) filters.endDate = end;

    this.timeTrackingApi.list(filters).subscribe({
      next: (data) => this.items.set(data),
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los registros de tiempo',
        });
      },
    });
  }

  /** Opciones para selector de período por mes (desde Enero 2026 hasta el mes actual). */
  monthPeriodOptions = computed(() => {
    const options: { label: string; value: string }[] = [];
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const startYear = 2026;
    const startMonth = 0; // Enero
    const now = new Date();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth();
    for (let y = startYear; y <= endYear; y++) {
      const mStart = y === startYear ? startMonth : 0;
      const mEnd = y === endYear ? endMonth : 11;
      for (let m = mStart; m <= mEnd; m++) {
        const value = `${y}-${(m + 1).toString().padStart(2, '0')}`;
        options.push({ label: `Período ${monthNames[m]} ${y}`, value });
      }
    }
    return options;
  });

  /** Devuelve "YYYY-MM" si el rango actual es un mes completo; si no, null. */
  getSelectedMonthPeriod(): string | null {
    const start = this.startDate();
    const end = this.endDate();
    if (!start || !end || start.length < 7 || end.length < 7) return null;
    const [sy, sm] = [start.slice(0, 4), start.slice(5, 7)];
    if (start !== `${sy}-${sm}-01`) return null;
    const lastDay = new Date(parseInt(sy, 10), parseInt(sm, 10), 0);
    const lastStr = this.formatDateYMD(lastDay);
    return end === lastStr ? `${sy}-${sm}` : null;
  }

  /** Aplica el rango del mes seleccionado (valor "YYYY-MM") y recarga. */
  onMonthPeriodChange(value: string | null): void {
    if (!value || value.length < 7) return;
    const [y, m] = [value.slice(0, 4), value.slice(5, 7)];
    const year = parseInt(y, 10);
    const month = parseInt(m, 10);
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    this.startDate.set(this.formatDateYMD(first));
    this.endDate.set(this.formatDateYMD(last));
    this.load();
  }

  onStartDateChange(value: Date | null) {
    this.startDate.set(value ? this.formatDateYMD(value) : null);
    this.load();
  }

  onEndDateChange(value: Date | null) {
    this.endDate.set(value ? this.formatDateYMD(value) : null);
    this.load();
  }

  getStartDateValue = computed(() => this.dateStringToDate(this.startDate()));
  getEndDateValue = computed(() => this.dateStringToDate(this.endDate()));

  private dateStringToDate(s: string | null): Date | null {
    if (!s) return null;
    try {
      const [y, m, d] = s.split('-').map((x) => parseInt(x, 10));
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    } catch {
      return null;
    }
  }

  /** Normaliza el nombre para búsqueda en CARGO_POR_NOMBRE (minúsculas, sin espacios extra). */
  private normalizeName(name: string): string {
    return (name ?? '').trim().toLowerCase();
  }

  /** Carga todos los usuarios del tenant (todas las páginas) para el filtro de gerencia. */
  loadUsers() {
    const tenantId = this.tenantService.tenantId();
    this.usersApi.listAll(tenantId ?? undefined).subscribe({
      next: (data) => this.users.set(data),
      error: () => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Usuarios',
          detail: 'No se pudo cargar la lista de usuarios para el filtro',
        });
      },
    });
  }

  getUserId(item: TimeTracking): string | null {
    const u = item.userId;
    if (!u) return null;
    if (typeof u === 'string') return u;
    if (typeof u === 'object' && '_id' in u) return u._id;
    return null;
  }

  getUserName(item: TimeTracking): string {
    const u = item.userId;
    if (!u) return '-';
    if (typeof u === 'object' && 'name' in u) return u.name ?? u.email ?? '-';
    return '-';
  }

  isUserDetailExpanded(userId: string): boolean {
    return this.expandedUserDetail().has(userId);
  }

  toggleUserDetail(userId: string): void {
    const set = new Set(this.expandedUserDetail());
    if (set.has(userId)) set.delete(userId);
    else set.add(userId);
    this.expandedUserDetail.set(set);
  }

  onFilterUserChange(value: string | null): void {
    this.filterUserId.set(value ?? null);
  }

  getFilterUserValue = computed(() => this.filterUserId());

  /** Formatea la hora desde ISO (HH:mm). */
  private formatTime(dateIso: string | undefined): string {
    if (!dateIso) return '-';
    try {
      const d = new Date(dateIso);
      if (isNaN(d.getTime())) return '-';
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    } catch {
      return '-';
    }
  }

  /** Genera y descarga el PDF de reporte de marcaciones para gerencia. */
  downloadPdfReport(): void {
    if (!this.canViewAllUsers()) return;
    const start = this.startDate();
    const end = this.endDate();
    if (!start || !end) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Rango requerido',
        detail: 'Seleccione rango de fechas antes de descargar el PDF',
      });
      return;
    }
    const stats = this.dashboardStats();
    const summary = this.summaryByUser();
    const reportUsers: TimeTrackingReportUser[] = summary.map((u) => ({
      userName: u.userName,
      asistencias: u.asistencias,
      tardanzas: u.tardanzas,
      faltas: u.faltas,
      itemsByDay: u.itemsByDay.map((day) => ({
        date: day.date,
        items: day.items.map(
          (item): TimeTrackingReportMark => ({
            fecha: day.date,
            hora: this.formatTime(item.date),
            tipo: item.type ?? '-',
            tardanza: item.type === 'INGRESO' && this.isTardanza(item.date),
            ubicacion: this.formatLocation(item) || '-',
          })
        ),
      })),
    }));
    const data: TimeTrackingReportData = {
      startDate: start,
      endDate: end,
      kpis: {
        asistencias: stats.diasConAsistencia,
        totalTardanzas: stats.totalTardanzas,
        faltas: stats.faltas,
      },
      users: reportUsers,
    };
    void this.downloadPdfReportAsync(data, start, end);
  }

  /** Genera un PDF por usuario y los descarga en un único ZIP. */
  async downloadAllPdfsByUser(): Promise<void> {
    if (!this.canViewAllUsers()) return;
    const start = this.startDate();
    const end = this.endDate();
    if (!start || !end) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Rango requerido',
        detail: 'Seleccione rango de fechas antes de descargar el ZIP',
      });
      return;
    }
    const summary = this.summaryByUser();
    if (summary.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin usuarios',
        detail: 'No hay usuarios con datos en el período seleccionado',
      });
      return;
    }
    this.downloadingAllPdfs.set(true);
    try {
      const zip = new JSZip();
      for (const u of summary) {
        const reportUser: TimeTrackingReportUser = {
          userName: u.userName,
          asistencias: u.asistencias,
          tardanzas: u.tardanzas,
          faltas: u.faltas,
          itemsByDay: u.itemsByDay.map((day) => ({
            date: day.date,
            items: day.items.map(
              (item): TimeTrackingReportMark => ({
                fecha: day.date,
                hora: this.formatTime(item.date),
                tipo: item.type ?? '-',
                tardanza: item.type === 'INGRESO' && this.isTardanza(item.date),
                ubicacion: this.formatLocation(item) || '-',
              })
            ),
          })),
        };
        const data: TimeTrackingReportData = {
          startDate: start,
          endDate: end,
          kpis: {
            asistencias: u.asistencias,
            totalTardanzas: u.tardanzas,
            faltas: u.faltas,
          },
          users: [reportUser],
        };
        const blob = await this.timeTrackingPdfService.generateReport(data);
        const nombreArchivo = this.sanitizeFileName(u.userName);
        zip.file(`reporte-asistencias_${start}_${end}_${nombreArchivo}.pdf`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reportes-asistencias_${start}_${end}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      this.messageService.add({
        severity: 'success',
        summary: 'ZIP descargado',
        detail: `Se descargó el ZIP con ${summary.length} reporte(s) de asistencias`,
      });
    } catch (err) {
      console.error(err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo generar el ZIP',
      });
    } finally {
      this.downloadingAllPdfs.set(false);
    }
  }

  /** Sanitiza el nombre para usarlo en el nombre del archivo (sin espacios ni caracteres problemáticos). */
  private sanitizeFileName(name: string): string {
    return (name ?? '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-_]/g, '')
      .slice(0, 50) || 'usuario';
  }

  private async downloadPdfReportAsync(
    data: TimeTrackingReportData,
    start: string,
    end: string
  ): Promise<void> {
    try {
      const blob = await this.timeTrackingPdfService.generateReport(data);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-asistencias_${start}_${end}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      this.messageService.add({
        severity: 'success',
        summary: 'PDF descargado',
        detail: 'El reporte de marcaciones se ha descargado correctamente',
      });
    } catch (err) {
      console.error(err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo generar el PDF',
      });
    }
  }

  loadProjects() {
    this.projectsApi.getOptions().subscribe({
      next: (data) => this.projects.set(data),
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los proyectos',
        });
      },
    });
  }

  // Helpers de accordion móvil
  private buildRowKey(item: TimeTracking, index: number): string {
    return item._id ? String(item._id) : `${item.date}#${index}`;
  }

  isRowExpandedByKey(key: string): boolean {
    return this.expandedRowKeys().has(key);
  }

  toggleRowByKey(key: string): void {
    const set = new Set(this.expandedRowKeys());
    if (set.has(key)) set.delete(key);
    else set.add(key);
    this.expandedRowKeys.set(set);
  }

  setQuery(value: string) {
    this.query.set(value);
  }

  // Método eliminado: Los nuevos registros solo se crean mediante reconocimiento facial

  editItem(item: TimeTracking) {
    const editedItem = { ...item };

    // Si projectId es un objeto (populado), extraer el _id
    if (
      editedItem.projectId &&
      typeof editedItem.projectId === 'object' &&
      '_id' in editedItem.projectId &&
      editedItem.projectId._id
    ) {
      editedItem.projectId = editedItem.projectId._id;
    }

    // Si el proyecto ha sido eliminado, limpiar el projectId
    if (editedItem.projectId && typeof editedItem.projectId === 'string') {
      const projectExists = this.projects().some((p) => p.value === editedItem.projectId);
      if (!projectExists) {
        editedItem.projectId = '';
      }
    }

    this.editing.set(editedItem);
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  viewItem(item: TimeTracking) {
    this.viewing.set(item);
    this.showViewDialog.set(true);
  }

  closeViewDialog() {
    this.showViewDialog.set(false);
  }

  onEditChange(field: keyof TimeTracking, value: TimeTracking[keyof TimeTracking]) {
    const current = this.editing();
    if (current) {
      const updated = { ...current, [field]: value };
      this.editing.set(updated);
    }
  }

  /**
   * Formatea la duración en horas y minutos
   */
  formatDuration(minutes?: number): string {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  /**
   * Obtiene el color del badge según el tipo de marcación
   */
  getTypeBadgeClass(type?: TimeTrackingType): string {
    switch (type) {
      case 'INGRESO':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'SALIDA':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }

  /**
   * Formatea la fecha y hora ISO a formato legible
   */
  formatDateTime(dateString?: string): string {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Formatea la ubicación: usa la dirección guardada en el registro si existe, sino coordenadas.
   */
  formatLocation(item: { location?: Location; address?: string } | null | undefined): string {
    if (!item) return '-';
    if (item.address && item.address.trim()) {
      return item.address.trim();
    }
    const location = item.location;
    if (!location) return '-';
    return this.formatCoordinates(location);
  }

  private formatCoordinates(location: Location): string {
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  }

  onDateChange(value: Date | Date[] | null) {
    if (Array.isArray(value)) {
      return;
    }

    if (value instanceof Date) {
      const y = value.getFullYear();
      const m = (value.getMonth() + 1).toString().padStart(2, '0');
      const d = value.getDate().toString().padStart(2, '0');
      this.onEditChange('date', `${y}-${m}-${d}`);
    } else if (value === null) {
      this.onEditChange('date', '');
    }
  }

  // Métodos de documentos eliminados: No se permiten subir archivos manualmente

  removeDocumentFromEditing(index: number) {
    const current = this.editing();
    if (!current || !current.documents) return;

    const documentToRemove = current.documents[index];
    const documentName = documentToRemove?.split('/').pop() || 'este documento';

    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar el documento "${documentName}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        const updatedDocuments = current.documents ? [...current.documents] : [];
        updatedDocuments.splice(index, 1);
        this.editing.set({ ...current, documents: updatedDocuments });

        if (current._id && documentToRemove) {
          this.timeTrackingApi.deleteDocument(current._id, documentToRemove).subscribe({
            next: (updated) => this.editing.set(updated),
            error: () => {
              this.toastError('No se pudo eliminar el documento');
              this.editing.set({ ...current, documents: current.documents });
            },
          });
        }
      },
    });
  }

  save() {
    const item = this.editing();
    if (!item || !item._id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail:
          'Solo se pueden editar registros existentes. Use el reconocimiento facial para crear nuevos registros.',
      });
      return;
    }

    const errors = this.validateForm(item);
    if (errors.length) {
      errors.forEach((e) => this.toastError(e));
      return;
    }

    // Limpiar el objeto location removiendo campos no permitidos (como _id)
    let cleanedLocation: Location | undefined = undefined;
    if (item.location) {
      cleanedLocation = {
        latitude: item.location.latitude,
        longitude: item.location.longitude,
      };
    }

    // Usar UpdateTimeTrackingRequest con los nuevos campos
    const payload: UpdateTimeTrackingRequest = {
      date: item.date,
      type: item.type,
      location: cleanedLocation,
      address: item.address,
    };

    this.timeTrackingApi.update(item._id, payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Registro de tiempo actualizado',
        });
        this.load();
        this.closeDialog();
      },
      error: (error) => this.toastError(this.getErrorMessage(error)),
    });
  }

  remove(item: TimeTracking) {
    if (!item._id) return;
    this.confirmationService.confirm({
      message: '¿Estás seguro de eliminar este registro de tiempo?',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.timeTrackingApi.delete(item._id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Registro de tiempo eliminado correctamente',
            });
            this.load();
          },
          error: (error) => {
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

  // Obtener la fecha y hora como string para datetime-local input
  getEditDateTime = computed(() => {
    const editing = this.editing();
    if (!editing || !editing.date) return '';
    try {
      const date = new Date(editing.date);
      if (isNaN(date.getTime())) return '';
      // Formato: YYYY-MM-DDTHH:mm para datetime-local
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  });

  onDateTimeChange(value: string) {
    if (!value) {
      this.onEditChange('date', '');
      return;
    }
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        this.onEditChange('date', date.toISOString());
      }
    } catch {
      // Ignorar errores de parsing
    }
  }

  getProjectName(projectId: string | Project | null | undefined): string {
    if (!projectId) {
      return 'Sin proyecto';
    }

    if (typeof projectId === 'object' && 'name' in projectId) {
      return projectId.name || 'Sin proyecto';
    }

    if (typeof projectId === 'string') {
      const project = this.projects().find((p) => p.value === projectId);
      return project?.label || 'Sin proyecto';
    }

    return 'Sin proyecto';
  }

  // Métodos auxiliares para documentos
  getFileIcon(url: string): string {
    if (!url || typeof url !== 'string') {
      return 'pi pi-file';
    }

    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'pi pi-file-pdf';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'pi pi-image';
      case 'doc':
      case 'docx':
        return 'pi pi-file-word';
      case 'xls':
      case 'xlsx':
        return 'pi pi-file-excel';
      default:
        return 'pi pi-file';
    }
  }

  viewDocument(url: string): void {
    if (!url || typeof url !== 'string') {
      return;
    }
    window.open(url, '_blank');
  }

  downloadDocument(url: string): void {
    if (!url || typeof url !== 'string') {
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = url.split('/').pop() || 'documento';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Diálogo Agregar marcación (solo admin)
  addingMarkUserId = signal('');
  addingMarkDate = signal('');
  addingMarkType = signal<TimeTrackingType>('INGRESO');

  openAddMarkDialog() {
    this.addingMarkUserId.set(this.currentUser()?.id ?? '');
    this.addingMarkDate.set('');
    this.addingMarkType.set('INGRESO');
    this.showAddMarkDialog.set(true);
  }

  closeAddMarkDialog() {
    this.showAddMarkDialog.set(false);
  }

  getAddMarkDateTime = computed(() => {
    const s = this.addingMarkDate();
    if (!s) return '';
    try {
      const d = new Date(s);
      if (isNaN(d.getTime())) return '';
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${day}T${h}:${min}`;
    } catch {
      return '';
    }
  });

  onAddMarkDateTimeChange(value: string) {
    if (!value) {
      this.addingMarkDate.set('');
      return;
    }
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) this.addingMarkDate.set(d.toISOString());
    } catch {}
  }

  saveAddMark() {
    const userId = this.addingMarkUserId().trim();
    const date = this.addingMarkDate();
    const type = this.addingMarkType();
    if (!userId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Seleccione un usuario',
      });
      return;
    }
    if (!date) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Indique fecha y hora',
      });
      return;
    }
    const payload: CreateTimeTrackingRequest = {
      userId,
      date,
      type,
    };
    this.timeTrackingApi.create(payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Marcación agregada correctamente',
        });
        this.load();
        this.closeAddMarkDialog();
      },
      error: (err) =>
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.getErrorMessage(err),
        }),
    });
  }

  // Validación
  private validateForm(item: TimeTracking): string[] {
    const errors: string[] = [];

    if (!item.date) {
      errors.push('La fecha es requerida');
    }

    if (!item.type) {
      errors.push('El tipo de marcación es requerido');
    }

    if (item.type && item.type !== 'INGRESO' && item.type !== 'SALIDA') {
      errors.push('El tipo de marcación debe ser INGRESO o SALIDA');
    }

    return errors;
  }

  // Método para obtener mensaje de error de la API
  private getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'status' in error) {
      const httpError = error as {
        status: number;
        error?: { message?: string | string[] };
        message?: string;
      };
      if (httpError.status === 403) {
        if (
          httpError.error?.message &&
          typeof httpError.error.message === 'string' &&
          httpError.error.message.includes('No puedes crear registros')
        ) {
          return 'No puedes crear registros para otros usuarios';
        }
        if (
          httpError.error?.message &&
          typeof httpError.error.message === 'string' &&
          httpError.error.message.includes('No puedes editar')
        ) {
          return 'No puedes editar registros de otros usuarios';
        }
        return 'No tienes permisos para realizar esta acción';
      }

      if (httpError.error?.message) {
        const message = httpError.error.message;
        if (typeof message === 'string') {
          if (message.includes('date should not be empty')) {
            return 'La fecha es requerida';
          }
          if (message.includes('startTime should not be empty')) {
            return 'La hora de inicio es requerida';
          }
          if (message.includes('description should not be empty')) {
            return 'La descripción es requerida';
          }
          return message;
        }
        if (Array.isArray(message)) {
          return message.join(', ');
        }
      }

      if (
        httpError.error &&
        typeof httpError.error === 'object' &&
        'error' in httpError.error &&
        typeof httpError.error.error === 'string'
      ) {
        return httpError.error.error;
      }
    }

    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }

    return 'Ha ocurrido un error inesperado';
  }

  private toastError(detail: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail });
  }

  // ========== Métodos para Marcación con Reconocimiento Facial ==========

  /**
   * Abre el diálogo para marcar asistencia con reconocimiento facial
   * Solo pre-carga modelos, NO solicita permisos automáticamente
   */
  openFaceMarkDialog() {
    this.showFaceDialog.set(true);
    this.autoCaptureTriggered.set(false);
    this.markingType.set('INGRESO');

    // Solo pre-cargar modelos, NO solicitar permisos hasta que el usuario presione INGRESO/SALIDA
    this.preloadModels();
  }

  /**
   * Pre-carga los modelos de face-api en paralelo (no bloquea)
   */
  private async preloadModels(): Promise<void> {
    if (this.modelsLoaded() || this.modelsLoading()) {
      return;
    }

    this.modelsLoading.set(true);
    try {
      await this.faceDetection.loadModels();
      this.modelsLoaded.set(true);
      this.modelsLoading.set(false);
    } catch (error) {
      console.error('Error pre-cargando modelos:', error);
      this.modelsLoading.set(false);
      // No mostrar error aquí, se mostrará en startCamera si es necesario
    }
  }

  /**
   * Obtiene la ubicación GPS actual del dispositivo
   * Retorna true si el permiso fue denegado
   */
  private async getCurrentLocation(): Promise<boolean> {
    this.currentLocation.set(null);
    this.locationError.set(null);

    if (!navigator.geolocation) {
      this.locationError.set('La geolocalización no está disponible en este navegador');
      return false;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentLocation.set({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          this.locationError.set(null);
          resolve(false);
        },
        (error) => {
          let errorMessage = 'No se pudo obtener la ubicación';
          let permissionDenied = false;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              permissionDenied = true;
              errorMessage =
                'Permiso de ubicación denegado. La marcación se guardará sin coordenadas.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Ubicación no disponible. La marcación se guardará sin coordenadas.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Tiempo de espera agotado. La marcación se guardará sin coordenadas.';
              break;
          }
          this.locationError.set(errorMessage);
          this.currentLocation.set(null);
          resolve(permissionDenied);
        },
        {
          enableHighAccuracy: false, // Más rápido, menos preciso (suficiente para marcación)
          timeout: 5000, // Reducido a 5 segundos para respuesta más rápida
          maximumAge: 30000, // Aceptar ubicación cacheada de hasta 30 segundos
        }
      );
    });
  }

  /**
   * Cierra el diálogo de marcación facial
   */
  closeFaceDialog() {
    this.showFaceDialog.set(false);
  }

  /**
   * Solicita permisos de cámara y ubicación cuando el usuario presiona INGRESO o SALIDA
   * Muestra un toast si los permisos son denegados
   */
  async requestPermissionsAndStart() {
    let cameraDenied = false;
    let locationDenied = false;

    // Solicitar permiso de cámara
    cameraDenied = await this.startCamera();

    // Solicitar permiso de ubicación
    locationDenied = await this.getCurrentLocation();

    // Mostrar toast si algún permiso fue denegado
    if (cameraDenied || locationDenied) {
      const missingPermissions: string[] = [];
      if (cameraDenied) {
        missingPermissions.push('cámara');
      }
      if (locationDenied) {
        missingPermissions.push('ubicación');
      }

      this.messageService.add({
        severity: 'warn',
        summary: 'Permisos requeridos',
        detail: `Debe tener los permisos de ${missingPermissions.join(
          ' y '
        )} para realizar la marcación.`,
        life: 5000,
      });
    }
  }

  /**
   * Inicia la cámara para detección en tiempo real
   * Optimizado: usa modelos pre-cargados si están disponibles
   * Retorna true si el permiso fue denegado
   */
  async startCamera(): Promise<boolean> {
    try {
      this.stopCamera();

      // Si los modelos no están cargados, esperar a que se carguen (o cargarlos ahora)
      if (!this.modelsLoaded()) {
        this.isMarkingAttendance.set(true);
        try {
          // Si ya están cargándose, esperar; si no, cargar ahora
          if (this.modelsLoading()) {
            // Esperar hasta que se carguen (máximo 10 segundos)
            let attempts = 0;
            while (this.modelsLoading() && attempts < 20) {
              await new Promise((resolve) => setTimeout(resolve, 500));
              attempts++;
            }
            if (!this.modelsLoaded()) {
              await this.faceDetection.loadModels();
              this.modelsLoaded.set(true);
            }
          } else {
            await this.faceDetection.loadModels();
            this.modelsLoaded.set(true);
          }
        } catch {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los modelos de reconocimiento facial',
          });
          this.isMarkingAttendance.set(false);
          return false;
        }
        this.isMarkingAttendance.set(false);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 }, // Resolución optimizada para velocidad
          height: { ideal: 480 },
        },
      });

      this.cameraStream.set(stream);
      this.isCameraActive.set(true);
      this.isVideoReady.set(false);
      this.isMarkingAttendance.set(false);

      this.setupVideoListeners();

      const assignStream = () => {
        const video = this.cameraVideoRef?.nativeElement;
        if (video && stream) {
          video.srcObject = stream;
          video
            .play()
            .then(() => {
              const checkReady = () => {
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                  this.isVideoReady.set(true);
                  this.startDetection();
                } else {
                  setTimeout(checkReady, 50);
                }
              };
              setTimeout(checkReady, 100);
            })
            .catch((err) => {
              console.error('Error al reproducir video:', err);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo iniciar la reproducción del video',
              });
              this.isCameraActive.set(false);
            });
        } else {
          setTimeout(assignStream, 100);
        }
      };

      setTimeout(assignStream, 200);
      return false; // Permiso no denegado
    } catch (error: unknown) {
      // Verificar si el error es por permiso denegado
      const errorObj = error as { name?: string; message?: string };
      const isPermissionDenied =
        errorObj?.name === 'NotAllowedError' ||
        errorObj?.name === 'PermissionDeniedError' ||
        errorObj?.message?.includes('permission') ||
        errorObj?.message?.includes('Permission');

      if (isPermissionDenied) {
        return true; // Permiso denegado
      }

      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail:
          'No se pudo acceder a la cámara. Verifica los permisos de la cámara en tu navegador.',
      });
      this.isCameraActive.set(false);
      this.isVideoReady.set(false);
      this.isMarkingAttendance.set(false);
      return false;
    }
  }

  /**
   * Detiene la cámara
   */
  stopCamera() {
    this.stopDetection();

    const stream = this.cameraStream();
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      this.cameraStream.set(null);
      this.isCameraActive.set(false);
      this.isVideoReady.set(false);
    }

    const video = this.cameraVideoRef?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
  }

  /**
   * Configura listeners del video
   */
  private setupVideoListeners() {
    const video = this.cameraVideoRef?.nativeElement;
    if (!video) {
      setTimeout(() => this.setupVideoListeners(), 100);
      return;
    }

    const onLoadedMetadata = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        this.isVideoReady.set(true);
      }
    };

    const onPlaying = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        this.isVideoReady.set(true);
      }
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('playing', onPlaying);
  }

  /**
   * Inicia la detección facial en tiempo real
   */
  private startDetection() {
    this.stopDetection();
    this.isDetecting.set(true);
    this.isDetectionInProgress = false;

    // Optimizado: intervalo de 150ms para detección más rápida, pero evitando solapamientos
    this.detectionInterval = setInterval(async () => {
      // Evitar solapamientos de detección
      if (this.isDetectionInProgress) return;

      const video = this.cameraVideoRef?.nativeElement;
      if (!video || !this.isVideoReady() || !this.modelsLoaded()) return;

      this.isDetectionInProgress = true;
      try {
        const result = await this.faceDetection.detectFace(video);
        this.faceDetectionResult.set(result);
        this.drawOverlay(video, result);
      } catch (error) {
        console.error('Error en detección facial:', error);
      } finally {
        this.isDetectionInProgress = false;
      }
    }, 150); // Reducido de 200ms a 150ms para mayor velocidad
  }

  /**
   * Detiene la detección facial
   */
  private stopDetection() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = undefined;
    }
    this.isDetecting.set(false);
    this.faceDetectionResult.set(null);
    this.isDetectionInProgress = false;

    const canvas = this.detectionCanvasRef?.nativeElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  /**
   * Dibuja el overlay en el canvas
   */
  private drawOverlay(video: HTMLVideoElement, result: FaceDetectionResult) {
    const canvas = this.detectionCanvasRef?.nativeElement;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = video.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!result.detected || !result.box) {
      return;
    }

    const scaleX = rect.width / video.videoWidth;
    const scaleY = rect.height / video.videoHeight;

    const box = result.box;
    const x = box.x * scaleX;
    const y = box.y * scaleY;
    const width = box.width * scaleX;
    const height = box.height * scaleY;

    const isReady = result.isValid ?? false;
    const color = isReady ? '#10b981' : '#ef4444';

    const cx = x + width / 2;
    const cy = y + height / 2;
    const rx = width / 2;
    const ry = height / 2;

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = isReady ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(rx - 4, 0), Math.max(ry - 4, 0), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  /**
   * Captura automáticamente y marca asistencia cuando el rostro es válido
   */
  private async autoCaptureAndMark() {
    const video = this.cameraVideoRef?.nativeElement;
    if (!video || !this.isVideoReady() || !video.videoWidth || !video.videoHeight) {
      return;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;

        const file = new File([blob], `attendance-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });

        this.faceImage.set(file);
        this.faceImagePreview.set(canvas.toDataURL('image/jpeg'));

        // Detener cámara antes de procesar
        this.stopCamera();

        // Marcar asistencia automáticamente
        await this.markAttendanceWithFace();
      },
      'image/jpeg',
      0.9
    );
  }

  /**
   * Marca la asistencia usando reconocimiento facial y crea el registro de tiempo
   */
  async markAttendanceWithFace() {
    const image = this.faceImage();
    if (!image) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debes capturar una imagen desde la cámara',
      });
      return;
    }

    const tenantId = this.tenantService.tenantId();
    if (!tenantId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener el tenantId',
      });
      return;
    }

    this.isMarkingAttendance.set(true);

    const request = {};

    try {
      const descriptor = await this.faceDetection.getDescriptorFromFile(image);
      if (!descriptor || descriptor.length !== 128) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo extraer el descriptor facial (128 valores). Verifica la imagen.',
        });
        this.isMarkingAttendance.set(false);
        return;
      }

      const descriptorArr = Array.from(descriptor);
      this.faceRecognitionApi
        .markAttendanceWithDescriptor(image, descriptorArr, tenantId, request)
        .subscribe({
          next: async (attendanceRecord: AttendanceRecord) => {
            const userId =
              typeof attendanceRecord.userId === 'object' &&
              attendanceRecord.userId !== null &&
              '_id' in attendanceRecord.userId
                ? (attendanceRecord.userId as { _id: string })._id
                : String(attendanceRecord.userId);

            const timestamp = new Date(attendanceRecord.timestamp);
            const date = timestamp.toISOString();

            const loc = this.currentLocation();
            let address: string | undefined;
            if (loc) {
              try {
                address = await this.geocodingService.getAddress(loc.latitude, loc.longitude);
              } catch {
                address = undefined;
              }
            }
            const timeTrackingPayload: CreateTimeTrackingRequest = {
              userId,
              date,
              type: this.markingType(),
              attendanceRecordId: attendanceRecord._id,
              location: loc ?? undefined,
              address: address ?? undefined,
            };

            this.timeTrackingApi.create(timeTrackingPayload).subscribe({
              next: () => {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Éxito',
                  detail: `Asistencia marcada correctamente. Confianza: ${(
                    (attendanceRecord.confidence || 0) * 100
                  ).toFixed(1)}%`,
                });
                this.load();
                this.closeFaceDialog();
              },
              error: (error) => {
                this.messageService.add({
                  severity: 'warning',
                  summary: 'Advertencia',
                  detail:
                    'La asistencia fue validada pero no se pudo crear el registro de tiempo. ' +
                    this.getErrorMessage(error),
                });
                this.closeFaceDialog();
              },
            });
          },
          error: (error) => {
            let errorMessage = 'Error al validar la asistencia';
            if (error.error?.message) {
              errorMessage = error.error.message;
            } else if (error.message) {
              errorMessage = error.message;
            }

            this.messageService.add({
              severity: 'error',
              summary: 'Error de Validación',
              detail: errorMessage,
            });
          },
          complete: () => {
            this.isMarkingAttendance.set(false);
          },
        });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al procesar el descriptor facial',
      });
      this.isMarkingAttendance.set(false);
    }
  }
}
