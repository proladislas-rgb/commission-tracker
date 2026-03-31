import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { params: { eventsPerSecond: 10 } },
})

// Client admin (server-side uniquement) — utilise la service role key si dispo,
// sinon fallback sur anon pour la V1 sans RLS
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey
)
