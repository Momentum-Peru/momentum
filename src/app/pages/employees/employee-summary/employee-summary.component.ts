import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EmployeesApiService } from '../../../shared/services/employees-api.service';
import { WorkShiftsApiService } from '../../../shared/services/work-shifts-api.service';
import { TimeTrackingApiService } from '../../../shared/services/time-tracking-api.service';
import { Employee } from '../../../shared/interfaces/employee.interface';
import { WorkShift } from '../../../shared/interfaces/work-shift.interface';
import { TimeTracking } from '../../../shared/interfaces/time-tracking.interface';

@Component({
  selector: 'app-employee-summary',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    SkeletonModule,
    TagModule,
    TableModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './employee-summary.component.html',
  styleUrls: ['./employee-summary.component.scss']
})
export class EmployeeSummaryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly employeesApi = inject(EmployeesApiService);
  private readonly workShiftsApi = inject(WorkShiftsApiService);
  private readonly timeTrackingApi = inject(TimeTrackingApiService);
  private readonly messageService = inject(MessageService);

  employeeId = signal<string>('');
  employee = signal<Employee | null>(null);
  workShift = signal<WorkShift | null>(null);
  timeTrackingRecords = signal<TimeTracking[]>([]);
  loading = signal(true);

  // Stats
  totalHoursWorked = computed(() => {
    const records = this.timeTrackingRecords();
    // Simple calculation: sum durations of INGRESO -> SALIDA pairs
    // Note: This is a simplified estimation.
    // A more robust way would be to group by day and calculate diff.
    let totalMs = 0;
    const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let lastIngreso: TimeTracking | null = null;
    
    for (const record of sorted) {
      if (record.type === 'INGRESO') {
        lastIngreso = record;
      } else if (record.type === 'SALIDA' && lastIngreso) {
        const start = new Date(lastIngreso.date).getTime();
        const end = new Date(record.date).getTime();
        totalMs += (end - start);
        lastIngreso = null;
      }
    }
    
    // Convert ms to hours (decimal)
    return (totalMs / (1000 * 60 * 60));
  });

  formattedTotalHours = computed(() => {
    const hours = this.totalHoursWorked();
    return hours.toFixed(2);
  });

  tardinessCount = computed(() => {
    const records = this.timeTrackingRecords();
    return records.filter(r => r.type === 'INGRESO' && this.isTardanza(r.date)).length;
  });

  attendanceCount = computed(() => {
     const records = this.timeTrackingRecords();
     const uniqueDays = new Set(records.filter(r => r.type === 'INGRESO').map(r => r.date.split('T')[0]));
     return uniqueDays.size;
  });

  absenceCount = computed(() => {
     const start = new Date();
     start.setDate(start.getDate() - 30);
     const end = new Date();
     
     let daysInRange = 0;
     const current = new Date(start);
     while (current <= end) {
        if (current.getDay() !== 0) { // Exclude Sunday
            daysInRange++;
        }
        current.setDate(current.getDate() + 1);
     }
     
     const attended = this.attendanceCount();
     return Math.max(0, daysInRange - attended);
  });

  stats = computed(() => ({
    hours: this.formattedTotalHours(),
    tardiness: this.tardinessCount(),
    attendance: this.attendanceCount(),
    absences: this.absenceCount()
  }));

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.employeeId.set(id);
        this.loadData(id);
      } else {
        this.router.navigate(['/employees']);
      }
    });
  }

  loadData(id: string) {
    this.loading.set(true);
    
    // 1. Fetch Employee
    this.employeesApi.getById(id).subscribe({
      next: (emp) => {
        this.employee.set(emp);
        
        // 2. Fetch WorkShift if exists
        if (emp.workShiftId) {
          const wsId = typeof emp.workShiftId === 'string' ? emp.workShiftId : (emp.workShiftId as any)._id;
          if (wsId) {
             this.workShiftsApi.getById(wsId).subscribe({
                next: (ws) => this.workShift.set(ws),
                error: () => console.warn('Could not load work shift')
             });
          }
        }
        
        // 3. Fetch Time Tracking (Recent history, e.g. last 30 days or all)
        // Check if user has a userId associated
        const userId = typeof emp.userId === 'string' ? emp.userId : (emp.userId as any)?._id;
        
        if (userId) {
          // Default to last 30 days for summary
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - 30);
            
            this.timeTrackingApi.getByUser(
                userId, 
                {
                   startDate: start.toISOString().split('T')[0], 
                   endDate: end.toISOString().split('T')[0]
                }
            ).subscribe({
                next: (records) => {
                    this.timeTrackingRecords.set(records);
                    this.loading.set(false);
                },
                error: (err: any) => {
                    console.error(err);
                    this.messageService.add({severity: 'warn', summary: 'Advertencia', detail: 'No se pudieron cargar las marcaciones'});
                    this.loading.set(false);
                }
            });
        } else {
            this.loading.set(false);
        }
      },
      error: () => {
        this.messageService.add({severity: 'error', summary: 'Error', detail: 'No se pudo cargar el empleado'});
        this.router.navigate(['/employees']);
      }
    });
  }

  goBack() {
    this.router.navigate(['/employees']);
  }

  // Helper from time-tracking.ts
  isTardanza(dateIso: string): boolean {
    if (!dateIso) return false;
    try {
      const d = new Date(dateIso);
      if (isNaN(d.getTime())) return false;
      const minutesSinceMidnight = d.getHours() * 60 + d.getMinutes();
      return minutesSinceMidnight > 8 * 60 + 15; // > 8:15 AM
    } catch {
      return false;
    }
  }

  getAreaName(areaId: any): string {
    if (!areaId) return 'Sin área';
    if (typeof areaId === 'string') return `Área ID: ${areaId}`;
    if (typeof areaId === 'object' && 'nombre' in areaId) return areaId.nombre;
    return 'Sin área';
  }
}
