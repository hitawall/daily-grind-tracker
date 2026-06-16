const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

export function nowIST(): Date {
  const now = new Date()
  return new Date(now.getTime() + IST_OFFSET_MS - now.getTimezoneOffset() * 60000)
}

export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function today(): string {
  // Use IST date so day rolls over at midnight IST
  return toDateString(nowIST())
}

/** Parse a duration label like "1.5 hrs", "20 mins", "2 hrs" into total minutes. */
export function parseDurationMinutes(label: string | null): number {
  if (!label) return 0
  const lower = label.toLowerCase()
  let total = 0
  const hrMatch = lower.match(/([\d.]+)\s*hr/)
  const minMatch = lower.match(/([\d.]+)\s*min/)
  if (hrMatch) total += parseFloat(hrMatch[1]) * 60
  if (minMatch) total += parseFloat(minMatch[1])
  return Math.round(total)
}

/** Format minutes as "Xhr Ymins" or "Ymins". */
export function formatMinutes(mins: number): string {
  if (mins <= 0) return '0 mins'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} mins`
  if (m === 0) return `${h} hr${h !== 1 ? 's' : ''}`
  return `${h} hr${h !== 1 ? 's' : ''} ${m} mins`
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const date = new Date(year, month, 1)
  while (date.getMonth() === month) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}
