export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('active', true)
    .order('order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, duration_label } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const { data: maxRow } = await supabase
    .from('tasks')
    .select('order')
    .eq('active', true)
    .order('order', { ascending: false })
    .limit(1)
    .single()

  const order = maxRow ? maxRow.order + 1 : 0

  const { data, error } = await supabase
    .from('tasks')
    .insert({ name: name.trim(), duration_label: duration_label?.trim() || null, order })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
