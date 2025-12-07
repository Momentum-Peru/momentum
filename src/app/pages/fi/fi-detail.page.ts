import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FiApiService } from '../../shared/services/fi-api.service';
import {
  Accionable,
  AccionableEstado,
  CalendarDay,
  CalendarResponse,
  Fi,
  UpdateFiRequest,
} from '../../shared/interfaces/fi';
import { FormsModule } from '@angular/forms';
import { Button, type ButtonSeverity } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  selector: 'app-fi-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    Button,
    InputText,
    Textarea,
    ToggleSwitch,
    DatePicker,
    Dialog,
    ConfirmDialogModule,
    ToastModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './fi-detail.page.html',
  styleUrl: './fi-detail.page.scss',
})
export class FiDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(FiApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  fi = signal<Fi | null>(null);
  form: { titulo: string; description: string; atravesar: string; isActive: boolean } = {
    titulo: '',
    description: '',
    atravesar: '',
    isActive: true,
  };
  planDesc = '';
  startDate?: Date;
  endDate?: Date;
  dateRange: Date[] = [];

  // Responsive config for DatePicker
  isSmallScreen = window.matchMedia('(max-width: 640px)').matches;
  isLargeScreen = window.matchMedia('(min-width: 1024px)').matches;

  calendarDays = signal<CalendarDay[]>([]);
  currentMonth = signal<Date>(new Date());

  accionableOpen = false;
  accionableEdit = signal<Accionable | null>(null);
  accionableDate?: Date;
  accionableDesc = '';

  get fiId(): string {
    return this.route.snapshot.paramMap.get('id') || '';
  }

  ngOnInit(): void {
    this.loadFi();
  }

  private toIsoDateOnly(d?: Date): string | undefined {
    return d ? d.toISOString().slice(0, 10) : undefined;
  }

  loadFi(): void {
    if (!this.fiId) return;
    this.api.getById(this.fiId).subscribe((f) => {
      this.fi.set(f);
      this.form = {
        titulo: f.titulo,
        description: f.description,
        atravesar: f.atravesar,
        isActive: f.isActive,
      };
      this.planDesc = f.plan;
      this.startDate = new Date(f.startDate);
      this.endDate = new Date(f.endDate);
      this.dateRange = [this.startDate, this.endDate];
      // Inicializar el mes actual con la fecha de inicio
      this.currentMonth.set(new Date(this.startDate));
      this.reloadCalendar();
    });
  }

  reloadCalendar(): void {
    if (!this.fi()) return;
    const from = this.toIsoDateOnly(this.startDate);
    const to = this.toIsoDateOnly(this.endDate);
    this.api.getCalendar(this.fiId, { from, to }).subscribe((cal: CalendarResponse) => {
      this.calendarDays.set(cal.dias);
    });
  }

  rangeText = computed(() => {
    const from = this.toIsoDateOnly(this.startDate) || '';
    const to = this.toIsoDateOnly(this.endDate) || '';
    return from && to ? `${from} → ${to}` : '';
  });

  onRangeChange(range: Date[] | null): void {
    this.dateRange = Array.isArray(range) ? range : [];
    this.startDate = this.dateRange[0];
    this.endDate = this.dateRange[1];
    this.reloadCalendar();
  }

  save(): void {
    const payload: UpdateFiRequest = {
      titulo: this.form.titulo,
      description: this.form.description,
      atravesar: this.form.atravesar,
      plan: this.planDesc,
      startDate: this.toIsoDateOnly(this.startDate),
      endDate: this.toIsoDateOnly(this.endDate),
      isActive: this.form.isActive,
    };
    this.api.update(this.fiId, payload).subscribe({
      next: (updated) => {
        this.fi.set(updated);
        this.reloadCalendar();
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Futuro Imposible actualizado correctamente',
        });
      },
    });
  }

  deleteFi(fi: Fi): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que quieres eliminar el Futuro Imposible "${fi.titulo}"? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.api.delete(fi._id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Futuro Imposible eliminado correctamente',
            });
            this.back();
          },
          error: () => {
            // El error se maneja en el interceptor
          },
        });
      },
    });
  }

  openAdd(fecha: string): void {
    this.accionableEdit.set(null);
    this.accionableDate = new Date(fecha);
    this.accionableDesc = '';
    this.accionableOpen = true;
  }

  openEdit(item: Accionable): void {
    this.accionableEdit.set(item);
    this.accionableDate = new Date(item.fecha);
    this.accionableDesc = item.descripcion;
    this.accionableOpen = true;
  }

  saveAccionable(): void {
    if (!this.accionableDate) return;
    const fecha = this.toIsoDateOnly(this.accionableDate)!;
    const editing = this.accionableEdit();
    if (editing) {
      this.api
        .updateActionable(this.fiId, editing._id, { fecha, descripcion: this.accionableDesc })
        .subscribe({
          next: () => {
            this.accionableOpen = false;
            this.reloadCalendar();
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Accionable actualizado correctamente',
            });
          },
        });
    } else {
      this.api.createActionable(this.fiId, { fecha, descripcion: this.accionableDesc }).subscribe({
        next: () => {
          this.accionableOpen = false;
          this.reloadCalendar();
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Accionable creado correctamente',
          });
        },
      });
    }
  }

  deleteAccionable(item: Accionable): void {
    this.api.deleteActionable(this.fiId, item._id).subscribe({
      next: () => {
        this.reloadCalendar();
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Accionable eliminado correctamente',
        });
      },
    });
  }

  toggleEstado(item: Accionable): void {
    const next: AccionableEstado = item.estado === 'cumplido' ? 'pendiente' : 'cumplido';
    this.api.updateActionableEstado(this.fiId, item._id, next).subscribe({
      next: () => {
        this.reloadCalendar();
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Accionable marcado como ${next}`,
        });
      },
    });
  }

  back(): void {
    this.router.navigate(['/fi']);
  }

  getDayNumber(fecha: string): number {
    const date = new Date(fecha);
    return date.getDate();
  }

  toggleEstadoFromDialog(): void {
    const editing = this.accionableEdit();
    if (!editing) return;
    this.toggleEstado(editing);
    this.accionableOpen = false;
  }

  deleteFromDialog(): void {
    const editing = this.accionableEdit();
    if (!editing) return;
    this.deleteAccionable(editing);
    this.accionableOpen = false;
  }

  // Helpers para template: evitan errores de tipos en el binding
  getToggleSeverity(): ButtonSeverity {
    const editing = this.accionableEdit();
    if (editing?.estado === 'cumplido') return 'warn';
    return 'success';
  }

  getToggleLabel(): string {
    const editing = this.accionableEdit();
    return editing?.estado === 'cumplido' ? 'Marcar Pendiente' : 'Marcar Cumplido';
  }

  getToggleIcon(): string {
    const editing = this.accionableEdit();
    return editing?.estado === 'cumplido' ? 'pi pi-refresh' : 'pi pi-check';
  }

  goToDayDetail(fecha: string): void {
    this.router.navigate(['/fi', this.fiId, 'day', fecha]);
  }

  // Navegación del calendario por mes
  filteredCalendarDays = computed(() => {
    const allDays = this.calendarDays();
    const month = this.currentMonth();
    const year = month.getFullYear();
    const monthIndex = month.getMonth();

    return allDays.filter((day) => {
      const dayDate = new Date(day.fecha);
      return dayDate.getFullYear() === year && dayDate.getMonth() === monthIndex;
    });
  });

  currentMonthText = computed(() => {
    const month = this.currentMonth();
    return month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  });

  previousMonth(): void {
    const current = this.currentMonth();
    const newMonth = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    this.currentMonth.set(newMonth);
  }

  nextMonth(): void {
    const current = this.currentMonth();
    const newMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    this.currentMonth.set(newMonth);
  }

  canGoPrevious(): boolean {
    if (!this.startDate) return false;
    const current = this.currentMonth();
    const start = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), 1);
    return current > start;
  }

  canGoNext(): boolean {
    if (!this.endDate) return false;
    const current = this.currentMonth();
    const end = new Date(this.endDate.getFullYear(), this.endDate.getMonth(), 1);
    return current < end;
  }

  formatAccionableDate(): string {
    if (!this.accionableDate) return '';
    return this.accionableDate.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
