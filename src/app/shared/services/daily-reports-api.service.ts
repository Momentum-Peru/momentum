import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DailyExpense, Purchase } from '../interfaces/daily-report.interface';

@Injectable({
    providedIn: 'root'
})
export class DailyExpensesApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl;

    list(): Observable<DailyExpense[]> {
        return this.http.get<DailyExpense[]>(`${this.baseUrl}/daily-expenses`);
    }

    getStats(filters?: { userId?: string; projectId?: string; startDate?: string; endDate?: string }): Observable<any> {
        let url = `${this.baseUrl}/daily-expenses/stats`;
        const params = new URLSearchParams();
        if (filters?.userId) params.append('userId', filters.userId);
        if (filters?.projectId) params.append('projectId', filters.projectId);
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (params.toString()) url += `?${params.toString()}`;
        return this.http.get<any>(url);
    }

    listWithFilters(filters?: { userId?: string; projectId?: string; status?: string; startDate?: string; endDate?: string; q?: string }): Observable<DailyExpense[]> {
        let url = `${this.baseUrl}/daily-expenses`;
        const params = new URLSearchParams();
        if (filters?.userId) params.append('userId', filters.userId);
        if (filters?.projectId) params.append('projectId', filters.projectId);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.q) params.append('q', filters.q);
        if (params.toString()) url += `?${params.toString()}`;
        return this.http.get<DailyExpense[]>(url);
    }

    getByUser(userId: string, filters?: { startDate?: string; endDate?: string }): Observable<DailyExpense[]> {
        let url = `${this.baseUrl}/daily-expenses/user/${userId}`;
        const params = new URLSearchParams();
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (params.toString()) url += `?${params.toString()}`;
        return this.http.get<DailyExpense[]>(url);
    }

    getByProject(projectId: string, filters?: { startDate?: string; endDate?: string }): Observable<DailyExpense[]> {
        let url = `${this.baseUrl}/daily-expenses/project/${projectId}`;
        const params = new URLSearchParams();
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (params.toString()) url += `?${params.toString()}`;
        return this.http.get<DailyExpense[]>(url);
    }

    getById(id: string): Observable<DailyExpense> {
        return this.http.get<DailyExpense>(`${this.baseUrl}/daily-expenses/${id}`);
    }

    create(expense: DailyExpense): Observable<DailyExpense> {
        return this.http.post<DailyExpense>(`${this.baseUrl}/daily-expenses`, expense);
    }

    update(id: string, expense: Partial<DailyExpense>): Observable<DailyExpense> {
        return this.http.patch<DailyExpense>(`${this.baseUrl}/daily-expenses/${id}`, expense);
    }

    submit(id: string): Observable<DailyExpense> {
        return this.http.patch<DailyExpense>(`${this.baseUrl}/daily-expenses/${id}/submit`, {});
    }

    approve(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string): Observable<DailyExpense> {
        const payload: any = { status };
        if (rejectionReason) payload.rejectionReason = rejectionReason;
        return this.http.patch<DailyExpense>(`${this.baseUrl}/daily-expenses/${id}/approve`, payload);
    }

    delete(id: string): Observable<{ deleted: boolean }> {
        return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/daily-expenses/${id}`);
    }

    // Helper para calcular el total de compras
    calculateTotal(purchases: Purchase[]): number {
        return purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    }

    /**
     * Subir documento a observación
     */
    uploadObservationDocument(expenseId: string, observationIndex: number, file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);

        return this.http.post(`${this.baseUrl}/daily-expenses/${expenseId}/observations/${observationIndex}/documents`, formData);
    }

    /**
     * Eliminar documento de observación
     */
    deleteObservationDocument(expenseId: string, observationIndex: number, documentUrl: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/daily-expenses/${expenseId}/observations/${observationIndex}/documents`, {
            body: { documentUrl }
        });
    }

    /**
     * Subir documento a compra
     */
    uploadPurchaseDocument(expenseId: string, purchaseIndex: number, file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);

        return this.http.post(`${this.baseUrl}/daily-expenses/${expenseId}/purchases/${purchaseIndex}/documents`, formData);
    }

    /**
     * Eliminar documento de compra
     */
    deletePurchaseDocument(expenseId: string, purchaseIndex: number, documentUrl: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/daily-expenses/${expenseId}/purchases/${purchaseIndex}/documents`, {
            body: { documentUrl }
        });
    }
}