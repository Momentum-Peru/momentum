import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Payroll, PayrollDetail } from '../models/payroll.model';
import { environment } from '../../../environments/environment';

interface BackendPayroll {
  _id: string;
  startDate: string | Date;
  endDate: string | Date;
  totalToPay: number;
  paymentProof?: string;
  status: string;
  comments?: string;
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

  createPayroll(payrollData: Omit<Payroll, 'id' | 'createdAt' | 'status'>): Observable<Payroll> {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const createPayrollDto = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalToPay: payrollData.totalAmount || 0,
      status: 'DRAFT',
      comments: payrollData.name || `Planilla ${payrollData.type}`,
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
        // Extract ID - handle different serialization formats
        let payrollId = '';
        if (createdPayroll._id) {
          if (typeof createdPayroll._id === 'string') {
            payrollId = createdPayroll._id;
          } else if (typeof createdPayroll._id === 'object' && createdPayroll._id !== null) {
            // Handle ObjectId object serialization
            payrollId =
              (createdPayroll._id as { toString?: () => string; $oid?: string }).toString?.() ||
              (createdPayroll._id as { $oid?: string }).$oid ||
              String(createdPayroll._id);
          } else {
            payrollId = String(createdPayroll._id);
          }
        }

        if (
          !payrollId ||
          payrollId === 'undefined' ||
          payrollId === 'null' ||
          payrollId.length < 24
        ) {
          console.error('Respuesta del backend completa:', JSON.stringify(createdPayroll, null, 2));
          console.error('ID extraído:', payrollId);
          return throwError(
            () =>
              new Error(
                'No se pudo obtener el ID de la planilla creada. Ver consola para más detalles.'
              )
          );
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
            }),
            catchError((error) => {
              console.error('Error al importar planilla:', error);
              console.error('ID usado:', payrollId);
              return throwError(() => error);
            })
          );
      }),
      catchError((error) => {
        console.error('Error al crear planilla:', error);
        return throwError(() => error);
      })
    );
  }

  updatePayrollDetail(
    detailId: string,
    updates: Partial<PayrollDetail>
  ): Observable<PayrollDetail> {
    // Map frontend updates to backend format
    const backendUpdates: Partial<BackendPayrollDetail> = {};

    if (updates.amount !== undefined) {
      backendUpdates.totalToPay = updates.amount;
    }
    if (updates.observation !== undefined) {
      backendUpdates.comments = updates.observation;
    }
    if (updates.proofUrl !== undefined) {
      backendUpdates.paymentProof = updates.proofUrl;
    }

    return this.http
      .put<BackendPayrollDetail>(`${this.apiUrl}/payrolls/details/${detailId}`, backendUpdates)
      .pipe(map((detail) => this.transformDetailResponse(detail)));
  }

  deletePayroll(id: string): Observable<boolean> {
    return this.http.delete(`${this.apiUrl}/payrolls/${id}`).pipe(map(() => true));
  }

  downloadTemplate(type: 'PLANILLA' | 'RXH'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/payrolls/template?type=${type}`, {
      responseType: 'blob',
    });
  }

  private transformPayrollResponse(backendPayroll: BackendPayroll): Payroll {
    // Get contract type from first detail if available, otherwise default to PLANILLA
    const contractType = backendPayroll.details?.[0]?.contractType || 'PLANILLA';
    const startDate = new Date(backendPayroll.startDate);
    const period = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(
      2,
      '0'
    )}`;

    return {
      id: backendPayroll._id,
      name: backendPayroll.comments || `Planilla ${period}`,
      period: period,
      type: contractType as 'PLANILLA' | 'RXH',
      totalAmount: backendPayroll.totalToPay || 0,
      status: this.mapStatus(backendPayroll.status),
      createdAt: backendPayroll.createdAt
        ? new Date(backendPayroll.createdAt).toISOString()
        : new Date().toISOString(),
      details: backendPayroll.details?.map((d) => this.transformDetailResponse(d)) || [],
    };
  }

  private transformDetailResponse(backendDetail: BackendPayrollDetail): PayrollDetail {
    const payrollId =
      typeof backendDetail.payrollId === 'string'
        ? backendDetail.payrollId
        : (backendDetail.payrollId as { _id: string })?._id || '';

    return {
      id: backendDetail._id,
      payrollId: payrollId,
      employeeName: `${backendDetail.firstName} ${backendDetail.lastName}`,
      documentType: 'DNI', // Default, could be extracted from employee if needed
      documentNumber: backendDetail.dni,
      accountType: 'A', // Default, not in backend schema
      accountNumber: '', // Not in backend schema
      amount: backendDetail.totalToPay || 0,
      currency: 'PEN', // Default
      status: 'PENDING', // Default
      observation: backendDetail.comments,
      proofUrl: backendDetail.paymentProof,
    };
  }

  private mapStatus(backendStatus: string): 'DRAFT' | 'PROCESSED' | 'PAID' {
    switch (backendStatus) {
      case 'DRAFT':
        return 'DRAFT';
      case 'APPROVED':
        return 'PROCESSED';
      case 'PAID':
        return 'PAID';
      default:
        return 'DRAFT';
    }
  }
}
