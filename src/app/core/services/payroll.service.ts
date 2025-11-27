import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { Payroll, PayrollDetail } from '../models/payroll.model';
import { environment } from '../../../environments/environment';

interface BackendPayroll {
  _id: string;
  tenantId: string;
  startDate: string | Date;
  endDate: string | Date;
  totalToPay: number;
  paymentProof?: string;
  status: string;
  comments?: string;
  editedBy?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  details?: BackendPayrollDetail[];
}

interface BackendPayrollDetail {
  _id: string;
  payrollId: string | { _id: string };
  employeeId: string | { _id: string };
  firstName: string;
  lastName: string;
  dni: string;
  contractType: string;
  startDate: string | Date;
  endDate: string | Date;
  workedHours: number;
  absences: number;
  discounts: number;
  bonuses: number;
  totalIncome: number;
  totalToPay: number;
  comments?: string;
  paymentProof?: string;
  retention?: number;
  pensionSystem?: string;
  pensionContribution?: number;
  essaludContribution?: number;
  
  // New fields
  cargo?: string;
  workedDays?: number;
  basicSalary?: number;
  overtime?: number;
  totalIncomeTaxable?: number;
  totalIncomeNonTaxable?: number;
  pensionFund?: number;
  pensionInsurance?: number;
  pensionCommission?: number;
  fifthCategoryTax?: number;
  firstCategoryTax?: number;
}

@Injectable({
  providedIn: 'root',
})
export class PayrollService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getPayrolls(): Observable<Payroll[]> {
    return this.http
      .get<BackendPayroll[]>(`${this.apiUrl}/payrolls`)
      .pipe(map((payrolls) => payrolls.map((p) => this.transformPayrollResponse(p))));
  }

  getPayrollById(id: string): Observable<Payroll | undefined> {
    return this.http.get<BackendPayroll>(`${this.apiUrl}/payrolls/${id}`).pipe(
      switchMap((payroll) => {
        // Get details separately
        return this.http.get<BackendPayrollDetail[]>(`${this.apiUrl}/payrolls/${id}/details`).pipe(
          map((details) => {
            payroll.details = details;
            return this.transformPayrollResponse(payroll);
          })
        );
      })
    );
  }

  createPayroll(payrollData: Partial<Payroll>): Observable<Payroll> {
    const today = new Date();
    const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const defaultEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const createPayrollDto = {
      startDate: payrollData.startDate || defaultStartDate.toISOString().split('T')[0],
      endDate: payrollData.endDate || defaultEndDate.toISOString().split('T')[0],
      totalToPay: payrollData.totalToPay || 0,
      status: 'DRAFT',
      comments: payrollData.comments || `Planilla ${payrollData.type || ''}`,
    };

    return this.http
      .post<BackendPayroll>(`${this.apiUrl}/payrolls`, createPayrollDto)
      .pipe(map((payroll) => this.transformPayrollResponse(payroll)));
  }

  uploadPayrollExcel(file: File, type: 'PLANILLA' | 'RXH'): Observable<Payroll> {
    // Step 1: Create payroll with initial data
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const createPayrollDto = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalToPay: 0, // Will be updated after import
      status: 'DRAFT',
      comments: `Planilla ${type} - ${file.name.replace('.xlsx', '').replace('.xls', '')}`,
    };

    return this.http.post<BackendPayroll>(`${this.apiUrl}/payrolls`, createPayrollDto).pipe(
      switchMap((createdPayroll) => {
        // Extract ID
        let payrollId = '';
        if (createdPayroll._id) {
            payrollId = String(createdPayroll._id);
        }

        if (!payrollId) {
          return throwError(() => new Error('No se pudo obtener el ID de la planilla creada.'));
        }

        console.log('Planilla creada con ID:', payrollId);

        // Step 2: Import Excel file
        const formData = new FormData();
        formData.append('file', file);

        return this.http
          .post<{ count: number; errors: string[] }>(
            `${this.apiUrl}/payrolls/${payrollId}/import`,
            formData
          )
          .pipe(
            switchMap(() => {
              // Step 3: Get updated payroll
              return this.http.get<BackendPayroll>(`${this.apiUrl}/payrolls/${payrollId}`);
            }),
            switchMap((payroll) => {
              // Step 4: Get details
              return this.http
                .get<BackendPayrollDetail[]>(`${this.apiUrl}/payrolls/${payrollId}/details`)
                .pipe(
                  map((details) => {
                    payroll.details = details;
                    return this.transformPayrollResponse(payroll);
                  })
                );
            })
          );
      })
    );
  }

  updatePayrollDetail(
    detailId: string,
    updates: Partial<PayrollDetail>
  ): Observable<PayrollDetail> {
    // Map frontend updates to backend format
    // We can pass the updates directly since we aligned the interface, 
    // but need to ensure we don't send read-only or mismatched fields if any.
    // The API accepts JSON with the fields.
    
    // For safety, we can clone and clean, or just pass 'updates' if it matches BackendPayrollDetail keys.
    // The key 'amount' from old interface maps to 'totalToPay' or 'totalIncome'?
    // In the model we removed 'amount'. So 'updates' should use 'totalToPay'.
    
    return this.http
      .put<BackendPayrollDetail>(`${this.apiUrl}/payrolls/details/${detailId}`, updates)
      .pipe(map((detail) => this.transformDetailResponse(detail)));
  }

  updatePayroll(id: string, updates: Partial<Payroll>): Observable<Payroll> {
    return this.http
      .put<BackendPayroll>(`${this.apiUrl}/payrolls/${id}`, updates)
      .pipe(map((payroll) => this.transformPayrollResponse(payroll)));
  }

  deletePayroll(id: string): Observable<boolean> {
    return this.http.delete(`${this.apiUrl}/payrolls/${id}`).pipe(map(() => true));
  }

  private transformPayrollResponse(backendPayroll: BackendPayroll): Payroll {
    const contractType = backendPayroll.details?.[0]?.contractType || 'PLANILLA';
    const startDate = new Date(backendPayroll.startDate);
    const period = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;

    return {
      id: backendPayroll._id,
      tenantId: backendPayroll.tenantId,
      startDate: typeof backendPayroll.startDate === 'string' ? backendPayroll.startDate : backendPayroll.startDate.toISOString(),
      endDate: typeof backendPayroll.endDate === 'string' ? backendPayroll.endDate : backendPayroll.endDate.toISOString(),
      totalToPay: backendPayroll.totalToPay,
      paymentProof: backendPayroll.paymentProof,
      status: this.mapStatus(backendPayroll.status),
      comments: backendPayroll.comments,
      editedBy: backendPayroll.editedBy,
      createdAt: backendPayroll.createdAt instanceof Date ? backendPayroll.createdAt.toISOString() : backendPayroll.createdAt,
      updatedAt: backendPayroll.updatedAt instanceof Date ? backendPayroll.updatedAt.toISOString() : backendPayroll.updatedAt,
      details: backendPayroll.details?.map((d) => this.transformDetailResponse(d)) || [],
      
      // Frontend derived
      name: backendPayroll.comments || `Planilla ${period}`,
      period: period,
      type: contractType as 'PLANILLA' | 'RXH',
    };
  }

  private transformDetailResponse(backendDetail: BackendPayrollDetail): PayrollDetail {
    const payrollId = typeof backendDetail.payrollId === 'string'
        ? backendDetail.payrollId
        : (backendDetail.payrollId as { _id: string })?._id || '';
    
    const employeeId = typeof backendDetail.employeeId === 'string'
        ? backendDetail.employeeId
        : (backendDetail.employeeId as { _id: string })?._id || '';

    return {
      id: backendDetail._id,
      payrollId,
      employeeId,
      firstName: backendDetail.firstName,
      lastName: backendDetail.lastName,
      dni: backendDetail.dni,
      contractType: backendDetail.contractType as 'PLANILLA' | 'RXH',
      startDate: backendDetail.startDate as string,
      endDate: backendDetail.endDate as string,
      workedHours: backendDetail.workedHours,
      absences: backendDetail.absences,
      discounts: backendDetail.discounts,
      bonuses: backendDetail.bonuses,
      totalIncome: backendDetail.totalIncome,
      totalToPay: backendDetail.totalToPay,
      comments: backendDetail.comments,
      paymentProof: backendDetail.paymentProof,
      retention: backendDetail.retention,
      pensionSystem: backendDetail.pensionSystem,
      pensionContribution: backendDetail.pensionContribution,
      essaludContribution: backendDetail.essaludContribution,
      cargo: backendDetail.cargo,
      workedDays: backendDetail.workedDays,
      basicSalary: backendDetail.basicSalary,
      overtime: backendDetail.overtime,
      totalIncomeTaxable: backendDetail.totalIncomeTaxable,
      totalIncomeNonTaxable: backendDetail.totalIncomeNonTaxable,
      pensionFund: backendDetail.pensionFund,
      pensionInsurance: backendDetail.pensionInsurance,
      pensionCommission: backendDetail.pensionCommission,
      fifthCategoryTax: backendDetail.fifthCategoryTax,
      firstCategoryTax: backendDetail.firstCategoryTax,

      // Mapped fields
      employeeName: `${backendDetail.firstName} ${backendDetail.lastName}`,
      documentType: 'DNI', // Default
      accountType: 'A', // Mock
      accountNumber: '', // Mock
    };
  }

  private mapStatus(backendStatus: string): 'DRAFT' | 'PROCESSED' | 'PAID' | 'APPROVED' {
    switch (backendStatus) {
      case 'DRAFT': return 'DRAFT';
      case 'APPROVED': return 'APPROVED';
      case 'PAID': return 'PAID';
      default: return 'DRAFT';
    }
  }
}
