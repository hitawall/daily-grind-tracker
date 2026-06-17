export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  const db = getSupabase()
  let query = db.from('daily_logs').select('*').eq('user_id', userId)
  if (start) query = query.gte('date', start)
  if (end) query = query.lte('date', end)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date, task_id, completed } = await req.json()
  if (!date || !task_id) {
    return NextResponse.json({ error: 'date and task_id required' }, { status: 400 })
  }

  const { data, error } = await getSupabase()
    .from('daily_logs')
    .upsert({ date, task_id, completed, user_id: userId }, { onConflict: 'date,task_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
