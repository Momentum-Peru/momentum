import { Payroll, PayrollDetail } from '../models/payroll.model';

export class BcpGenerator {

    static generateTxt(payroll: Payroll, companyAccount: string, companyRuc: string): string {
        const header = this.generateHeader(payroll, companyAccount, companyRuc);
        const details = payroll.details?.map(d => this.generateDetail(d)).join('\r\n') || '';
        return `${header}\r\n${details}`;
    }

    private static generateHeader(payroll: Payroll, account: string, ruc: string): string {
        // 1. Tipo de Registro (1) - Fijo "1"
        // 2. Cantidad de Abonos (6) - Relleno ceros izq
        // 3. Fecha de Proceso (8) - YYYYMMDD
        // 4. Tipo Cuenta Cargo (1) - C: Corriente, M: Maestra
        // 5. Moneda (4) - 0001: Soles, 1001: Dolares
        // 6. Cuenta Cargo (20) - Relleno espacios der
        // 7. Total Monto (17) - 2 decimales, sin punto, relleno ceros izq
        // 8. Referencia (40) - Alfanumerico
        // 9. Checksum (15) - Suma de cuentas (opcional en algunos formatos, pondremos ceros si no es estricto, pero calcularemos simple)

        const type = '1';
        const count = (payroll.details?.length || 0).toString().padStart(6, '0');
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const accountType = 'C'; // Asumimos Corriente por defecto
        const currency = '0001'; // Asumimos Soles
        const accountNum = account.padEnd(20, ' ');
        const totalAmount = (payroll.totalAmount * 100).toFixed(0).padStart(17, '0');
        const reference = `PLANILLA ${payroll.period}`.padEnd(40, ' ');
        const checksum = this.calculateChecksum(payroll.details || []).toString().padStart(15, '0');

        return `${type}${count}${date}${accountType}${currency}${accountNum}${totalAmount}${reference}${checksum}`;
    }

    private static generateDetail(detail: PayrollDetail): string {
        // 1. Tipo Registro (1) - Fijo "2"
        // 2. Tipo Cuenta Abono (1) - A: Ahorro, C: Corriente
        // 3. Cuenta Abono (20) - Relleno espacios der
        // 4. Tipo Doc (1) - 1: DNI, 6: RUC
        // 5. Num Doc (12) - Relleno espacios der
        // 6. Nombre Beneficiario (75) - Relleno espacios der
        // 7. Referencia (40) - Relleno espacios der
        // 8. Referencia 2 (20) - Opcional
        // 9. Monto (17) - 2 decimales, sin punto, relleno ceros izq

        const type = '2';
        const accType = detail.accountType; // A, C, M, B
        const accNum = detail.accountNumber.replace(/-/g, '').padEnd(20, ' ');
        const docType = detail.documentType === 'DNI' ? '1' : '6';
        const docNum = detail.documentNumber.padEnd(12, ' ');
        const name = detail.employeeName.substring(0, 75).padEnd(75, ' ');
        const ref = `PAGO ${detail.documentNumber}`.padEnd(40, ' ');
        const ref2 = ''.padEnd(20, ' ');
        const amount = (detail.amount * 100).toFixed(0).padStart(17, '0');

        return `${type}${accType}${accNum}${docType}${docNum}${name}${ref}${ref2}${amount}`;
    }

    private static calculateChecksum(details: PayrollDetail[]): number {
        // Simple checksum logic (sum of first 10 digits of account numbers) - simplified for demo
        return details.reduce((sum, d) => {
            const num = parseInt(d.accountNumber.replace(/\D/g, '').substring(0, 10)) || 0;
            return sum + num;
        }, 0);
    }
}
