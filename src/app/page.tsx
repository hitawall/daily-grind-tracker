'use client'

import { useEffect, useState, useCallback } from 'react'
import { today, getDaysInMonth, toDateString, nowIST, parseDurationMinutes, formatMinutes, minsLeftInDay } from '@/lib/dates'
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
const DOW = ['S','M','T','W','T','F','S']

function useISTClock() {
  const [time, setTime] = useState(() => nowIST())
  useEffect(() => {
    const id = setInterval(() => setTime(nowIST()), 1000)
    return () => clearInterval(id)
  }, [])
  return time
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

  const doneCount = tasks.filter((t) => todayLogs.get(t.id)).length
  const allDone = tasks.length > 0 && doneCount === tasks.length
  const totalMins = tasks.reduce((sum, t) => sum + parseDurationMinutes(t.duration_label), 0)
  const dayMinsLeft = minsLeftInDay(istNow)

  const days = getDaysInMonth(calYear, calMonth)
  const firstDow = new Date(calYear, calMonth, 1).getDay()

  const dateLabel = istNow.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '18px 20px',
        boxShadow: 'var(--shadow)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            {formatMinutes(dayMinsLeft)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            left in the day
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{dateLabel}</div>
          {stats && stats.currentStreak > 0 && (
            <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
              {stats.currentStreak} day streak
            </div>
          )}
          {allDone && (
            <div style={{ fontSize: 12, color: 'var(--green-text)', marginTop: 4, fontWeight: 600 }}>
              All done ✓
            </div>
          )}
        </div>
      </div>

      {/* Today's tasks */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Today
          </span>
          <a
            href="/settings"
            style={{ fontSize: 11, color: 'var(--text-3)', textDecoration: 'none', padding: '3px 10px', border: '1px solid var(--border)', borderRadius: 99, transition: 'all 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            + manage tasks
          </a>
        </div>

        {tasks.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px dashed var(--border-strong)',
            borderRadius: 12,
            padding: '28px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.4 }}>○</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4, fontWeight: 500 }}>No tasks yet</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>Build your daily routine, one habit at a time.</div>
            <a
              href="/settings"
              style={{
                display: 'inline-block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: 99,
                padding: '5px 16px',
                textDecoration: 'none',
              }}
            >
              Add your first task
            </a>
          </div>
        ) : (
          <>
            {/* Progress */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 5 }}>
                <span>{doneCount} / {tasks.length}</span>
                <span>{totalMins > 0 ? formatMinutes(totalMins) + ' total' : ''}</span>
              </div>
              <div style={{ height: 3, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  borderRadius: 99,
                  background: 'var(--accent)',
                  width: `${tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tasks.map((task) => {
                const done = todayLogs.get(task.id) ?? false
                return (
                  <li key={task.id}>
                    <button
                      onClick={() => toggleTask(task.id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '11px 14px',
                        borderRadius: 10,
                        border: done ? '1px solid var(--green-border)' : '1px solid var(--border)',
                        background: done ? 'var(--green-bg)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        boxShadow: done ? 'none' : 'var(--shadow)',
                      }}
                    >
                      {/* Checkbox */}
                      <span style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: done ? 'var(--accent)' : 'transparent',
                        border: done ? '1.5px solid var(--accent)' : '1.5px solid var(--border-strong)',
                        transition: 'all 0.15s',
                        fontSize: 10,
                        color: '#fff',
                        fontWeight: 700,
                      }}>
                        {done && '✓'}
                      </span>
                      <span style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 500,
                        color: done ? 'var(--green-text)' : 'var(--text-1)',
                        textDecoration: done ? 'line-through' : 'none',
                        opacity: done ? 0.7 : 1,
                      }}>
                        {task.name}
                      </span>
                      {task.duration_label && (
                        <span style={{ fontSize: 11, color: done ? 'var(--green-text)' : 'var(--text-3)', flexShrink: 0, opacity: 0.7 }}>
                          {task.duration_label}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      {/* Calendar — compact */}
      <section style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '14px 16px',
        boxShadow: 'var(--shadow)',
      }}>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <button
            onClick={() => { const d = new Date(calYear, calMonth - 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px 6px', fontSize: 14, borderRadius: 6 }}
          >‹</button>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {MONTH_SHORT[calMonth]} {calYear}
          </span>
          <button
            onClick={() => { const d = new Date(calYear, calMonth + 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px 6px', fontSize: 14, borderRadius: 6 }}
          >›</button>
        </div>

        {/* DOW headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
          {DOW.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-3)', padding: '2px 0', letterSpacing: '0.02em' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day grid — fixed 28px cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
          {days.map((day) => {
            const dateStr = toDateString(day)
            const state = getDayState(dateStr, calendarLogs, todayStr)
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDay
            const isFuture = state === 'future'

            const cellBg =
              state === 'complete' ? 'var(--accent)' :
              state === 'partial'  ? '#c9a227' :
              state === 'missed'   ? 'var(--red-bg)' : 'transparent'

            const cellColor =
              state === 'complete' ? '#fff' :
              state === 'partial'  ? '#fff' :
              state === 'missed'   ? 'var(--red-text)' :
              isToday              ? 'var(--text-1)' : 'var(--text-3)'

            return (
              <button
                key={dateStr}
                onClick={() => handleDayClick(dateStr)}
                disabled={isFuture}
                title={dateStr}
                style={{
                  height: 28,
                  borderRadius: 6,
                  border: isSelected ? '1.5px solid var(--accent)' : isToday ? '1.5px solid var(--border-strong)' : '1.5px solid transparent',
                  background: cellBg,
                  color: cellColor,
                  fontSize: 11,
                  fontWeight: isToday ? 700 : 400,
                  cursor: isFuture ? 'default' : 'pointer',
                  opacity: isFuture ? 0.25 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.1s',
                }}
              >
                {day.getDate()}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 10, color: 'var(--text-3)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)', display: 'inline-block' }} />
            Done
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#c9a227', display: 'inline-block' }} />
            Partial
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--red-bg)', border: '1px solid var(--red-text)', display: 'inline-block' }} />
            Missed
          </span>
        </div>
      </section>

      {/* Day detail drawer */}
      {selectedDay && (
        <section style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '14px 16px',
          boxShadow: 'var(--shadow)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
              {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 12 }}>✕</button>
          </div>
          {selectedDayLogs.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>No data recorded.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {selectedDayLogs.map((log) => {
                const task = tasks.find((t) => t.id === log.task_id)
                return (
                  <li key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ color: log.completed ? 'var(--accent)' : 'var(--red-text)', fontSize: 10, flexShrink: 0 }}>
                      {log.completed ? '✓' : '✗'}
                    </span>
                    <span style={{ color: log.completed ? 'var(--text-1)' : 'var(--text-3)', textDecoration: log.completed ? 'none' : 'line-through' }}>
                      {task?.name ?? 'Unknown task'}
                    </span>
                    {task?.duration_label && (
                      <span style={{ color: 'var(--text-3)', fontSize: 10, marginLeft: 'auto' }}>{task.duration_label}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {/* Stats */}
      {stats && stats.totalDays > 0 && (
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
            {[
              { value: stats.currentStreak,    label: 'Streak',     color: 'var(--accent)' },
              { value: stats.longestStreak,    label: 'Best',       color: 'var(--text-2)' },
              { value: stats.fullyCompleteDays, label: 'Full days',  color: 'var(--text-2)' },
              { value: `${stats.completionRate}%`, label: 'Rate',   color: 'var(--text-2)' },
            ].map(({ value, label, color }) => (
              <div key={label} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '10px 8px',
                textAlign: 'center',
                boxShadow: 'var(--shadow)',
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color, letterSpacing: '-0.02em' }}>{value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
              </div>
            ))}
          </div>

          {stats.taskStats.filter((t) => t.total > 0).length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                Per task
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stats.taskStats.filter((t) => t.total > 0).sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0)).map((t) => (
                  <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.name}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0, marginLeft: 8 }}>
                          {t.rate !== null ? `${t.rate}%` : '—'}
                        </span>
                      </div>
                      <div style={{ height: 3, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          borderRadius: 99,
                          background: (t.rate ?? 0) >= 80 ? 'var(--accent)' : (t.rate ?? 0) >= 50 ? '#c9a227' : 'var(--red-text)',
                          width: `${t.rate ?? 0}%`,
                          transition: 'width 0.3s ease',
                          opacity: 0.8,
                        }} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  )
}
