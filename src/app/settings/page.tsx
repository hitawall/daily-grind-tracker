'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '@/lib/supabase'

function SortableTask({ task, onDelete }: { task: Task; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-white/8 bg-white/4"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-white/25 hover:text-white/50 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        ⠿
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white/80 truncate">{task.name}</div>
        {task.duration_label && (
          <div className="text-xs text-white/30">{task.duration_label}</div>
        )}
      </div>
      <button
        onClick={() => onDelete(task.id)}
        className="text-white/25 hover:text-red-400 transition-colors text-sm flex-shrink-0"
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
    const data: Task[] = await res.json()
    setTasks(data)
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
      setNewName('')
      setNewDuration('')
      await fetchTasks()
      showNotice('Task added. Changes apply from tomorrow.')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    const task = tasks.find((t) => t.id === id)
    if (!confirm(`Remove "${task?.name}" from the task list? Past data is preserved.`)) return
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setTasks((prev) => prev.filter((t) => t.id !== id))
    showNotice('Task removed. Past records are preserved.')
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tasks.findIndex((t) => t.id === active.id)
    const newIndex = tasks.findIndex((t) => t.id === over.id)
    const reordered = arrayMove(tasks, oldIndex, newIndex)
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
          <h1 className="text-lg font-semibold text-white">Manage Tasks</h1>
          <p className="text-xs text-white/40 mt-0.5">Changes to the list apply from tomorrow onwards.</p>
        </div>
        <a href="/" className="text-xs text-white/40 hover:text-white/70 transition-colors">← Home</a>
      </div>

      {notice && (
        <div className="bg-blue-900/30 border border-blue-700/40 text-blue-300 text-sm px-4 py-2.5 rounded-lg">
          {notice}
        </div>
      )}

      {/* Add task form */}
      <section>
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Add Task</h2>
        <form onSubmit={handleAdd} className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Task name"
            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/30"
            required
          />
          <input
            type="text"
            value={newDuration}
            onChange={(e) => setNewDuration(e.target.value)}
            placeholder="Duration (e.g. 1 hr)"
            className="w-36 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/30"
          />
          <button
            type="submit"
            disabled={saving || !newName.trim()}
            className="bg-white/10 hover:bg-white/15 disabled:opacity-40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white transition-colors"
          >
            Add
          </button>
        </form>
      </section>

      {/* Task list */}
      <section>
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
          Current Tasks — drag to reorder
        </h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-white/30">No tasks. Add one above.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {tasks.map((task) => (
                  <SortableTask key={task.id} task={task} onDelete={handleDelete} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>
    </div>
  )
}
