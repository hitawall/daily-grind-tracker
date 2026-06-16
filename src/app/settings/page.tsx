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

function SortableTask({ task, onDelete }: { task: Task; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        boxShadow: isDragging ? 'var(--shadow-md)' : 'var(--shadow)',
      }}
    >
      <button
        {...attributes} {...listeners}
        style={{
          background: 'none', border: 'none', cursor: 'grab',
          color: 'var(--text-3)', padding: '2px 4px', fontSize: 13,
          display: 'flex', alignItems: 'center',
        }}
        aria-label="Drag to reorder"
      >
        ⠿
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.name}
        </div>
        {task.duration_label && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{task.duration_label}</div>
        )}
      </div>
      <button
        onClick={() => onDelete(task.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 12, padding: '4px 6px', borderRadius: 6 }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red-text)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
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
  const [notice, setNotice] = useState<{ msg: string; ok: boolean } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks')
    setTasks(await res.json())
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const showNotice = (msg: string, ok = true) => {
    setNotice({ msg, ok })
    setTimeout(() => setNotice(null), 3000)
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
      setNewName('')
      setNewDuration('')
      await fetchTasks()
      showNotice('Task added.')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    const task = tasks.find((t) => t.id === id)
    if (!confirm(`Remove "${task?.name}"? Past data is preserved.`)) return
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setTasks((prev) => prev.filter((t) => t.id !== id))
    showNotice('Task removed. History preserved.')
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const reordered = arrayMove(
      tasks,
      tasks.findIndex((t) => t.id === active.id),
      tasks.findIndex((t) => t.id === over.id),
    )
    setTasks(reordered)
    await fetch('/api/tasks/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: reordered.map((t) => t.id) }),
    })
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.02em' }}>Tasks</h1>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '4px 0 0' }}>Drag to reorder. Changes apply from tomorrow.</p>
        </div>
        <a href="/" style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'none' }}>← back</a>
      </div>

      {notice && (
        <div style={{
          fontSize: 12,
          padding: '10px 14px',
          borderRadius: 8,
          background: notice.ok ? 'var(--accent-soft)' : 'var(--red-bg)',
          color: notice.ok ? 'var(--accent)' : 'var(--red-text)',
          border: `1px solid ${notice.ok ? 'var(--green-border)' : 'var(--red-text)'}`,
        }}>
          {notice.msg}
        </div>
      )}

      {/* Add form */}
      <section>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
          Add task
        </div>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Task name"
            required
            style={{
              flex: '1 1 160px',
              minWidth: 0,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 13,
              color: 'var(--text-1)',
              outline: 'none',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
          <input
            type="text"
            value={newDuration}
            onChange={(e) => setNewDuration(e.target.value)}
            placeholder="Duration (e.g. 1 hr)"
            style={{
              width: 140,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 13,
              color: 'var(--text-1)',
              outline: 'none',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
          <button
            type="submit"
            disabled={saving || !newName.trim()}
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: saving || !newName.trim() ? 'not-allowed' : 'pointer',
              opacity: saving || !newName.trim() ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            Add
          </button>
        </form>
      </section>

      {/* Task list */}
      <section>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
          Current tasks
        </div>
        {tasks.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px dashed var(--border-strong)',
            borderRadius: 10,
            padding: '24px',
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--text-3)',
          }}>
            No tasks yet — add your first one above.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {tasks.map((task) => <SortableTask key={task.id} task={task} onDelete={handleDelete} />)}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>
    </div>
  )
}
