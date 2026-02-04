/**
 * Constantes de bancos peruanos
 * Incluye nombre del banco y código bancario estándar
 */
export interface BankOption {
  label: string;
  value: string;
  code: string;
}

export const BANKS: BankOption[] = [
  { label: 'Banco de la Nación', value: 'Banco de la Nación', code: '018' },
  { label: 'BBVA', value: 'BBVA', code: '011' },
  { label: 'BCP', value: 'BCP', code: '002' },
  { label: 'Interbank', value: 'Interbank', code: '003' },
  { label: 'Scotiabank', value: 'Scotiabank', code: '009' },
  { label: 'Banco Interamericano de Finanzas', value: 'Banco Interamericano de Finanzas', code: '038' },
  { label: 'Banco Pichincha', value: 'Banco Pichincha', code: '035' },
  { label: 'Banco Ripley', value: 'Banco Ripley', code: '043' },
  { label: 'Banco Falabella', value: 'Banco Falabella', code: '044' },
  { label: 'Banco GNB', value: 'Banco GNB', code: '039' },
  { label: 'Banco Santander', value: 'Banco Santander', code: '040' },
  { label: 'Banco de Comercio', value: 'Banco de Comercio', code: '023' },
];

/**
 * Obtiene el código de banco por su nombre
 */
export function getBankCode(bankName: string | undefined): string | undefined {
  if (!bankName) return undefined;
  const bank = BANKS.find((b) => b.value === bankName);
  return bank?.code;
}

/**
 * Obtiene el nombre del banco por su código
 */
export function getBankName(bankCode: string | undefined): string | undefined {
  if (!bankCode) return undefined;
  const bank = BANKS.find((b) => b.code === bankCode);
  return bank?.value;
}

