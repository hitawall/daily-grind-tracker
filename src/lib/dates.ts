const TZ = 'Asia/Kolkata'

/** Current time as a Date object whose local fields reflect IST. */
export function nowIST(): Date {
  // Use Intl to get IST date parts, then construct a local Date from them
  // so .getHours() / .getMinutes() etc. return IST values.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0'
  return new Date(
    +get('year'), +get('month') - 1, +get('day'),
    +get('hour'), +get('minute'), +get('second')
  )
}

export function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Today's date in IST, as YYYY-MM-DD. */
export function today(): string {
  return toDateString(nowIST())
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

/** Format minutes as "X hrs Y mins". */
export function formatMinutes(mins: number): string {
  if (mins <= 0) return '0 mins'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} min${m !== 1 ? 's' : ''}`
  if (m === 0) return `${h} hr${h !== 1 ? 's' : ''}`
  return `${h} hr${h !== 1 ? 's' : ''} ${m} min${m !== 1 ? 's' : ''}`
}
