import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { Project3dPlansApiService } from '../../shared/services/project-3d-plans-api.service';
import { ProjectsApiService } from '../../shared/services/projects-api.service';
import { PresignedUploadService } from '../../shared/services/presigned-upload.service';
import { AuthService } from '../login/services/auth.service';
import { Project } from '../../shared/interfaces/project.interface';
import { Project3dPlanSummary } from '../../shared/interfaces/project-3d-plan.interface';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-sales-3d-modeling-list',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    CardModule,
    DialogModule,
    SelectModule,
    ToastModule,
    ProgressSpinnerModule,
  ],
  providers: [MessageService],
  templateUrl: './sales-3d-modeling-list.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sales3dModelingListPage implements OnInit {
  private readonly api = inject(Project3dPlansApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly presignedUpload = inject(PresignedUploadService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  summaries = signal<Project3dPlanSummary[]>([]);
  allProjects = signal<Project[]>([]);

  projectSelectOptions = computed(() =>
    this.allProjects()
      .filter((p) => p._id)
      .map((p) => ({
        label: `${p.name} (${p.code})`,
        value: p._id as string,
      })),
  );
  loading = signal(true);
  uploadDialog = signal(false);
  uploadProjectId = signal<string | null>(null);
  uploading = signal(false);
  selectedFiles: File[] = [];

  ngOnInit(): void {
    this.load();
    this.projectsApi.listActive().subscribe({
      next: (p) => this.allProjects.set(p ?? []),
      error: () => this.allProjects.set([]),
    });
  }

  load(): void {
    this.loading.set(true);
    this.api.listProjectSummaries().subscribe({
      next: (rows) => {
        this.summaries.set(rows ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los proyectos con planos 3D',
        });
        this.loading.set(false);
      },
    });
  }

  openUpload(): void {
    this.uploadProjectId.set(null);
    this.selectedFiles = [];
    this.uploadDialog.set(true);
  }

  closeUpload(): void {
    this.uploadDialog.set(false);
    this.selectedFiles = [];
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFiles = input.files ? Array.from(input.files) : [];
  }

  async submitUpload(): Promise<void> {
    const projectId = this.uploadProjectId();
    if (!projectId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Proyecto',
        detail: 'Selecciona un centro de costo (proyecto)',
      });
      return;
    }
    if (this.selectedFiles.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Archivos',
        detail: 'Elige uno o más archivos',
      });
      return;
    }
    const userId = this.auth.getCurrentUser()?.id;
    if (!userId) {
      this.messageService.add({ severity: 'error', summary: 'Sesión', detail: 'Vuelve a iniciar sesión' });
      return;
    }

    this.uploading.set(true);
    try {
      const specs = this.selectedFiles.map((f) => ({
        fileName: f.name,
        contentType: f.type?.trim() ? f.type : 'application/octet-stream',
      }));
      const presigned = await firstValueFrom(this.api.presignedUrls(projectId, specs));
      for (let i = 0; i < this.selectedFiles.length; i++) {
        const file = this.selectedFiles[i];
        const pr = presigned[i];
        const ct = file.type?.trim() ? file.type : 'application/octet-stream';
        await this.presignedUpload.uploadFileToS3(pr.presignedUrl, file, ct);
      }
      const attachments = this.selectedFiles.map((f, i) => ({
        publicUrl: presigned[i].publicUrl,
        key: presigned[i].key,
        originalName: f.name,
        mimeType: f.type?.trim() ? f.type : 'application/octet-stream',
        size: f.size,
      }));
      await firstValueFrom(this.api.confirm(projectId, attachments));
      this.messageService.add({
        severity: 'success',
        summary: 'Listo',
        detail: 'Archivos subidos correctamente',
      });
      this.closeUpload();
      this.load();
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo completar la subida',
      });
    } finally {
      this.uploading.set(false);
    }
  }

  goProject(id: string): void {
    void this.router.navigate(['/sales', 'modelado-3d', id]);
  }
}
