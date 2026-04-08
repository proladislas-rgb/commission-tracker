import { supabase } from '@/lib/supabase'

export interface ChannelUnread {
  channelId: string
  count: number
}

/**
 * Récupère le nombre de messages non lus par channel en parallèle.
 * Lit la dernière lecture depuis localStorage (clé `chat_read_${channelId}`).
 * Exclut les messages envoyés par userId (on ne compte pas ses propres messages).
 * Retourne un map { channelId: count }.
 */
export async function fetchUnreadCounts(
  userId: string,
  channelIds: string[],
): Promise<Record<string, number>> {
  const results = await Promise.all(
    channelIds.map(async channelId => {
      const lastRead = typeof window !== 'undefined'
        ? localStorage.getItem(`chat_read_${channelId}`)
        : null
      let query = supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('channel_id', channelId)
        .neq('user_id', userId)
      if (lastRead) {
        query = query.gt('created_at', lastRead)
      }
      const { count } = await query
      return { channelId, count: Number(count) || 0 }
    }),
  )
  return Object.fromEntries(results.map(r => [r.channelId, r.count]))
}

/**
 * Version totale (somme de toutes les channels) — pour le badge du sidebar.
 */
export async function fetchTotalUnread(
  userId: string,
  channelIds: string[],
): Promise<number> {
  const counts = await fetchUnreadCounts(userId, channelIds)
  return Object.values(counts).reduce((sum, c) => sum + c, 0)
}
