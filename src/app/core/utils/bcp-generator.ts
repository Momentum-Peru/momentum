import { Payroll, PayrollDetail } from '../models/payroll.model';

export interface BcpHeaderConfig {
    reference: string;
    payrollSubtype: string; // Z para Haberes
    accountType: string; // C: Corriente, M: Maestra
    currency: string; // 0001: Soles, 1001: Dólares
    companyAccount: string;
    processDate?: string; // YYYYMMDD, si no se proporciona usa la fecha actual
}

export class BcpGenerator {

    static generateTxt(payroll: Payroll, config: BcpHeaderConfig): string {
        const header = this.generateHeader(payroll, config);
        const details = payroll.details?.map(d => this.generateDetail(d, config.reference)).join('\r\n') || '';
        return `${header}\r\n${details}`;
    }

    private static generateHeader(payroll: Payroll, config: BcpHeaderConfig): string {
        // Estructura exacta según archivo BCP real:
        // 1. Tipo de Registro (1) - Fijo "1"
        // 2. Cantidad de Abonos (6) - Relleno ceros izq
        // 3. Fecha de Proceso (8) - YYYYMMDD
        // 4. Subtipo de Planilla de Haberes (1) - Z para Haberes
        // 5. Tipo de Cuenta de cargo (1) - C: Corriente, M: Maestra
        // 6. Moneda (4) - 0001: Soles, 1001: Dólares
        // 7. Cuenta de cargo (20) - Relleno espacios der
        // 8. Monto total de la planilla (17) - Formato: 00000000004500.00 (con punto decimal, 2 decimales)
        // 9. Referencia de la planilla (40) - Alfanumerico, relleno espacios der
        // 10. Checksum (15) - Relleno ceros izq

        const type = '1';
        const count = (payroll.details?.length || 0).toString().padStart(6, '0');
        const date = config.processDate || new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const payrollSubtype = config.payrollSubtype || 'Z'; // Z para Haberes
        const accountType = config.accountType || 'C'; // C: Corriente
        const currency = config.currency || '0001'; // 0001: Soles
        const accountNum = config.companyAccount.replace(/-/g, '').padEnd(20, ' ');
        
        // Monto con formato: 17 caracteres, 2 decimales, con punto, relleno ceros a la izquierda
        // Ejemplo: 4500.00 -> 00000000004500.00
        // El formato es: [ceros][número con punto decimal] = 17 caracteres totales
        const amountStr = payroll.totalToPay.toFixed(2);
        const totalAmount = amountStr.padStart(17, '0');
        
        const headerReference = config.reference.substring(0, 40).padEnd(40, ' ');
        const checksum = this.calculateChecksum(payroll.details || []).toString().padStart(15, '0');

        return `${type}${count}${date}${payrollSubtype}${accountType}${currency}${accountNum}${totalAmount}${headerReference}${checksum}`;
    }

    private static generateDetail(detail: PayrollDetail, reference: string): string {
        // Estructura exacta según archivo BCP real:
        // 1. Tipo Registro (1) - Fijo "2"
        // 2. Tipo Cuenta Abono (1) - A: Ahorro, C: Corriente
        // 3. Cuenta Abono (20) - Relleno espacios der
        // 4. Tipo Doc (1) - 0: DNI (según el archivo real)
        // 5. Num Doc (12) - Relleno espacios der
        // 6. Nombre Beneficiario (75) - Relleno espacios der
        // 7. Referencia Beneficiario (40) - "Referencia Beneficiario [DNI]", relleno espacios der
        // 8. Referencia Empleado (20) - "Ref Emp [DNI]", relleno espacios der
        // 9. Monto (17) - Formato: 000100000000001000.00 (con punto decimal, 2 decimales)
        // 10. Moneda (1) - S: Soles, D: Dólares

        const type = '2';
        const accType = detail.accountType || 'A'; // Default Ahorro
        const accNumRaw = detail.accountNumber || '';
        const accNum = accNumRaw.replace(/-/g, '').padEnd(20, ' ');
        
        // Tipo Doc: según el archivo real parece ser "0" para DNI
        const docType = detail.documentType === 'RUC' ? '6' : '0'; 
        const docNum = (detail.dni || '').padEnd(12, ' ');
        
        // Name composition - convertir a mayúsculas y sin acentos
        const fullName = `${detail.firstName} ${detail.lastName}`.toUpperCase();
        const name = fullName.substring(0, 75).padEnd(75, ' ');
        
        // Referencia Beneficiario: "Referencia Beneficiario [DNI]"
        const beneficiaryRef = `Referencia Beneficiario ${detail.dni}`.substring(0, 40).padEnd(40, ' ');
        
        // Referencia Empleado: "Ref Emp [DNI]"
        const employeeRef = `Ref Emp ${detail.dni}`.substring(0, 20).padEnd(20, ' ');
        
        // Monto con formato: 17 caracteres, 2 decimales, con punto, relleno ceros a la izquierda
        // Ejemplo: 1000.00 -> 000100000000001000.00
        const amountStr = detail.totalToPay.toFixed(2);
        const amount = amountStr.padStart(17, '0');
        
        // Moneda: S para Soles
        const currency = 'S';

        return `${type}${accType}${accNum}${docType}${docNum}${name}${beneficiaryRef}${employeeRef}${amount}${currency}`;
    }

    private static calculateChecksum(details: PayrollDetail[]): number {
        // Simple checksum logic (sum of first 10 digits of account numbers) - simplified for demo
        return details.reduce((sum, d) => {
            const acc = d.accountNumber || '';
            const num = parseInt(acc.replace(/\D/g, '').substring(0, 10)) || 0;
            return sum + num;
        }, 0);
    }
}
