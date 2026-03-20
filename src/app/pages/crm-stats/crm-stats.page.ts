import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { ContactsCrmApiService } from '../../shared/services/contacts-crm-api.service';
import { FollowUpsApiService } from '../../shared/services/follow-ups-api.service';
import { ContactCrm } from '../../shared/interfaces/contact-crm.interface';
import { FollowUp, FollowUpType, FollowUpStatus } from '../../shared/interfaces/follow-up.interface';

interface DayStat { label: string; isoDate: string; count: number; }

@Component({
  selector: 'app-crm-stats',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, ToastModule, TooltipModule],
  providers: [MessageService],
  templateUrl: './crm-stats.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrmStatsPage implements OnInit {
  private readonly contactsApi = inject(ContactsCrmApiService);
  private readonly followUpsApi = inject(FollowUpsApiService);
  private readonly messageService = inject(MessageService);

  loading = signal(true);
  contacts = signal<ContactCrm[]>([]);
  followUps = signal<FollowUp[]>([]);

  // ── KPIs principales ──────────────────────────────────────────
  totalContacts = computed(() => this.contacts().length);
  totalFollowUps = computed(() => this.followUps().length);

  completedFollowUps = computed(() => this.followUps().filter(f => f.status === 'COMPLETED').length);
  scheduledFollowUps = computed(() => this.followUps().filter(f => f.status === 'SCHEDULED').length);
  cancelledFollowUps = computed(() => this.followUps().filter(f => f.status === 'CANCELLED').length);

  completionRate = computed(() => {
    const total = this.totalFollowUps();
    if (!total) return 0;
    return Math.round((this.completedFollowUps() / total) * 100);
  });

  overdueFollowUps = computed(() => {
    const now = new Date();
    return this.followUps().filter(f =>
      f.status === 'SCHEDULED' && f.scheduledDate && new Date(f.scheduledDate) < now
    ).length;
  });

  contactsWithCompany = computed(() => this.contacts().filter(c => !!c.clientId).length);
  contactsWithoutCompany = computed(() => this.contacts().filter(c => !c.clientId).length);
  primaryContacts = computed(() => this.contacts().filter(c => c.isPrimary).length);

  upcomingFollowUps = computed(() => {
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 864e5);
    return this.followUps().filter(f =>
      f.status === 'SCHEDULED' && f.scheduledDate &&
      new Date(f.scheduledDate) >= now && new Date(f.scheduledDate) <= in7
    ).length;
  });

  contactsToday = computed(() => {
    const today = new Date().toDateString();
    return this.contacts().filter(c => c.createdAt && new Date(c.createdAt).toDateString() === today).length;
  });

  followUpsThisWeek = computed(() => {
    const now = new Date();
    const startWeek = new Date(now);
    startWeek.setDate(now.getDate() - now.getDay());
    startWeek.setHours(0, 0, 0, 0);
    return this.followUps().filter(f => f.createdAt && new Date(f.createdAt) >= startWeek).length;
  });

  followUpsWithOutcome = computed(() => this.followUps().filter(f => !!f.outcome?.trim()).length);

  avgFollowUpsPerContact = computed(() => {
    const total = this.totalContacts();
    if (!total) return 0;
    return +(this.totalFollowUps() / total).toFixed(1);
  });

  // ── Distribuciones ────────────────────────────────────────────
  followUpsByStatus = computed(() => {
    const fus = this.followUps();
    const total = fus.length || 1;
    const statuses: { status: FollowUpStatus; label: string; color: string; bg: string }[] = [
      { status: 'SCHEDULED', label: 'Programados', color: 'bg-yellow-500', bg: 'bg-yellow-50 text-yellow-700' },
      { status: 'COMPLETED', label: 'Completados', color: 'bg-green-500', bg: 'bg-green-50 text-green-700' },
      { status: 'CANCELLED', label: 'Cancelados', color: 'bg-red-400', bg: 'bg-red-50 text-red-700' },
    ];
    return statuses.map(s => ({
      ...s,
      count: fus.filter(f => f.status === s.status).length,
      pct: Math.round((fus.filter(f => f.status === s.status).length / total) * 100),
    }));
  });

  followUpsByType = computed(() => {
    const fus = this.followUps();
    const total = fus.length || 1;
    const types: { type: FollowUpType; label: string; icon: string; color: string }[] = [
      { type: 'CALL',     label: 'Llamada',   icon: 'pi-phone',      color: 'bg-green-500' },
      { type: 'EMAIL',    label: 'Email',     icon: 'pi-envelope',   color: 'bg-blue-500' },
      { type: 'MEETING',  label: 'Reunión',   icon: 'pi-users',      color: 'bg-purple-500' },
      { type: 'NOTE',     label: 'Nota',      icon: 'pi-file-edit',  color: 'bg-yellow-500' },
      { type: 'PROPOSAL', label: 'Propuesta', icon: 'pi-file',       color: 'bg-orange-500' },
      { type: 'OTHER',    label: 'Otro',      icon: 'pi-circle',     color: 'bg-gray-400' },
    ];
    return types.map(t => ({
      ...t,
      count: fus.filter(f => f.type === t.type).length,
      pct: Math.round((fus.filter(f => f.type === t.type).length / total) * 100),
    })).sort((a, b) => b.count - a.count);
  });

  contactsBySource = computed(() => {
    const contacts = this.contacts();
    const total = contacts.length || 1;
    return [
      { source: 'REFERRAL',     label: 'Referido',        color: 'bg-emerald-500', icon: 'pi-share-alt' },
      { source: 'SOCIAL_MEDIA', label: 'Redes sociales',  color: 'bg-blue-500',    icon: 'pi-globe' },
      { source: 'OTHER',        label: 'Otros',           color: 'bg-gray-400',    icon: 'pi-circle' },
    ].map(s => ({
      ...s,
      count: contacts.filter(c => c.source === s.source).length,
      pct: Math.round((contacts.filter(c => c.source === s.source).length / total) * 100),
    }));
  });

  // ── Series temporales (últimos 14 días) ───────────────────────
  contactsPerDay = computed((): DayStat[] => {
    const days = this.buildLast14Days();
    const contacts = this.contacts();
    return days.map(d => ({
      ...d,
      count: contacts.filter(c =>
        c.createdAt && new Date(c.createdAt).toDateString() === new Date(d.isoDate).toDateString()
      ).length,
    }));
  });

  maxContactsPerDay = computed(() => Math.max(...this.contactsPerDay().map(d => d.count), 1));

  followUpsPerDay = computed((): DayStat[] => {
    const days = this.buildLast14Days();
    const fus = this.followUps();
    return days.map(d => ({
      ...d,
      count: fus.filter(f =>
        f.scheduledDate && new Date(f.scheduledDate).toDateString() === new Date(d.isoDate).toDateString()
      ).length,
    }));
  });

  maxFollowUpsPerDay = computed(() => Math.max(...this.followUpsPerDay().map(d => d.count), 1));

  // ── Top 5 contactos con más seguimientos ─────────────────────
  topContactsByFollowUps = computed(() => {
    const fus = this.followUps();
    const contacts = this.contacts();
    const countMap = new Map<string, number>();
    fus.forEach(f => { if (f.contactId) countMap.set(f.contactId, (countMap.get(f.contactId) ?? 0) + 1); });
    return contacts
      .filter(c => c._id && countMap.has(c._id))
      .map(c => ({ contact: c, count: countMap.get(c._id!) ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  });

  maxTopCount = computed(() => Math.max(...this.topContactsByFollowUps().map(c => c.count), 1));

  // ── Próximos seguimientos ─────────────────────────────────────
  nextFollowUps = computed(() => {
    const now = new Date();
    return this.followUps()
      .filter(f => f.status === 'SCHEDULED' && f.scheduledDate && new Date(f.scheduledDate) >= now)
      .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())
      .slice(0, 5);
  });

  // ── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    this.loading.set(true);
    forkJoin({
      contacts: this.contactsApi.list(),
      followUps: this.followUpsApi.list(),
    }).subscribe({
      next: ({ contacts, followUps }) => {
        this.contacts.set(contacts);
        this.followUps.set(followUps);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los datos' });
      },
    });
  }

  reload(): void { this.ngOnInit(); }

  // ── Helpers ───────────────────────────────────────────────────
  private buildLast14Days(): { label: string; isoDate: string }[] {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return {
        label: d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }),
        isoDate: d.toISOString(),
      };
    });
  }

  barPct(count: number, max: number): string {
    return `${max ? Math.round((count / max) * 100) : 0}%`;
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  getTypeLabel(type?: FollowUpType): string {
    const map: Record<string, string> = { CALL: 'Llamada', EMAIL: 'Email', MEETING: 'Reunión', NOTE: 'Nota', PROPOSAL: 'Propuesta', OTHER: 'Otro' };
    return type ? (map[type] ?? type) : '—';
  }

  getTypeIcon(type?: FollowUpType): string {
    const map: Record<string, string> = { CALL: 'pi-phone', EMAIL: 'pi-envelope', MEETING: 'pi-users', NOTE: 'pi-file-edit', PROPOSAL: 'pi-file', OTHER: 'pi-circle' };
    return `pi ${type ? (map[type] ?? 'pi-circle') : 'pi-circle'}`;
  }

  getTypeColor(type?: FollowUpType): string {
    const map: Record<string, string> = { CALL: 'bg-green-100 text-green-700', EMAIL: 'bg-blue-100 text-blue-700', MEETING: 'bg-purple-100 text-purple-700', NOTE: 'bg-yellow-100 text-yellow-700', PROPOSAL: 'bg-orange-100 text-orange-700', OTHER: 'bg-gray-100 text-gray-600' };
    return type ? (map[type] ?? 'bg-gray-100 text-gray-600') : 'bg-gray-100 text-gray-600';
  }
}
