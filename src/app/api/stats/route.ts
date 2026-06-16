export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  // All logs ever
  const { data: logs, error: logsError } = await supabase
    .from('daily_logs')
    .select('date, task_id, completed')

  if (logsError) return NextResponse.json({ error: logsError.message }, { status: 500 })

  // All tasks (including inactive ones for historical stats)
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, name, duration_label, active')

  if (tasksError) return NextResponse.json({ error: tasksError.message }, { status: 500 })

  // Group logs by date
  const byDate = new Map<string, { total: number; completed: number }>()
  for (const log of logs ?? []) {
    const entry = byDate.get(log.date) ?? { total: 0, completed: 0 }
    entry.total++
    if (log.completed) entry.completed++
    byDate.set(log.date, entry)
  }

  const dates = [...byDate.keys()].sort()
  const totalDays = dates.length
  const fullyCompleteDays = dates.filter((d) => {
    const e = byDate.get(d)!
    return e.total > 0 && e.completed === e.total
  }).length

  // Streak calculation
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let currentStreak = 0
  let longestStreak = 0
  let streak = 0
  let prev: Date | null = null

  for (const d of [...dates].reverse()) {
    const date = new Date(d + 'T00:00:00')
    const entry = byDate.get(d)!
    const complete = entry.total > 0 && entry.completed === entry.total

    if (!complete) {
      if (streak > longestStreak) longestStreak = streak
      streak = 0
      prev = null
      continue
    }

    if (prev === null) {
      // First complete day from the end: only count if it's today or yesterday
      const diffFromToday = Math.floor((today.getTime() - date.getTime()) / 86400000)
      if (diffFromToday <= 1) {
        streak = 1
        currentStreak = 1
      } else {
        if (streak > longestStreak) longestStreak = streak
        streak = 0
      }
    } else {
      const diff = Math.floor((prev.getTime() - date.getTime()) / 86400000)
      if (diff === 1) {
        streak++
        if (currentStreak > 0) currentStreak = streak
      } else {
        if (streak > longestStreak) longestStreak = streak
        streak = 1
      }
    }
    prev = date
  }
  if (streak > longestStreak) longestStreak = streak

  // Per-task stats
  const taskStats = (tasks ?? []).map((task) => {
    const taskLogs = (logs ?? []).filter((l) => l.task_id === task.id)
    const total = taskLogs.length
    const completed = taskLogs.filter((l) => l.completed).length
    return {
      id: task.id,
      name: task.name,
      duration_label: task.duration_label,
      active: task.active,
      total,
      completed,
      rate: total > 0 ? Math.round((completed / total) * 100) : null,
    }
  })

  return NextResponse.json({
    totalDays,
    fullyCompleteDays,
    completionRate: totalDays > 0 ? Math.round((fullyCompleteDays / totalDays) * 100) : 0,
    currentStreak,
    longestStreak,
    taskStats,
  })
}
