
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*, users!daily_reports_created_by_fkey(full_name)')
    .limit(1)
  
  if (error) {
    console.error('QUERY ERROR:', error)
  } else {
    console.log('QUERY SUCCESS:', data)
  }
}

test()
