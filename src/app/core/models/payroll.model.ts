export interface Payroll {
    id: string;
    name: string;
    period: string; // e.g., "2024-01"
    type: 'PLANILLA' | 'RXH';
    totalAmount: number;
    status: 'DRAFT' | 'PROCESSED' | 'PAID';
    createdAt: string;
    details?: PayrollDetail[];
}

export interface PayrollDetail {
    id: string;
    payrollId: string;
    employeeName: string;
    documentType: string; // DNI, CE
    documentNumber: string;
    accountType: 'A' | 'C' | 'M' | 'B'; // Ahorros, Corriente, Maestra, Interbancaria
    accountNumber: string;
    amount: number;
    currency: 'PEN' | 'USD';
    status: 'PENDING' | 'PAID';
    observation?: string;
    proofUrl?: string; // URL of the uploaded proof
}
