/**
 * Construye la URL wa.me a partir de un teléfono en cualquier formato común.
 * Prioriza Perú (+51): si hay 9 dígitos sin prefijo, se antepone 51.
 */
export function buildWhatsAppUrl(raw: string | undefined | null): string | null {
  const digits = normalizePhoneDigits(raw);
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

export function normalizePhoneDigits(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length < 8) return null;
  if (d.startsWith('51')) return d;
  if (d.length === 9) return `51${d}`;
  if (d.length === 10 && d.startsWith('0')) return `51${d.slice(1)}`;
  if (d.length >= 10 && d.length <= 15) return d;
  if (d.length === 8) return `51${d}`;
  return d.length >= 9 ? `51${d}` : null;
}
