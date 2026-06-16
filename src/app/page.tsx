'use client'

import { useEffect, useState, useCallback } from 'react'
import { today, getDaysInMonth, toDateString } from '@/lib/dates'
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

function getDayState(
  dateStr: string,
  logsByDate: Map<string, DailyLog[]>,
  todayStr: string
): DayState {
  if (dateStr > todayStr) return 'future'
  const logs = logsByDate.get(dateStr)
  if (!logs || logs.length === 0) return dateStr < todayStr ? 'missed' : 'empty'
  const completed = logs.filter((l) => l.completed).length
  if (completed === logs.length) return 'complete'
  if (completed > 0) return 'partial'
  return dateStr < todayStr ? 'missed' : 'empty'
}

const STATE_COLORS: Record<DayState, string> = {
  complete: 'bg-green-600 text-white',
  partial: 'bg-yellow-500 text-black',
  missed: 'bg-red-900/60 text-red-300',
  future: 'bg-transparent text-white/20',
  empty: 'bg-transparent text-white/40',
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [todayLogs, setTodayLogs] = useState<Map<string, boolean>>(new Map())
  const [stats, setStats] = useState<Stats | null>(null)
  const [calendarLogs, setCalendarLogs] = useState<Map<string, DailyLog[]>>(new Map())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedDayLogs, setSelectedDayLogs] = useState<DailyLog[]>([])
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const todayStr = today()

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks')
    const data: Task[] = await res.json()
    setTasks(data)
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
    const data: Stats = await res.json()
    setStats(data)
  }, [])

  const fetchCalendarLogs = useCallback(async (year: number, month: number) => {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`
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

  useEffect(() => {
    fetchTasks()
    fetchTodayLogs()
    fetchStats()
  }, [fetchTasks, fetchTodayLogs, fetchStats])

  useEffect(() => {
    fetchCalendarLogs(calYear, calMonth)
  }, [calYear, calMonth, fetchCalendarLogs])

  const toggleTask = async (taskId: string) => {
    const current = todayLogs.get(taskId) ?? false
    const next = !current
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
    const data: DailyLog[] = await res.json()
    setSelectedDayLogs(data)
  }

  const days = getDaysInMonth(calYear, calMonth)
  const firstDow = new Date(calYear, calMonth, 1).getDay()
  const allDone = tasks.length > 0 && tasks.every((t) => todayLogs.get(t.id))

  return (
    <div className="space-y-8">
      {/* Streaks */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
            <div className="text-3xl font-bold text-orange-400">{stats.currentStreak}</div>
            <div className="text-xs text-white/40 mt-1 uppercase tracking-wider">Current Streak</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
            <div className="text-3xl font-bold text-yellow-400">{stats.longestStreak}</div>
            <div className="text-xs text-white/40 mt-1 uppercase tracking-wider">Longest Streak</div>
          </div>
        </div>
      )}

      {/* Today's checklist */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            {new Date(todayStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h2>
          {allDone && tasks.length > 0 && (
            <span className="text-xs bg-green-700/40 text-green-400 px-2 py-0.5 rounded-full">
              All done
            </span>
          )}
        </div>
        <ul className="space-y-2">
          {tasks.map((task) => {
            const done = todayLogs.get(task.id) ?? false
            return (
              <li key={task.id}>
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors text-left cursor-pointer ${
                    done
                      ? 'border-green-800/50 bg-green-900/20 text-green-300'
                      : 'border-white/8 bg-white/4 text-white/80 hover:border-white/20 hover:bg-white/8'
                  }`}
                >
                  <span className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                    done ? 'bg-green-600 border-green-600 text-white' : 'border-white/25'
                  }`}>
                    {done && '✓'}
                  </span>
                  <span className={`flex-1 text-sm ${done ? 'line-through opacity-50' : ''}`}>
                    {task.name}
                  </span>
                  {task.duration_label && (
                    <span className="text-xs text-white/25">{task.duration_label}</span>
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
          <button
            onClick={() => {
              const d = new Date(calYear, calMonth - 1)
              setCalYear(d.getFullYear()); setCalMonth(d.getMonth())
            }}
            className="text-white/40 hover:text-white/70 px-2 py-1 text-lg"
          >
            ‹
          </button>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            {MONTH_SHORT[calMonth]} {calYear}
          </h2>
          <button
            onClick={() => {
              const d = new Date(calYear, calMonth + 1)
              setCalYear(d.getFullYear()); setCalMonth(d.getMonth())
            }}
            className="text-white/40 hover:text-white/70 px-2 py-1 text-lg"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-white/25 mb-1">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const dateStr = toDateString(day)
            const state = getDayState(dateStr, calendarLogs, todayStr)
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDay
            return (
              <button
                key={dateStr}
                onClick={() => handleDayClick(dateStr)}
                className={`aspect-square rounded-lg text-xs font-medium flex items-center justify-center transition-all ${
                  STATE_COLORS[state]
                } ${isToday ? 'ring-2 ring-white/30' : ''} ${
                  isSelected ? 'ring-2 ring-blue-400' : ''
                } ${state === 'future' ? 'cursor-default' : 'cursor-pointer hover:opacity-80'}`}
              >
                {day.getDate()}
              </button>
            )
          })}
        </div>

        <div className="flex gap-4 mt-3 text-xs text-white/30">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-green-600 inline-block" />Complete</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-yellow-500 inline-block" />Partial</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-900/60 inline-block" />Missed</span>
        </div>
      </section>

      {/* Selected day detail */}
      {selectedDay && (
        <section className="bg-white/5 rounded-xl p-4 border border-white/8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white/70">
              {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h3>
            <button onClick={() => setSelectedDay(null)} className="text-white/30 hover:text-white/60 text-sm">✕</button>
          </div>
          {selectedDayLogs.length === 0 ? (
            <p className="text-sm text-white/30">No data recorded for this day.</p>
          ) : (
            <ul className="space-y-1.5">
              {selectedDayLogs.map((log) => {
                const task = tasks.find((t) => t.id === log.task_id)
                return (
                  <li key={log.id} className={`text-sm flex items-center gap-2 ${log.completed ? 'text-green-400' : 'text-white/30 line-through'}`}>
                    <span className="flex-shrink-0">{log.completed ? '✓' : '✗'}</span>
                    {task?.name ?? 'Unknown task'}
                    {task?.duration_label && (
                      <span className="text-xs opacity-50">{task.duration_label}</span>
                    )}
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
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Stats</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
              <div className="text-2xl font-bold">{stats.totalDays}</div>
              <div className="text-xs text-white/40 mt-1">Days Tracked</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
              <div className="text-2xl font-bold text-green-400">{stats.fullyCompleteDays}</div>
              <div className="text-xs text-white/40 mt-1">Full Days</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
              <div className="text-2xl font-bold text-blue-400">{stats.completionRate}%</div>
              <div className="text-xs text-white/40 mt-1">Completion</div>
            </div>
          </div>

          <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">Per-task completion</h3>
          {stats.taskStats.filter((t) => t.total > 0).length === 0 ? (
            <p className="text-sm text-white/25">No task history yet. Start checking off tasks above.</p>
          ) : (
            <ul className="space-y-2.5">
              {stats.taskStats
                .filter((t) => t.total > 0)
                .sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0))
                .map((t) => (
                  <li key={t.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white/60 truncate">{t.name}</div>
                      <div className="h-1.5 bg-white/10 rounded-full mt-1">
                        <div
                          className="h-1.5 rounded-full bg-green-600 transition-all"
                          style={{ width: `${t.rate ?? 0}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-white/40 flex-shrink-0 w-8 text-right">
                      {t.rate !== null ? `${t.rate}%` : '—'}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
