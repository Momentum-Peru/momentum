import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { toSignal } from '@angular/core/rxjs-interop';

import { TimeTrackingApiService } from '../../../shared/services/time-tracking-api.service';
import { UsersApiService, User } from '../../../shared/services/users-api.service';
import { AuthService } from '../../login/services/auth.service';
import {
    TimeTracking,
    CreateTimeTrackingRequest,
    UpdateTimeTrackingRequest
} from '../../../shared/interfaces/time-tracking.interface';
import { PayrollCalculationTimeTrackingDialogComponent } from '../../payroll-calculation/components/payroll-calculation-time-tracking-dialog/payroll-calculation-time-tracking-dialog';

@Component({
    selector: 'app-time-tracking-detail',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        ButtonModule,
        CardModule,
        TagModule,
        TooltipModule,
        RouterModule,
        ToastModule,
        ConfirmDialogModule,
        PayrollCalculationTimeTrackingDialogComponent
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './time-tracking-detail.component.html',
    styleUrls: ['./time-tracking-detail.component.css']
})
export class TimeTrackingDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private timeTrackingApi = inject(TimeTrackingApiService);
    private usersApi = inject(UsersApiService);
    private authService = inject(AuthService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    userId = signal<string>('');
    user = signal<User | null>(null);
    records = signal<TimeTracking[]>([]);
    loading = signal<boolean>(false);

    // Manual Entry State
    showTimeTrackingDialog = signal(false);
    editingTimeTracking = signal<TimeTracking | null>(null);
    selectedTimeTrackingDate = signal<Date | null>(null);
    defaultTrackingType = signal<'INGRESO' | 'SALIDA' | null>(null);

    // Current User & Permissions
    currentUser = toSignal(this.authService.currentUser$, {
        initialValue: this.authService.getCurrentUser(),
    });

    canEditTimeTracking = computed(() => {
        const user = this.currentUser();
        return user?.role === 'admin' || user?.role === 'gerencia';
    });

    // Stats
    attendanceCount = computed(() => {
        const records = this.records();
        const uniqueDays = new Set(
            records.map((r) => new Date(r.date.toString()).toISOString().split('T')[0])
        );
        return uniqueDays.size;
    });

    tardinessCount = computed(() => {
        return this.records().filter(r => {
            if (r.type !== 'INGRESO') return false;
            const date = new Date(r.date);
            const hour = date.getHours();
            const minute = date.getMinutes();
            return hour > 8 || (hour === 8 && minute > 15);
        }).length;
    });

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            const id = params.get('userId');
            if (id) {
                this.userId.set(id);
                this.loadData(id);
            }
        });
    }

    loadData(userId: string) {
        this.loading.set(true);

        // Load User
        this.usersApi.getById(userId).subscribe({
            next: (user) => this.user.set(user),
            error: (err) => console.error('Error loading user', err)
        });

        // Load Records (last 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        const startDate = thirtyDaysAgo.toISOString().split('T')[0];
        const endDate = now.toISOString().split('T')[0];

        this.timeTrackingApi.getByUser(userId, { startDate, endDate }).subscribe({
            next: (data) => {
                // Sort by date descending
                const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                this.records.set(sorted);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Error loading records', err);
                this.loading.set(false);
            }
        });
    }

    // Manual Entry Methods
    openAddTimeTrackingDialog(type: 'INGRESO' | 'SALIDA'): void {
        const defaultDate = new Date();
        if (type === 'INGRESO') {
            defaultDate.setHours(8, 0, 0, 0);
        } else {
            defaultDate.setHours(17, 0, 0, 0);
        }

        this.selectedTimeTrackingDate.set(defaultDate);
        this.defaultTrackingType.set(type);
        this.editingTimeTracking.set(null);
        this.showTimeTrackingDialog.set(true);
    }

    openEditTimeTrackingDialog(record: TimeTracking): void {
        this.editingTimeTracking.set(record);
        this.selectedTimeTrackingDate.set(new Date(record.date));
        this.showTimeTrackingDialog.set(true);
    }

    saveTimeTracking(request: CreateTimeTrackingRequest | UpdateTimeTrackingRequest): void {
        const editing = this.editingTimeTracking();
        const userId = this.userId();

        if (editing) {
            this.timeTrackingApi.update(editing._id!, request as UpdateTimeTrackingRequest).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Registro actualizado'
                    });
                    this.showTimeTrackingDialog.set(false);
                    this.loadData(userId);
                },
                error: (err) => {
                    console.error('Error updating', err);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudo actualizar el registro'
                    });
                }
            });
        } else {
            const createRequest = request as CreateTimeTrackingRequest;
            createRequest.userId = userId;
            this.timeTrackingApi.create(createRequest).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Registro creado'
                    });
                    this.showTimeTrackingDialog.set(false);
                    this.loadData(userId);
                },
                error: (err) => {
                    console.error('Error creating', err);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudo crear el registro'
                    });
                }
            });
        }
    }

    deleteTimeTracking(record: TimeTracking): void {
        this.confirmationService.confirm({
            message: '¿Estás seguro de que deseas eliminar este registro?',
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.timeTrackingApi.delete(record._id!).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Éxito',
                            detail: 'Registro eliminado'
                        });
                        this.loadData(this.userId());
                    },
                    error: (err) => {
                        console.error('Error deleting', err);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'No se pudo eliminar el registro'
                        });
                    }
                });
            }
        });
    }

    goBack() {
        this.router.navigate(['/time-tracking']);
    }

    getSeverity(type: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
        return type === 'INGRESO' ? 'success' : 'warn';
    }

    formatDate(date: string | Date): string {
        const d = new Date(date);
        return d.toLocaleString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

