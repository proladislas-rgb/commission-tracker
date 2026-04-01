/**
 * Formate un nombre en devise euro : 3000 → "€3,000.00"
 */
export function formatEuro(n: number): string {
  return '€' + n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
