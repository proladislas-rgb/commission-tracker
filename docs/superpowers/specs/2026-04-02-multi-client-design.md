# Multi-Client Support — Design Spec

## Objectif

Permettre à l'admin (Hugues-Henri) et à l'associé (Ladislas) de gérer plusieurs clients depuis la même application. Chaque client a son propre univers de données : primes, commissions, paiements, sommes dues, factures. Drive et Email restent globaux.

## Décisions de design

- **Primes** : par client. Chaque client a ses propres primes.
- **Sélecteur client** : dropdown dans la sidebar + page dédiée `/dashboard/clients`.
- **Système de favoris** : clients épinglés visibles, les autres dans un accordéon "Autres clients".
- **State management** : Context React + localStorage (approche A).
- **Création client** : seul le nom est requis, tout le reste est optionnel.
- **Drive / Email** : globaux, indépendants du client sélectionné.
- **Factures** : par client, le template lit les infos du client sélectionné.
- **V1** : usage interne pour 2 utilisateurs (admin + associé), pas commercial.

## Supabase — Schéma

### Table `clients` (déjà créée)

```
id UUID PK DEFAULT gen_random_uuid()
name TEXT NOT NULL
siren TEXT
address TEXT
email TEXT
color TEXT DEFAULT '#6366f1'
pinned BOOLEAN DEFAULT true        ← À AJOUTER
created_by UUID → users(id)
created_at TIMESTAMPTZ DEFAULT now()
```

### Colonnes `client_id` (déjà ajoutées)

- `commissions.client_id UUID → clients(id) ON DELETE CASCADE`
- `paiements.client_id UUID → clients(id) ON DELETE CASCADE`
- `sommes_dues.client_id UUID → clients(id) ON DELETE CASCADE`
- `primes.client_id UUID → clients(id) ON DELETE CASCADE`

### Migration restante

```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT true;
```

## Architecture

### Context Provider

```
hooks/useClientContext.tsx
├─ ClientProvider
│   ├─ clients: Client[]              (depuis useClients)
│   ├─ selectedClientId: string|null   (state + localStorage)
│   ├─ selectedClient: Client|null     (dérivé)
│   ├─ pinnedClients: Client[]         (filtrés pinned=true)
│   ├─ setSelectedClientId(id)         (setter)
│   └─ Exposed via useClientContext()
```

### Data Flow

```
app/dashboard/layout.tsx
└─ ClientProvider ← wraps tout le dashboard
    ├─ Sidebar
    │   ├─ ClientSelector (dropdown, lit context)
    │   └─ Nav item "Clients" → /dashboard/clients
    │
    ├─ /dashboard (page principale)
    │   ├─ useCommissions(associeId, clientId)
    │   ├─ usePaiements(associeId, clientId)
    │   ├─ useSommesDues(clientId)
    │   ├─ primes filtrées par clientId
    │   └─ Composants reçoivent données pré-filtrées
    │
    ├─ /dashboard/clients (page gestion)
    │   ├─ Section "Clients épinglés" (cartes)
    │   ├─ Accordéon "Autres clients"
    │   └─ Modales création/édition
    │
    ├─ /dashboard/invoices ← lit selectedClient du context
    ├─ /dashboard/drive ← GLOBAL (pas de filtre)
    └─ /dashboard/email ← GLOBAL (pas de filtre)
```

## Composants

### Nouveaux (5 fichiers)

#### `hooks/useClientContext.tsx`
- `ClientProvider` : wraps `app/dashboard/layout.tsx`
- `useClientContext()` : hook pour accéder au client sélectionné
- State : `selectedClientId` persisté dans `localStorage` (clé `ct_selected_client`)
- Au mount : lit localStorage, si vide → auto-sélection du premier client épinglé
- Si aucun client n'existe → `selectedClientId = null`

#### `hooks/useClients.ts`
- Fetch tous les clients depuis Supabase (`clients` table)
- Fonctions : `add`, `update`, `remove`, `togglePin`
- Realtime Supabase activé
- Pas de filtre — charge tous les clients

#### `app/dashboard/clients/page.tsx`
- Titre "MES CLIENTS" + bouton "+ Nouveau client"
- Section "Clients épinglés" : grille de `ClientCard` pour `pinned = true`
- Section "Autres clients" : accordéon fermé par défaut, `ClientCard` pour `pinned = false`
- Modal création : Nom (requis) + Couleur (picker) + SIREN, Adresse, Email (optionnels)
- Modal édition : mêmes champs pré-remplis

#### `components/clients/ClientCard.tsx`
- Affiche : nom, couleur (dot ou barre), SIREN si renseigné
- Boutons : épingler/désépingler, modifier (ouvre modal), entrer (switch client → retour dashboard)
- Style Aurora cohérent avec le reste

#### `components/clients/ClientSelector.tsx`
- Dropdown dans la sidebar (remplace "Client: ECODISTRIB" hardcodé)
- Liste les clients épinglés
- Option "Tous les clients" → navigue vers `/dashboard/clients`
- Affiche le client sélectionné avec sa couleur (dot)
- Si aucun client → "Sélectionner un client"

### Modifiés (8 fichiers)

#### `lib/types.ts`
- Ajout type `Client` :
  ```typescript
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
  ```
- Ajout `client_id: string | null` dans `Commission`, `Paiement`, `SommeDue`, `Prime`

#### `app/dashboard/layout.tsx`
- Importer et wrapper avec `ClientProvider`

#### `app/dashboard/page.tsx`
- Lire `selectedClientId` depuis `useClientContext()`
- Passer `clientId` à `useCommissions`, `usePaiements`, `useSommesDues`
- Filtrer `loadPrimes()` par `client_id`
- Passer `clientId` à `handleCreatePrime` et `handleAddCommission` pour injecter `client_id`
- Si `selectedClientId` est null → afficher message "Sélectionnez un client"

#### `hooks/useCommissions.ts`
- Signature : `useCommissions(userId?: string, clientId?: string)`
- Ajouter `.eq('client_id', clientId)` si `clientId` fourni
- Dependency array : `[userId, clientId]`

#### `hooks/usePaiements.ts`
- Signature : `usePaiements(createdBy?: string, clientId?: string)`
- Ajouter `.eq('client_id', clientId)` si `clientId` fourni
- Dependency array : `[createdBy, clientId]`

#### `hooks/useSommesDues.ts`
- Signature : `useSommesDues(clientId?: string)`
- Ajouter `.eq('client_id', clientId)` si `clientId` fourni
- Dependency array : `[clientId]`

#### `components/layout/Sidebar.tsx`
- Remplacer le texte hardcodé "Client : ECODISTRIB" (ligne 172) par `<ClientSelector />`
- Ajouter item "Clients" dans la navigation (icône building, route `/dashboard/clients`)

#### `app/dashboard/invoices/page.tsx`
- Lire `selectedClient` depuis `useClientContext()`
- Passer nom, SIREN, adresse du client au template facture au lieu du hardcodé ECODISTRIB

## Garde-fous

- **Aucun client sélectionné** : auto-sélection du premier client épinglé au mount
- **Aucun client n'existe** : redirection vers `/dashboard/clients` avec message "Créez votre premier client"
- **Client supprimé pendant qu'il est sélectionné** : reset vers le premier client épinglé restant
- **Ajout de données** : toutes les fonctions `add` (commissions, paiements, primes, sommes dues) injectent automatiquement `client_id: selectedClientId`

## Hors scope (V1)

- Drive/Email par client
- Permissions par client (admin voit tout, associé aussi)
- Multi-associé par client
- Export/import de données entre clients
