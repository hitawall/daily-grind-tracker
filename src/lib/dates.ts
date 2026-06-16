export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function today(): string {
  return toDateString(new Date())
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
