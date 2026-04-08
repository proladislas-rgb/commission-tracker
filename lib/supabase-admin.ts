import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization : le client admin n'est construit que lors du premier accès,
// pas au module load. Ça permet à Next.js de faire sa phase "Collecting page data"
// sans crasher quand les env vars ne sont pas encore chargées (cas Vercel build).
// La sécurité reste intacte : au runtime, si SUPABASE_SERVICE_ROLE_KEY manque,
// la toute première requête DB throw immédiatement avec un message clair.

let _adminClient: SupabaseClient | null = null

function getAdminClient(): SupabaseClient {
  if (_adminClient) return _adminClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required.')
  }
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required for server-side operations.')
  }

  _adminClient = createClient(supabaseUrl, serviceRoleKey)
  return _adminClient
}

/**
 * Client admin Supabase (server-side uniquement, bypass RLS via service_role key).
 * Utilise un Proxy pour déléguer tous les accès à une instance lazy-initialisée.
 * L'instance réelle est créée à la première utilisation, pas au import.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getAdminClient()
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
