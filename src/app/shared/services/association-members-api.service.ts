import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AssociationMember,
  AssociationMemberQueryParams,
  CreatePublicAssociationMemberRequest,
  UpdateAssociationMemberRequest,
} from '../interfaces/association-member.interface';

@Injectable({ providedIn: 'root' })
export class AssociationMembersApiService {
  private readonly http = inject(HttpClient);
  private readonly publicUrl = `${environment.apiUrl}/public/association-members`;
  private readonly crmUrl = `${environment.apiUrl}/crm/association-members`;

  createPublic(body: CreatePublicAssociationMemberRequest): Observable<AssociationMember> {
    return this.http.post<AssociationMember>(this.publicUrl, body);
  }

  list(params?: AssociationMemberQueryParams): Observable<AssociationMember[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.append(key, value.toString());
        }
      });
    }
    return this.http.get<AssociationMember[]>(this.crmUrl, { params: httpParams });
  }

  update(id: string, body: UpdateAssociationMemberRequest): Observable<AssociationMember> {
    return this.http.patch<AssociationMember>(`${this.crmUrl}/${id}`, body);
  }

  remove(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.crmUrl}/${id}`);
  }
}
