import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Payroll, PayrollDetail } from '../models/payroll.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
    providedIn: 'root'
})
export class PayrollService {
    private readonly STORAGE_KEY = 'payrolls_mock_db';

    constructor() {
        // Initialize mock data if empty
        if (!localStorage.getItem(this.STORAGE_KEY)) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
        }
    }

    private getPayrollsFromStorage(): Payroll[] {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    }

    private savePayrollsToStorage(payrolls: Payroll[]): void {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payrolls));
    }

    getPayrolls(): Observable<Payroll[]> {
        return of(this.getPayrollsFromStorage()).pipe(delay(500));
    }

    getPayrollById(id: string): Observable<Payroll | undefined> {
        const payrolls = this.getPayrollsFromStorage();
        const payroll = payrolls.find(p => p.id === id);
        return of(payroll).pipe(delay(500));
    }

    createPayroll(payrollData: Omit<Payroll, 'id' | 'createdAt' | 'status'>): Observable<Payroll> {
        const payrolls = this.getPayrollsFromStorage();
        const newPayroll: Payroll = {
            ...payrollData,
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            status: 'DRAFT',
            details: []
        };
        payrolls.push(newPayroll);
        this.savePayrollsToStorage(payrolls);
        return of(newPayroll).pipe(delay(800));
    }

    // Mock uploading Excel - in reality this would parse the file
    // For now we will generate dummy details based on the file name or just random
    uploadPayrollExcel(file: File, type: 'PLANILLA' | 'RXH'): Observable<Payroll> {
        // Simulate parsing delay
        const payrolls = this.getPayrollsFromStorage();
        const newPayroll: Payroll = {
            id: uuidv4(),
            name: file.name.replace('.xlsx', '').replace('.xls', ''),
            period: new Date().toISOString().slice(0, 7), // Current YYYY-MM
            type: type,
            totalAmount: 0,
            status: 'DRAFT',
            createdAt: new Date().toISOString(),
            details: this.generateMockDetails(type)
        };

        // Calculate total
        newPayroll.totalAmount = newPayroll.details?.reduce((sum, d) => sum + d.amount, 0) || 0;

        payrolls.push(newPayroll);
        this.savePayrollsToStorage(payrolls);
        return of(newPayroll).pipe(delay(1500));
    }

    updatePayrollDetail(detailId: string, updates: Partial<PayrollDetail>): Observable<PayrollDetail> {
        const payrolls = this.getPayrollsFromStorage();
        let updatedDetail: PayrollDetail | null = null;

        for (const payroll of payrolls) {
            if (payroll.details) {
                const index = payroll.details.findIndex(d => d.id === detailId);
                if (index !== -1) {
                    payroll.details[index] = { ...payroll.details[index], ...updates };
                    updatedDetail = payroll.details[index];

                    // Recalculate total amount of payroll
                    payroll.totalAmount = payroll.details.reduce((sum, d) => sum + d.amount, 0);
                    break;
                }
            }
        }

        if (updatedDetail) {
            this.savePayrollsToStorage(payrolls);
            return of(updatedDetail).pipe(delay(300));
        }
        return throwError(() => new Error('Detail not found'));
    }

    deletePayroll(id: string): Observable<boolean> {
        let payrolls = this.getPayrollsFromStorage();
        const initialLength = payrolls.length;
        payrolls = payrolls.filter(p => p.id !== id);
        this.savePayrollsToStorage(payrolls);
        return of(payrolls.length < initialLength).pipe(delay(500));
    }

    downloadTemplate(type: 'PLANILLA' | 'RXH'): Observable<Blob> {
        // In a real implementation, this would be an HTTP GET to the backend
        // return this.http.get(`${this.apiUrl}/templates/${type}`, { responseType: 'blob' });

        // Mock implementation returning a Blob
        const content = type === 'PLANILLA'
            ? 'DNI,Nombre,Cuenta,Monto\n12345678,Juan Perez,191-12345678,1500'
            : 'RUC,Razon Social,Cuenta,Monto\n10123456789,Consultor SAC,191-87654321,2000';

        const blob = new Blob([content], { type: 'text/csv' });
        return of(blob).pipe(delay(500));
    }

    private generateMockDetails(type: 'PLANILLA' | 'RXH'): PayrollDetail[] {
        const count = Math.floor(Math.random() * 5) + 2; // 2 to 6 employees
        const details: PayrollDetail[] = [];

        for (let i = 0; i < count; i++) {
            details.push({
                id: uuidv4(),
                payrollId: '', // Will be assigned by parent
                employeeName: type === 'PLANILLA' ? `Empleado Planilla ${i + 1}` : `Proveedor RxH ${i + 1}`,
                documentType: 'DNI',
                documentNumber: Math.floor(10000000 + Math.random() * 90000000).toString(),
                accountType: 'A',
                accountNumber: '191-' + Math.floor(10000000 + Math.random() * 90000000).toString(),
                amount: Math.floor(1000 + Math.random() * 2000),
                currency: 'PEN',
                status: 'PENDING'
            });
        }
        return details;
    }
}
