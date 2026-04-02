export type Role = 'admin' | 'associe'

export interface User {
  id: string
  username: string
  display_name: string
  role: Role
  avatar_color: string
  created_at: string
  last_seen: string | null
}

export type CommissionStatus = 'due' | 'partiel' | 'paye'

export interface Commission {
  id: string
  prime_id: string
  user_id: string
  ca: number
  commission: number
  dossiers: number
  mois: string
  status: CommissionStatus
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string
  client_id: string | null
  prime?: Prime
  user?: User
}

export type PaiementStatus = 'effectue' | 'en_attente' | 'en_retard'

export interface Paiement {
  id: string
  date: string
  montant: number
  label: string
  status: PaiementStatus
  commission_id: string | null
  created_by: string
  client_id: string | null
  created_at: string
}

export interface Prime {
  id: string
  name: string
  color: string
  icon: string
  active: boolean
  client_id: string | null
  created_at?: string
}

export type SommeDueStatus = 'du' | 'effectue'

export interface SommeDue {
  id: string
  label: string
  montant: number
  status: SommeDueStatus
  created_by: string
  client_id: string | null
  created_at: string
}

export interface Client {
  id: string
  name: string
  siren: string | null
  address: string | null
  email: string | null
  color: string
  pinned: boolean
  created_by: string
  created_at: string
}

export type ActivityAction = 'create' | 'update' | 'delete'
export type ActivityEntityType = 'commission' | 'paiement' | 'client' | 'user' | 'prime'

export interface ActivityLog {
  id: string
  user_id: string
  action: ActivityAction
  entity_type: ActivityEntityType
  entity_id: string
  details: {
    description: string
    [key: string]: unknown
  }
  created_at: string
  user?: User
}

export interface Channel {
  id: string
  name: string
  type: 'general' | 'client'
  client_id: string | null
  created_at: string
}

export interface Message {
  id: string
  channel_id: string
  user_id: string
  content: string | null
  file_url: string | null
  file_name: string | null
  file_size: string | null
  file_type: string | null
  reactions: Record<string, string[]>
  created_at: string
  user?: User
}

export interface AuthUser {
  id: string
  username: string
  display_name: string
  role: Role
  avatar_color: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface RegisterPayload {
  username: string
  password: string
  displayName: string
  avatarColor: string
  role?: Role
}

