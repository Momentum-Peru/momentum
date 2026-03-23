import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  effect,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { MicrosoftGraphService, MicrosoftEvent } from '../../../../shared/services/microsoft-graph.service';
import { finalize } from 'rxjs/operators';

const CALENDAR_START_HOUR = 7;
const CALENDAR_END_HOUR = 21;
const HOUR_HEIGHT = 56;

type CalendarViewType = 'day' | 'workWeek' | 'week';

@Component({
  selector: 'app-meetings-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    SelectModule,
    TooltipModule,
    DatePickerModule,
  ],
  templateUrl: './meetings-calendar.component.html',
  styleUrl: './meetings-calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeetingsCalendarComponent implements OnInit {
  readonly msGraphService = inject(MicrosoftGraphService);

  readonly CALENDAR_START_HOUR = CALENDAR_START_HOUR;
  readonly CALENDAR_END_HOUR = CALENDAR_END_HOUR;
  readonly HOUR_HEIGHT = HOUR_HEIGHT;

  filterDate = signal<Date>(new Date());
  msEvents = signal<MicrosoftEvent[]>([]);
  loadingMsEvents = signal(false);

  calendarViewType = signal<CalendarViewType>('workWeek');
  calendarViewOptions = [
    { label: 'Día', value: 'day' as CalendarViewType },
    { label: 'Semana laboral', value: 'workWeek' as CalendarViewType },
    { label: 'Semana', value: 'week' as CalendarViewType },
  ];

  calendarStartDay = computed(() => {
    const d = new Date(this.filterDate());
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  weekDays = computed(() => {
    const start = this.calendarStartDay();
    const days: Date[] = [];
    const count =
      this.calendarViewType() === 'day' ? 1 : this.calendarViewType() === 'workWeek' ? 5 : 7;

    if (this.calendarViewType() === 'day') {
      days.push(new Date(this.filterDate()));
      return days;
    }

    for (let i = 0; i < count; i++) {
      const nextDay = new Date(start);
      nextDay.setDate(start.getDate() + i);
      days.push(nextDay);
    }
    return days;
  });

  calendarRangeLabel = computed(() => {
    const days = this.weekDays();
    if (days.length === 0) return '';
    if (this.calendarViewType() === 'day') {
      return days[0].toLocaleDateString('es-PE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }

    const start = days[0];
    const end = days[days.length - 1];
    const formatMonth = (d: Date) => d.toLocaleString('es-PE', { month: 'long' });
    const formatYear = (d: Date) => d.getFullYear();

    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}-${end.getDate()} de ${formatMonth(start)} de ${formatYear(start)}`;
    }
    return `${start.getDate()} de ${formatMonth(start)} - ${end.getDate()} de ${formatMonth(end)} de ${formatYear(end)}`;
  });

  constructor() {
    effect(() => {
      if (this.msGraphService.isLoggedIn()) {
        this.loadMsEvents();
      } else {
        this.msEvents.set([]);
      }
    });
  }

  ngOnInit(): void {
    if (this.msGraphService.isLoggedIn()) {
      this.loadMsEvents();
    }
  }

  getCalendarHours(): number[] {
    const hours: number[] = [];
    for (let h = CALENDAR_START_HOUR; h <= CALENDAR_END_HOUR; h += 1) {
      hours.push(h);
    }
    return hours;
  }

  getCurrentTimeTop(): number {
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    const relative = hour - CALENDAR_START_HOUR;
    const clamped = Math.max(
      0,
      Math.min(relative, CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1)
    );
    return clamped * HOUR_HEIGHT;
  }

  getEventTop(startIso: string): number {
    const start = new Date(startIso);
    const hour = start.getHours() + start.getMinutes() / 60;
    return Math.max(0, (hour - CALENDAR_START_HOUR) * HOUR_HEIGHT);
  }

  getEventHeight(startIso: string, endIso: string): number {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const diffHours = Math.max(0.25, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
    return diffHours * HOUR_HEIGHT;
  }

  getEventLeft(date: string): string {
    const d = new Date(date);
    const day = d.getDay();
    if (this.calendarViewType() === 'day') return '0%';

    const index = day === 0 ? 6 : day - 1;
    const count = this.calendarViewType() === 'workWeek' ? 5 : 7;

    if (this.calendarViewType() === 'workWeek' && index > 4) return '0%';
    return `${(index / count) * 100}%`;
  }

  getEventWidth(): string {
    const count =
      this.calendarViewType() === 'day' ? 1 : this.calendarViewType() === 'workWeek' ? 5 : 7;
    return `${100 / count}%`;
  }

  isTodayVisible(): boolean {
    const today = new Date();
    return this.weekDays().some(
      (d) =>
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
    );
  }

  getTodayLeft(): string {
    return this.getEventLeft(new Date().toISOString());
  }

  formatEventTimeRange(start: string, end: string): string {
    try {
      const s = new Date(start);
      const e = new Date(end);
      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      };
      return `${s.toLocaleTimeString('es-PE', options)} - ${e.toLocaleTimeString('es-PE', options)}`;
    } catch {
      return '';
    }
  }

  goNextPeriod(): void {
    const d = new Date(this.filterDate());
    if (this.calendarViewType() === 'day') {
      d.setDate(d.getDate() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    this.filterDate.set(d);
    if (this.msGraphService.isLoggedIn()) this.loadMsEvents();
  }

  goPrevPeriod(): void {
    const d = new Date(this.filterDate());
    if (this.calendarViewType() === 'day') {
      d.setDate(d.getDate() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    this.filterDate.set(d);
    if (this.msGraphService.isLoggedIn()) this.loadMsEvents();
  }

  goToday(): void {
    this.filterDate.set(new Date());
    if (this.msGraphService.isLoggedIn()) this.loadMsEvents();
  }

  connectMicrosoft(): void {
    this.msGraphService.login();
  }

  logoutMicrosoft(): void {
    this.msGraphService.logout();
    this.msEvents.set([]);
  }

  openTeamsCalendar(): void {
    window.open('https://teams.microsoft.com/_#/calendarv2', '_blank');
  }

  openNewMeeting(): void {
    this.openTeamsCalendar();
  }

  onFilterDateChange(date: Date | null): void {
    if (date) {
      this.filterDate.set(date);
      if (this.msGraphService.isLoggedIn()) this.loadMsEvents();
    }
  }

  onViewTypeChange(): void {
    if (this.msGraphService.isLoggedIn()) this.loadMsEvents();
  }

  openEvent(event: MicrosoftEvent): void {
    const url = event.onlineMeetingUrl || event.webLink;
    if (url) {
      window.open(url, '_blank');
    }
  }

  private buildDateFilters(): { startDate: string; endDate: string } {
    const d = this.filterDate();
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }

  loadMsEvents(): void {
    if (!this.msGraphService.isLoggedIn()) return;

    this.loadingMsEvents.set(true);

    let startDate: string;
    let endDate: string;

    if (this.calendarViewType() === 'day') {
      const dates = this.buildDateFilters();
      startDate = dates.startDate;
      endDate = dates.endDate;
    } else {
      const start = this.calendarStartDay();
      const end = new Date(start);
      end.setDate(start.getDate() + (this.calendarViewType() === 'workWeek' ? 5 : 7));
      end.setHours(23, 59, 59, 999);
      startDate = start.toISOString();
      endDate = end.toISOString();
    }

    this.msGraphService
      .getCalendarView(startDate, endDate)
      .pipe(finalize(() => this.loadingMsEvents.set(false)))
      .subscribe({
        next: (res) => {
          this.msEvents.set(res.value ?? []);
        },
        error: (err: unknown) => {
          console.error('[MeetingsCalendar] Error cargando calendario:', err);
        },
      });
  }
}
