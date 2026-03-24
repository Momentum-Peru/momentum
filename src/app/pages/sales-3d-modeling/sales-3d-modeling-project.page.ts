import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Project3dPlansApiService } from '../../shared/services/project-3d-plans-api.service';
import { ProjectsApiService } from '../../shared/services/projects-api.service';
import { PresignedUploadService } from '../../shared/services/presigned-upload.service';
import { AuthService } from '../login/services/auth.service';
import { Project } from '../../shared/interfaces/project.interface';
import { Project3dPlanFile } from '../../shared/interfaces/project-3d-plan.interface';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-sales-3d-modeling-project',
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    CardModule,
    ToastModule,
    ProgressSpinnerModule,
    ConfirmDialogModule,
    TooltipModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './sales-3d-modeling-project.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sales3dModelingProjectPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(Project3dPlansApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly presignedUpload = inject(PresignedUploadService);
  private readonly auth = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  projectId = signal<string | null>(null);
  project = signal<Project | null>(null);
  files = signal<Project3dPlanFile[]>([]);
  loading = signal(true);
  uploading = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('projectId');
    if (!id) {
      void this.router.navigate(['/sales', 'modelado-3d']);
      return;
    }
    this.projectId.set(id);
    this.loadProject(id);
    this.loadFiles(id);
  }

  private loadProject(id: string): void {
    this.projectsApi.getById(id).subscribe({
      next: (p) => this.project.set(p),
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Proyecto',
          detail: 'No se encontró el centro de costo',
        });
        void this.router.navigate(['/sales', 'modelado-3d']);
      },
    });
  }

  loadFiles(id: string): void {
    this.loading.set(true);
    this.api.listByProject(id).subscribe({
      next: (rows) => {
        this.files.set(rows ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los archivos',
        });
        this.loading.set(false);
      },
    });
  }

  back(): void {
    void this.router.navigate(['/sales', 'modelado-3d']);
  }

  formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  async onMoreFiles(event: Event): Promise<void> {
    const id = this.projectId();
    if (!id) return;
    const input = event.target as HTMLInputElement;
    const list = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (list.length === 0) return;
    const userId = this.auth.getCurrentUser()?.id;
    if (!userId) {
      this.messageService.add({ severity: 'error', summary: 'Sesión', detail: 'Vuelve a iniciar sesión' });
      return;
    }
    this.uploading.set(true);
    try {
      const specs = list.map((f) => ({
        fileName: f.name,
        contentType: f.type?.trim() ? f.type : 'application/octet-stream',
      }));
      const presigned = await firstValueFrom(this.api.presignedUrls(id, specs));
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        const pr = presigned[i];
        const ct = file.type?.trim() ? file.type : 'application/octet-stream';
        await this.presignedUpload.uploadFileToS3(pr.presignedUrl, file, ct);
      }
      const attachments = list.map((f, i) => ({
        publicUrl: presigned[i].publicUrl,
        key: presigned[i].key,
        originalName: f.name,
        mimeType: f.type?.trim() ? f.type : 'application/octet-stream',
        size: f.size,
      }));
      await firstValueFrom(this.api.confirm(id, attachments));
      this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Archivos subidos' });
      this.loadFiles(id);
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Falló la subida' });
    } finally {
      this.uploading.set(false);
    }
  }

  removeFile(f: Project3dPlanFile): void {
    this.confirm.confirm({
      message: `¿Eliminar "${f.originalName}" del registro?`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        const id = this.projectId();
        if (!f._id || !id) return;
        this.api.delete(f._id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'info', summary: 'Eliminado', detail: 'Registro borrado' });
            this.loadFiles(id);
          },
          error: () =>
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' }),
        });
      },
    });
  }
}
