export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabase } from '@/lib/supabase'

const DEFAULT_TASKS = [
  { name: 'Sleep',                       duration_label: '8 hrs'   },
  { name: 'Meditation',                  duration_label: '20 mins' },
  { name: 'Gym',                         duration_label: '1 hr'    },
  { name: 'DSA - Blind 75',              duration_label: '2 hrs'   },
  { name: 'System Design',              duration_label: '1.5 hrs'  },
  { name: 'LLD / Machine Coding',       duration_label: '1 hr'    },
  { name: 'Job Applications + Outreach', duration_label: '1 hr'   },
  { name: 'Mock / Review',              duration_label: '0.5 hrs'  },
]

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getSupabase()
  let { data, error } = await db
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!data || data.length === 0) {
    const seeds = DEFAULT_TASKS.map((t, i) => ({ ...t, user_id: userId, order: i }))
    const { data: seeded, error: seedErr } = await db.from('tasks').insert(seeds).select()
    if (seedErr) return NextResponse.json({ error: seedErr.message }, { status: 500 })
    data = seeded
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, duration_label } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const db = getSupabase()
  const { data: maxRow } = await db
    .from('tasks')
    .select('order')
    .eq('user_id', userId)
    .eq('active', true)
    .order('order', { ascending: false })
    .limit(1)
    .single()

  const order = maxRow ? maxRow.order + 1 : 0

  const { data, error } = await db
    .from('tasks')
    .insert({ name: name.trim(), duration_label: duration_label?.trim() || null, order, user_id: userId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
