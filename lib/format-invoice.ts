/**
 * Formate un nombre en devise euro : 3000 → "€3,000.00"
 */
export function formatEuro(n: number): string {
  return '€' + n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Calcule la date d'échéance à partir d'une date de facture et d'un nombre de jours.
 * @param invoiceDate - ex: "23 December 2025"
 * @param netDays - ex: 30
 * @returns ex: "22 January 2026"
 */
export function calculateDueDate(invoiceDate: string, netDays: number): string {
  const date = new Date(invoiceDate)
  date.setDate(date.getDate() + netDays)

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()

  return `${day} ${month} ${year}`
}
