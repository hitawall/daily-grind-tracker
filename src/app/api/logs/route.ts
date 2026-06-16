import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/logs?start=YYYY-MM-DD&end=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  let query = supabase.from('daily_logs').select('*')
  if (start) query = query.gte('date', start)
  if (end) query = query.lte('date', end)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/logs — upsert a log entry
// Body: { date, task_id, completed }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { date, task_id, completed } = body

  if (!date || !task_id) {
    return NextResponse.json({ error: 'date and task_id required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('daily_logs')
    .upsert({ date, task_id, completed }, { onConflict: 'date,task_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
