import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Project3dPlanConfirmAttachment,
  Project3dPlanFile,
  Project3dPlanPresignedFileSpec,
  Project3dPlanPresignedResponse,
  Project3dPlanSummary,
} from '../interfaces/project-3d-plan.interface';

@Injectable({ providedIn: 'root' })
export class Project3dPlansApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/projects/3d-plans`;

  listProjectSummaries(): Observable<Project3dPlanSummary[]> {
    return this.http.get<Project3dPlanSummary[]>(`${this.base}/summary`);
  }

  listByProject(projectId: string): Observable<Project3dPlanFile[]> {
    return this.http.get<Project3dPlanFile[]>(`${this.base}/project/${projectId}`);
  }

  presignedUrls(
    projectId: string,
    files: Project3dPlanPresignedFileSpec[],
    expirationTime = 300,
  ): Observable<Project3dPlanPresignedResponse[]> {
    return this.http.post<Project3dPlanPresignedResponse[]>(`${this.base}/presigned-urls`, {
      projectId,
      files,
      expirationTime,
    });
  }

  confirm(projectId: string, attachments: Project3dPlanConfirmAttachment[]): Observable<Project3dPlanFile[]> {
    return this.http.post<Project3dPlanFile[]>(`${this.base}/confirm`, {
      projectId,
      attachments,
    });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
