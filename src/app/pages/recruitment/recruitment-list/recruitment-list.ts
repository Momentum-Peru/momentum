import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { RecruitmentApiService, RecruitmentRequest } from '../../../shared/services/recruitment-api.service';

@Component({
  selector: 'app-recruitment-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    ToastModule,
    SkeletonModule,
  ],
  templateUrl: './recruitment-list.html',
  styleUrl: './recruitment-list.scss',
  providers: [MessageService],
})
export class RecruitmentListPage implements OnInit {
  private recruitmentApi = inject(RecruitmentApiService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  items = signal<RecruitmentRequest[]>([]);
  loading = signal(false);
  searchValue = signal('');

  filteredItems = computed(() => {
    const q = this.searchValue().toLowerCase();
    return this.items().filter(item => 
      item.requestNumber?.toLowerCase().includes(q) ||
      item.jobTitle?.toLowerCase().includes(q) ||
      item.supervisorName?.toLowerCase().includes(q) ||
      (typeof item.projectId === 'object' && item.projectId?.name?.toLowerCase().includes(q))
    );
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
        this.toastError('Error al cargar la lista de reclutamiento');
        this.loading.set(false);
      },
    });
  }

  getStatusSeverity(status: string): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    switch (status) {
      case 'APROBADO': return 'success';
      case 'PENDIENTE': return 'warn';
      case 'RECHAZADO': return 'danger';
      case 'EN_PROCESO': return 'info';
      default: return 'secondary';
    }
  }

  viewItem(item: RecruitmentRequest) {
    this.router.navigate(['/recruitment', item._id]);
  }

  newItem() {
    this.router.navigate(['/recruitment/new']);
  }

  private toastError(message: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: message });
  }
}
