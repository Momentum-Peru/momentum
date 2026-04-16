import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { RecruitmentApiService, RecruitmentRequest, RecruitmentRequestStatus } from '../../../shared/services/recruitment-api.service';

@Component({
  selector: 'app-recruitment-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, CardModule],
  templateUrl: './recruitment-dashboard.html',
  styleUrl: './recruitment-dashboard.scss'
})
export class RecruitmentDashboard implements OnInit {
  private recruitmentApi = inject(RecruitmentApiService);

  items = signal<RecruitmentRequest[]>([]);
  loading = signal(false);

  stats = computed(() => {
    const list = this.items();
    return {
      total: list.length,
      pending: list.filter(i => i.status === RecruitmentRequestStatus.PENDING).length,
      approved: list.filter(i => i.status === RecruitmentRequestStatus.APPROVED).length,
      inProgress: list.filter(i => i.status === RecruitmentRequestStatus.IN_PROGRESS).length,
    };
  });

  recentRequests = computed(() => {
    return this.items().slice(0, 5);
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.recruitmentApi.list().subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}
