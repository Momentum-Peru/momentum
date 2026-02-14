import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { TimeTrackingApiService } from '../../../shared/services/time-tracking-api.service';
import { UsersApiService, User } from '../../../shared/services/users-api.service';
import { TimeTracking } from '../../../shared/interfaces/time-tracking.interface';

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
        RouterModule
    ],
    templateUrl: './time-tracking-detail.component.html',
    styleUrls: ['./time-tracking-detail.component.css']
})
export class TimeTrackingDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private timeTrackingApi = inject(TimeTrackingApiService);
    private usersApi = inject(UsersApiService);

    userId = signal<string>('');
    user = signal<User | null>(null);
    records = signal<TimeTracking[]>([]);
    loading = signal<boolean>(false);

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
            // Late if after 8:15 AM
            // Using local time for simplicity as timezone handling without luxon is verbose
            // Ideally we should use a library or proper offset handling
            const hour = date.getHours();
            const minute = date.getMinutes();
            return hour > 8 || (hour === 8 && minute > 15);
        }).length;
    });

    // A simple absence calculation would require a known schedule. 
    // For now we might just omit it or rely on a more complex calculation if needed.
    // We'll stick to what we can compute from the records for now.

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

        // Load Records (last 30 days by default, or implement date filters)
        // For now getting all active or a reasonable range
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        const startDate = thirtyDaysAgo.toISOString().split('T')[0];
        const endDate = now.toISOString().split('T')[0];

        this.timeTrackingApi.getByUser(userId, { startDate, endDate }).subscribe({
            next: (data) => {
                this.records.set(data);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Error loading records', err);
                this.loading.set(false);
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
