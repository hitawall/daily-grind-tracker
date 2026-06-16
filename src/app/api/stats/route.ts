export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getSupabase()

  const { data: logs, error: logsError } = await db
    .from('daily_logs')
    .select('date, task_id, completed')
    .eq('user_id', userId)

  if (logsError) return NextResponse.json({ error: logsError.message }, { status: 500 })

  const { data: tasks, error: tasksError } = await db
    .from('tasks')
    .select('id, name, duration_label, active')
    .eq('user_id', userId)

  if (tasksError) return NextResponse.json({ error: tasksError.message }, { status: 500 })

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
