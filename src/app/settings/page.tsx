'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '@/lib/supabase'

const s = {
  card:  { background: 'var(--bg-card)', border: '1px solid var(--border)' } as React.CSSProperties,
  text1: { color: 'var(--text-1)' } as React.CSSProperties,
  text2: { color: 'var(--text-2)' } as React.CSSProperties,
  text3: { color: 'var(--text-3)' } as React.CSSProperties,
  input: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    color: 'var(--text-1)',
  } as React.CSSProperties,
}

function SortableTask({ task, onDelete }: { task: Task; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, ...s.card }}
      className="flex items-center gap-3 px-4 py-3 rounded-lg"
    >
      <button
        {...attributes} {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none text-lg leading-none"
        style={s.text3}
        aria-label="Drag to reorder"
      >
        ⠿
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate" style={s.text1}>{task.name}</div>
        {task.duration_label && <div className="text-xs mt-0.5" style={s.text3}>{task.duration_label}</div>}
      </div>
      <button
        onClick={() => onDelete(task.id)}
        className="text-sm flex-shrink-0 transition-colors hover:text-red-500"
        style={s.text3}
        aria-label={`Delete ${task.name}`}
      >
        ✕
      </button>
    </li>
  )
}

export default function SettingsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newName, setNewName] = useState('')
  const [newDuration, setNewDuration] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks')
    setTasks(await res.json())
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const showNotice = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(''), 3000)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), duration_label: newDuration.trim() || null }),
    })
    if (res.ok) {
      setNewName(''); setNewDuration('')
      await fetchTasks()
      showNotice('Task added. Changes apply from tomorrow.')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    const task = tasks.find((t) => t.id === id)
    if (!confirm(`Remove "${task?.name}"? Past data is preserved.`)) return
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setTasks((prev) => prev.filter((t) => t.id !== id))
    showNotice('Task removed. Past records are preserved.')
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const reordered = arrayMove(tasks, tasks.findIndex((t) => t.id === active.id), tasks.findIndex((t) => t.id === over.id))
    setTasks(reordered)
    await fetch('/api/tasks/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: reordered.map((t) => t.id) }),
    })
    showNotice('Order saved.')
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={s.text1}>Manage Tasks</h1>
          <p className="text-xs mt-0.5" style={s.text3}>Changes apply from tomorrow onwards.</p>
        </div>
        <a href="/" className="text-xs transition-colors" style={s.text3}>← Home</a>
      </div>

      {notice && (
        <div className="text-sm px-4 py-2.5 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid #60a5fa', color: '#60a5fa' }}>
          {notice}
        </div>
      )}

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={s.text3}>Add Task</h2>
        <form onSubmit={handleAdd} className="flex gap-2 flex-wrap">
          <input
            type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Task name" required
            className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ ...s.input, outlineOffset: '2px' }}
          />
          <input
            type="text" value={newDuration} onChange={(e) => setNewDuration(e.target.value)}
            placeholder="Duration (e.g. 1 hr)"
            className="w-36 rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={s.input}
          />
          <button
            type="submit" disabled={saving || !newName.trim()}
            className="rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-40"
            style={{ ...s.card, color: 'var(--text-1)' }}
          >
            Add
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={s.text3}>
          Current Tasks — drag to reorder
        </h2>
        {tasks.length === 0 ? (
          <p className="text-sm" style={s.text3}>No tasks. Add one above.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {tasks.map((task) => <SortableTask key={task.id} task={task} onDelete={handleDelete} />)}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>
    </div>
  )
}
