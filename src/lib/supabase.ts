import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    _client = createClient(url, key)
  }
  return _client
}

export type Task = {
  id: string
  name: string
  duration_label: string | null
  order: number
  active: boolean
  created_at: string
}

export type DailyLog = {
  id: string
  date: string
  task_id: string
  completed: boolean
}
