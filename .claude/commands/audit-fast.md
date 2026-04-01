---
description: Audit complet — nettoie, corrige, optimise
---

Exécute cet audit complet du projet :

1. npm run build + npx tsc --noEmit + npx eslint . --ext .ts,.tsx → corrige toutes les erreurs
2. Supprime TOUT le code mort : imports inutilisés, fonctions jamais appelées, fichiers orphelins, console.log, commentaires obsolètes
3. Remplace tous les ": any" par les vrais types TypeScript
4. Vérifie les conflits : styles CSS incohérents, imports cassés, routes API manquantes, variables .env.local manquantes
5. Vérifie la performance : useMemo sur calculs lourds, useCallback sur props, cleanup des useEffect
6. Vérifie la sécurité : try/catch sur tous les appels Supabase et API, tokens en HttpOnly, clé API jamais exposée côté client
7. Recompile : npm run build → 0 erreurs, npx tsc --noEmit → 0 erreurs, eslint → 0 erreurs
8. Affiche un tableau récapitulatif : fichiers audités, erreurs corrigées, code mort supprimé, résultat final
