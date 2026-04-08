import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Client admin Supabase (bypass RLS via service_role key).
//
// Note sur l'init : durant la phase "Collecting page data" du build Next.js,
// les env vars ne sont pas toujours disponibles. On détecte cette phase via
// NEXT_PHASE et on skip le throw — un client "placeholder" est instancié mais
// jamais appelé pendant le build. En runtime, si les env vars manquent, on
// throw immédiatement au premier import de ce module, et la première requête
// remontera l'erreur via le catch du handler.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

if (!isBuildPhase && !supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required.')
}
if (!isBuildPhase && !serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required for server-side operations.')
}

export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  serviceRoleKey || 'placeholder-build-phase-only',
)
