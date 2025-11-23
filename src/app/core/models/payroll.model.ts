export interface Payroll {
    id: string;
    tenantId?: string;
    startDate: string;
    endDate: string;
    totalToPay: number;
    paymentProof?: string;
    status: 'DRAFT' | 'PROCESSED' | 'PAID' | 'APPROVED';
    comments?: string;
    editedBy?: string;
    createdAt: string;
    updatedAt?: string;
    details?: PayrollDetail[];
    
    // Frontend helper properties
    name?: string;
    period?: string; 
    type?: 'PLANILLA' | 'RXH';
}

export interface PayrollDetail {
    id: string;
    payrollId: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    dni: string;
    contractType: 'PLANILLA' | 'RXH';
    startDate: string;
    endDate: string;
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

    // Computed or mapped for frontend compatibility
    employeeName?: string;
    
    // Fields for BCP Generation (might be missing from API currently)
    accountType?: 'A' | 'C' | 'M' | 'B'; 
    accountNumber?: string; 
    documentType?: string;
}
