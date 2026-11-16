/**
 * Safe text interpolation helper for Preact JSX.
 * Guarantees that only primitive strings are rendered, preventing object-child crashes.
 */
export function txt(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return '';
  return String(v);
}
