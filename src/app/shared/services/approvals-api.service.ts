import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApprovalPermission {
    _id?: string;
    tenantId?: string;
    userId: string;
    userName: string;
    permissions: string[];
}

@Injectable({ providedIn: 'root' })
export class ApprovalsApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/approvals`;

    getPermissions(): Observable<ApprovalPermission[]> {
        return this.http.get<ApprovalPermission[]>(`${this.baseUrl}/permissions`);
    }

    setPermissions(data: { userId: string; userName: string; permissions: string[] }): Observable<ApprovalPermission> {
        return this.http.post<ApprovalPermission>(`${this.baseUrl}/permissions`, data);
    }
}
