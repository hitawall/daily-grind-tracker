export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await getSupabase()
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
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
