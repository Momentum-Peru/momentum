import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate',
  standalone: true,
})
export class TruncatePipe implements PipeTransform {
  /**
   * Trunca un texto a una longitud máxima y agrega puntos suspensivos
   * @param value Texto a truncar
   * @param maxLength Longitud máxima (por defecto 50 caracteres)
   * @returns Texto truncado con "..." si excede la longitud
   */
  transform(value: string | null | undefined, maxLength = 50): string {
    if (!value) return '';
    if (value.length <= maxLength) return value;
    return value.substring(0, maxLength) + '...';
  }
}
