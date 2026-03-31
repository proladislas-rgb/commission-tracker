import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'
import * as path from 'path'
import * as fs from 'fs'

// Charger .env.local
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  content.split('\n').forEach(line => {
    const [k, ...v] = line.split('=')
    if (k?.trim()) process.env[k.trim()] = v.join('=').trim()
  })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q: string) => new Promise<string>(r => rl.question(q, r))

const RESET  = '\x1b[0m'
const BOLD   = '\x1b[1m'
const GREEN  = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED    = '\x1b[31m'
const CYAN   = '\x1b[36m'
const DIM    = '\x1b[2m'

async function main() {
  console.log(`\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`)
  console.log(`${BOLD}${CYAN}  ⚡  Commission Tracker — Seed initial${RESET}`)
  console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`)

  const username = await ask(`${BOLD}Identifiant de l'associé : ${RESET}`)
  rl.close()

  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, display_name, role')
    .eq('username', username.trim().toLowerCase())
    .single()

  if (userErr || !user) {
    console.error(`\n${RED}❌  Utilisateur "${username}" introuvable.${RESET}`)
    process.exit(1)
  }

  if (user.role !== 'associe') {
    console.error(`\n${RED}❌  L'utilisateur "${username}" n'est pas un associé (rôle : ${user.role}).${RESET}`)
    process.exit(1)
  }

  console.log(`\n${GREEN}✅  Associé trouvé : ${BOLD}${user.display_name}${RESET} (${DIM}${user.id}${RESET})\n`)

  // Vérifier si déjà des données
  const { count } = await supabase
    .from('commissions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count ?? 0) > 0) {
    console.log(`${YELLOW}⚠️  Des données existent déjà pour cet associé (${count} commissions). Abandon.${RESET}\n`)
    process.exit(0)
  }

  // Commissions
  console.log(`${CYAN}→ Insertion des commissions...${RESET}`)
  const commissions = [
    { prime_id: 'led',  ca: 4457940, commission: 204747, dossiers: 625, mois: '2025-12', status: 'due',  notes: null, user_id: user.id, created_by: user.id },
    { prime_id: 'quad', ca: 251040,  commission: 10100,  dossiers: 298, mois: '2025-12', status: 'due',  notes: null, user_id: user.id, created_by: user.id },
    { prime_id: 'velo', ca: 300150,  commission: 10350,  dossiers: 153, mois: '2025-12', status: 'due',  notes: null, user_id: user.id, created_by: user.id },
  ]
  const { data: insertedComs, error: comErr } = await supabase.from('commissions').insert(commissions).select('id')
  if (comErr) { console.error(`${RED}❌  ${comErr.message}${RESET}`); process.exit(1) }
  console.log(`${GREEN}  ✓ ${insertedComs?.length ?? 0} commission(s) insérée(s)${RESET}`)

  // Paiements
  console.log(`${CYAN}→ Insertion des paiements...${RESET}`)
  const paiements = [
    { date: '2025-12-23', montant: 3000,  label: 'Premier virement',  status: 'effectue',   commission_id: insertedComs?.[0]?.id ?? null, created_by: user.id },
    { date: '2026-01-30', montant: 10500, label: 'Virement janvier',  status: 'effectue',   commission_id: insertedComs?.[0]?.id ?? null, created_by: user.id },
    { date: '2026-02-12', montant: 20500, label: 'Virement février',  status: 'en_attente', commission_id: insertedComs?.[0]?.id ?? null, created_by: user.id },
  ]
  const { error: paiErr } = await supabase.from('paiements').insert(paiements)
  if (paiErr) { console.error(`${RED}❌  ${paiErr.message}${RESET}`); process.exit(1) }
  console.log(`${GREEN}  ✓ ${paiements.length} paiement(s) inséré(s)${RESET}`)

  // Clients
  console.log(`${CYAN}→ Insertion des clients...${RESET}`)
  const clients = [
    { nom: 'Martin Dubois',    entreprise: 'EcoHabitat',       email: 'martin@ecohabitat.fr',    telephone: '06 11 22 33 44', prime_id: 'led',  created_by: user.id },
    { nom: 'Sophie Leroy',     entreprise: 'MobilityPlus',     email: 'sophie@mobilityplus.com', telephone: '06 55 66 77 88', prime_id: 'quad', created_by: user.id },
    { nom: 'Pierre Moreau',    entreprise: 'VerdeCargo',       email: 'pierre@verdecargo.fr',    telephone: '06 99 00 11 22', prime_id: 'velo', created_by: user.id },
    { nom: 'Isabelle Lambert', entreprise: 'SolairePro',       email: 'i.lambert@solairepro.fr', telephone: '07 12 34 56 78', prime_id: 'led',  created_by: user.id },
    { nom: 'François Petit',   entreprise: 'QuadroElectrique', email: 'f.petit@quadroelec.fr',   telephone: '07 98 76 54 32', prime_id: 'quad', created_by: user.id },
  ]
  const { error: cliErr } = await supabase.from('clients').insert(clients)
  if (cliErr) { console.error(`${RED}❌  ${cliErr.message}${RESET}`); process.exit(1) }
  console.log(`${GREEN}  ✓ ${clients.length} client(s) inséré(s)${RESET}`)

  // Activity log
  await supabase.from('activity_log').insert({
    user_id: user.id, action: 'create', entity_type: 'commission',
    entity_id: insertedComs?.[0]?.id ?? user.id,
    details: { description: 'Import initial des données via script seed.ts' },
  })

  // Résumé
  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
  console.log(`\n${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`)
  console.log(`${BOLD}${GREEN}  ✅  Import terminé avec succès !${RESET}`)
  console.log(`${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`)
  console.log(`  CA total          : ${BOLD}${fmt(4_959_130)}${RESET}`)
  console.log(`  Commissions       : ${BOLD}${YELLOW}${fmt(225_197)}${RESET}`)
  console.log(`  Encaissé          : ${BOLD}${GREEN}${fmt(13_500)}${RESET}`)
  console.log(`  En attente        : ${BOLD}${YELLOW}${fmt(20_500)}${RESET}`)
  console.log(`  Restant dû        : ${BOLD}\x1b[31m${fmt(211_697)}${RESET}`)
  console.log()
}

main().catch(e => { console.error(e); process.exit(1) })
