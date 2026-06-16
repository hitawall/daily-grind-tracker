import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
