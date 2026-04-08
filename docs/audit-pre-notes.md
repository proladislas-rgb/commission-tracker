# Audit global — pré-notes

Observations remontées avant l'audit systématique. À intégrer au rapport final.

## Bugs déjà observés

### B1 — Paiements orphelins invisibles (dette réelle)
**Contexte :** L'injection de facture via `/dashboard/invoices` peut créer un paiement avec `client_id: NULL` (confirmé par un enregistrement fantôme de 150 000 €, label "Facture #N3", trouvé et supprimé le 2026-04-08).

**Conséquence :**
- Le paiement n'apparaît nulle part dans l'UI car tous les tableaux dashboard filtrent par client actif
- Impossible à supprimer via l'UI standard → pollution silencieuse de la DB
- Reem AI voit la donnée (via SQL direct) et génère des insights "sans client associé" que l'utilisateur ne peut pas corriger par l'UI

**À auditer :**
- `app/api/invoice/chat/route.ts` et `components/invoice/**` : pourquoi le `client_id` n'est-il pas assigné à la création ?
- La validation Zod autorise-t-elle `client_id: null` à l'insertion ? Devrait-on le rendre obligatoire en DB ?
- Ajouter une page admin ou une vue "orphelins" pour les retrouver
- Ajouter une migration de nettoyage qui soit supprime les orphelins existants, soit rattache à un client par défaut

**Priorité :** Important (silencieux mais pollue la DB et crée de la confusion)

---
