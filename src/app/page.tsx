'use client'

import { useEffect, useState, useCallback } from 'react'
import { today, getDaysInMonth, toDateString, nowIST, parseDurationMinutes, formatMinutes } from '@/lib/dates'
import type { Task, DailyLog } from '@/lib/supabase'

type Stats = {
  totalDays: number
  fullyCompleteDays: number
  completionRate: number
  currentStreak: number
  longestStreak: number
  taskStats: Array<{
    id: string
    name: string
    duration_label: string | null
    active: boolean
    total: number
    completed: number
    rate: number | null
  }>
}

type DayState = 'complete' | 'partial' | 'missed' | 'future' | 'empty'

function getDayState(dateStr: string, logsByDate: Map<string, DailyLog[]>, todayStr: string): DayState {
  if (dateStr > todayStr) return 'future'
  const logs = logsByDate.get(dateStr)
  if (!logs || logs.length === 0) return dateStr < todayStr ? 'missed' : 'empty'
  const done = logs.filter((l) => l.completed).length
  if (done === logs.length) return 'complete'
  if (done > 0) return 'partial'
  return dateStr < todayStr ? 'missed' : 'empty'
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function useISTClock() {
  const [time, setTime] = useState(() => nowIST())
  useEffect(() => {
    const id = setInterval(() => setTime(nowIST()), 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

// Inline style helpers so we avoid Tailwind opacity hacks
const s = {
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)' } as React.CSSProperties,
  text1: { color: 'var(--text-1)' } as React.CSSProperties,
  text2: { color: 'var(--text-2)' } as React.CSSProperties,
  text3: { color: 'var(--text-3)' } as React.CSSProperties,
  divider: { borderColor: 'var(--border)' } as React.CSSProperties,
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [todayLogs, setTodayLogs] = useState<Map<string, boolean>>(new Map())
  const [stats, setStats] = useState<Stats | null>(null)
  const [calendarLogs, setCalendarLogs] = useState<Map<string, DailyLog[]>>(new Map())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedDayLogs, setSelectedDayLogs] = useState<DailyLog[]>([])
  const [calYear, setCalYear] = useState(() => nowIST().getFullYear())
  const [calMonth, setCalMonth] = useState(() => nowIST().getMonth())
  const istNow = useISTClock()
  const todayStr = today()

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks')
    setTasks(await res.json())
  }, [])

  const fetchTodayLogs = useCallback(async () => {
    const res = await fetch(`/api/logs?start=${todayStr}&end=${todayStr}`)
    const data: DailyLog[] = await res.json()
    const map = new Map<string, boolean>()
    for (const log of data) map.set(log.task_id, log.completed)
    setTodayLogs(map)
  }, [todayStr])

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/stats')
    setStats(await res.json())
  }, [])

  const fetchCalendarLogs = useCallback(async (year: number, month: number) => {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`
    const res = await fetch(`/api/logs?start=${start}&end=${end}`)
    const data: DailyLog[] = await res.json()
    const map = new Map<string, DailyLog[]>()
    for (const log of data) {
      const arr = map.get(log.date) ?? []
      arr.push(log)
      map.set(log.date, arr)
    }
    setCalendarLogs(map)
  }, [])

  useEffect(() => { fetchTasks(); fetchTodayLogs(); fetchStats() }, [fetchTasks, fetchTodayLogs, fetchStats])
  useEffect(() => { fetchCalendarLogs(calYear, calMonth) }, [calYear, calMonth, fetchCalendarLogs])

  const toggleTask = async (taskId: string) => {
    const next = !(todayLogs.get(taskId) ?? false)
    setTodayLogs((prev) => new Map(prev).set(taskId, next))
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: todayStr, task_id: taskId, completed: next }),
    })
    fetchStats()
    fetchCalendarLogs(calYear, calMonth)
  }

  const handleDayClick = async (dateStr: string) => {
    if (dateStr > todayStr) return
    if (dateStr === selectedDay) { setSelectedDay(null); return }
    setSelectedDay(dateStr)
    const res = await fetch(`/api/logs?start=${dateStr}&end=${dateStr}`)
    setSelectedDayLogs(await res.json())
  }

  const remainingMins = tasks.reduce((sum, t) =>
    todayLogs.get(t.id) ? sum : sum + parseDurationMinutes(t.duration_label), 0)
  const totalMins = tasks.reduce((sum, t) => sum + parseDurationMinutes(t.duration_label), 0)
  const doneCount = tasks.filter((t) => todayLogs.get(t.id)).length
  const allDone = tasks.length > 0 && doneCount === tasks.length

  const days = getDaysInMonth(calYear, calMonth)
  const firstDow = new Date(calYear, calMonth, 1).getDay()

  const timeStr = istNow.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const dateLabel = istNow.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6">

      {/* Clock + Time Remaining */}
      <div className="rounded-xl px-5 py-4 flex items-center justify-between gap-4" style={s.card}>
        <div>
          <div className="text-3xl font-bold tabular-nums" style={s.text1}>{timeStr}</div>
          <div className="text-xs mt-1" style={s.text3}>{dateLabel} · IST</div>
        </div>
        <div className="text-right">
          {allDone ? (
            <div className="text-sm font-semibold text-green-600">All done!</div>
          ) : (
            <>
              <div className="text-xl font-bold text-orange-500 tabular-nums">{formatMinutes(remainingMins)}</div>
              <div className="text-xs mt-0.5" style={s.text3}>remaining</div>
            </>
          )}
        </div>
      </div>

      {/* Streaks */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: stats.currentStreak, label: 'Current Streak', color: 'text-orange-500' },
            { value: stats.longestStreak, label: 'Longest Streak', color: 'text-yellow-500' },
          ].map(({ value, label, color }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={s.card}>
              <div className={`text-3xl font-bold ${color}`}>{value}</div>
              <div className="text-xs mt-1 uppercase tracking-wider" style={s.text3}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Checklist */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={s.text3}>Today&apos;s Tasks</span>
          <div className="flex items-center gap-2">
            {allDone && <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-2 py-0.5 rounded-full">All done</span>}
            <a href="/settings" className="text-xs rounded px-2 py-0.5 transition-colors" style={{ color: 'var(--text-3)', border: '1px solid var(--border)' }}>
              + Manage
            </a>
          </div>
        </div>

        {/* Progress bar */}
        {tasks.length > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1" style={s.text3}>
              <span>{doneCount} / {tasks.length} tasks</span>
              <span>{totalMins > 0 ? `${formatMinutes(totalMins)} total` : ''}</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
              <div
                className="h-1.5 rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        <ul className="space-y-2">
          {tasks.map((task) => {
            const done = todayLogs.get(task.id) ?? false
            return (
              <li key={task.id}>
                <button
                  onClick={() => toggleTask(task.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left cursor-pointer transition-colors"
                  style={done
                    ? { background: 'var(--green-bg)', border: '1px solid var(--green-border)', color: 'var(--green-text)' }
                    : { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-1)' }
                  }
                >
                  <span
                    className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-xs font-bold"
                    style={done
                      ? { background: '#22c55e', border: '1px solid #22c55e', color: '#fff' }
                      : { border: '1px solid var(--border-strong)', color: 'transparent' }
                    }
                  >
                    {done && '✓'}
                  </span>
                  <span className={`flex-1 text-sm ${done ? 'line-through' : ''}`} style={done ? { opacity: 0.6 } : s.text1}>
                    {task.name}
                  </span>
                  {task.duration_label && (
                    <span className="text-xs flex-shrink-0" style={s.text3}>{task.duration_label}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Calendar */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => { const d = new Date(calYear, calMonth - 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()) }}
            className="px-2 py-1 text-lg rounded transition-colors hover:opacity-70" style={s.text2}>‹</button>
          <span className="text-xs font-semibold uppercase tracking-wider" style={s.text3}>{MONTH_SHORT[calMonth]} {calYear}</span>
          <button onClick={() => { const d = new Date(calYear, calMonth + 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()) }}
            className="px-2 py-1 text-lg rounded transition-colors hover:opacity-70" style={s.text2}>›</button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1" style={s.text3}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDow }).map((_, i) => <div key={i} />)}
          {days.map((day) => {
            const dateStr = toDateString(day)
            const state = getDayState(dateStr, calendarLogs, todayStr)
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDay
            const stateStyle: React.CSSProperties =
              state === 'complete' ? { background: '#16a34a', color: '#fff' } :
              state === 'partial'  ? { background: '#eab308', color: '#1a1a1a' } :
              state === 'missed'   ? { background: 'var(--red-bg)', color: 'var(--red-text)' } :
                                     { background: 'transparent', color: 'var(--text-3)' }
            return (
              <button
                key={dateStr}
                onClick={() => handleDayClick(dateStr)}
                className="aspect-square rounded-lg text-xs font-medium flex items-center justify-center transition-all"
                style={{
                  ...stateStyle,
                  outline: isToday ? '2px solid var(--border-strong)' : isSelected ? '2px solid #60a5fa' : 'none',
                  outlineOffset: '1px',
                  cursor: state === 'future' ? 'default' : 'pointer',
                  opacity: state === 'future' ? 0.3 : 1,
                }}
              >
                {day.getDate()}
              </button>
            )
          })}
        </div>

        <div className="flex gap-4 mt-3 text-xs" style={s.text3}>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-green-600 inline-block" />Complete</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-yellow-400 inline-block" />Partial</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded inline-block" style={{ background: 'var(--red-bg)', outline: '1px solid var(--red-text)' }} />Missed</span>
        </div>
      </section>

      {/* Day detail */}
      {selectedDay && (
        <section className="rounded-xl p-4" style={s.card}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={s.text1}>
              {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <button onClick={() => setSelectedDay(null)} className="text-sm" style={s.text3}>✕</button>
          </div>
          {selectedDayLogs.length === 0 ? (
            <p className="text-sm" style={s.text3}>No data recorded for this day.</p>
          ) : (
            <ul className="space-y-1.5">
              {selectedDayLogs.map((log) => {
                const task = tasks.find((t) => t.id === log.task_id)
                return (
                  <li key={log.id} className={`text-sm flex items-center gap-2 ${log.completed ? '' : 'line-through'}`}
                    style={{ color: log.completed ? '#22c55e' : 'var(--text-3)' }}>
                    <span className="flex-shrink-0">{log.completed ? '✓' : '✗'}</span>
                    {task?.name ?? 'Unknown task'}
                    {task?.duration_label && <span className="text-xs opacity-60">{task.duration_label}</span>}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {/* Stats */}
      {stats && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={s.text3}>Stats</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { value: stats.totalDays, label: 'Days Tracked', color: s.text1 },
              { value: stats.fullyCompleteDays, label: 'Full Days', color: { color: '#22c55e' } },
              { value: `${stats.completionRate}%`, label: 'Completion', color: { color: '#60a5fa' } },
            ].map(({ value, label, color }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={s.card}>
                <div className="text-2xl font-bold" style={color}>{value}</div>
                <div className="text-xs mt-1" style={s.text3}>{label}</div>
              </div>
            ))}
          </div>

          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={s.text3}>Per-task completion</h3>
          {stats.taskStats.filter((t) => t.total > 0).length === 0 ? (
            <p className="text-sm" style={s.text3}>No task history yet. Start checking off tasks above.</p>
          ) : (
            <ul className="space-y-2.5">
              {stats.taskStats.filter((t) => t.total > 0).sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0)).map((t) => (
                <li key={t.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate" style={s.text2}>{t.name}</div>
                    <div className="h-1.5 rounded-full mt-1" style={{ background: 'var(--border)' }}>
                      <div className="h-1.5 rounded-full bg-green-500 transition-all" style={{ width: `${t.rate ?? 0}%` }} />
                    </div>
                  </div>
                  <span className="text-xs w-8 text-right flex-shrink-0" style={s.text3}>{t.rate !== null ? `${t.rate}%` : '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
