-- TABLE CLIENTS
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  email TEXT,
  telephone TEXT,
  entreprise TEXT,
  prime_id TEXT REFERENCES primes(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER PUBLICATION supabase_realtime ADD TABLE clients;
-- RLS activé — les policies sont gérées via le dashboard Supabase ou un fichier de migration dédié
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_clients_prime ON clients(prime_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);

-- COLONNE STATUS sur paiements
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'en_attente'
  CHECK (status IN ('effectue', 'en_attente', 'en_retard'));
