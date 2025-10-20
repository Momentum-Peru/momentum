import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExpenseCategory, CategoryOption } from '../interfaces/category.interface';

@Injectable({
    providedIn: 'root'
})
export class ExpenseCategoriesApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl;

    list(): Observable<ExpenseCategory[]> {
        return this.http.get<ExpenseCategory[]>(`${this.baseUrl}/expense-categories`);
    }

    listActive(): Observable<ExpenseCategory[]> {
        return this.http.get<ExpenseCategory[]>(`${this.baseUrl}/expense-categories/active`);
    }

    getOptions(): Observable<CategoryOption[]> {
        return this.http.get<CategoryOption[]>(`${this.baseUrl}/expense-categories/options`);
    }

    getById(id: string): Observable<ExpenseCategory> {
        return this.http.get<ExpenseCategory>(`${this.baseUrl}/expense-categories/${id}`);
    }

    getByCode(code: string): Observable<ExpenseCategory> {
        return this.http.get<ExpenseCategory>(`${this.baseUrl}/expense-categories/code/${code}`);
    }

    create(category: ExpenseCategory): Observable<ExpenseCategory> {
        return this.http.post<ExpenseCategory>(`${this.baseUrl}/expense-categories`, category);
    }

    update(id: string, category: Partial<ExpenseCategory>): Observable<ExpenseCategory> {
        return this.http.patch<ExpenseCategory>(`${this.baseUrl}/expense-categories/${id}`, category);
    }

    toggleActive(id: string): Observable<ExpenseCategory> {
        return this.http.patch<ExpenseCategory>(`${this.baseUrl}/expense-categories/${id}/toggle-active`, {});
    }

    delete(id: string): Observable<{ deleted: boolean }> {
        return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/expense-categories/${id}`);
    }
}