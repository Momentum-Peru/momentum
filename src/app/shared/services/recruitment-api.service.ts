import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export enum RecruitmentRequestStatus {
  PENDING = 'PENDIENTE',
  APPROVED = 'APROBADO',
  REJECTED = 'RECHAZADO',
  IN_PROGRESS = 'EN_PROCESO',
}

export interface RecruitmentRequest {
  _id?: string;
  projectId: string | any;
  requestNumber?: string;
  requestDate: string | Date;
  supervisorName: string;
  jobTitle: string;
  quantity: number;
  startDate: string | Date;
  proposedSalary?: number;
  workLocation?: string;
  businessJustification?: string;
  ppeRequirements: string[];
  ipercLinks?: string;
  status: RecruitmentRequestStatus;
  createdBy?: any;
  createdAt?: string | Date;
}

@Injectable({
  providedIn: 'root',
})
export class RecruitmentApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/recruitment`;

  list(params?: any): Observable<RecruitmentRequest[]> {
    return this.http.get<RecruitmentRequest[]>(this.apiUrl, { params });
  }

  get(id: string): Observable<RecruitmentRequest> {
    return this.http.get<RecruitmentRequest>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<RecruitmentRequest>): Observable<RecruitmentRequest> {
    return this.http.post<RecruitmentRequest>(this.apiUrl, data);
  }

  update(id: string, data: Partial<RecruitmentRequest>): Observable<RecruitmentRequest> {
    return this.http.patch<RecruitmentRequest>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
