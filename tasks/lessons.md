# Lessons Learned

## 2026-04-08
| Problème | Leçon |
|----------|-------|
| Env var `SERVICE_ROLE_KEY` mal nommée en prod → fallback anon silencieux | Fail-loud : jamais de fallback silencieux sur les secrets. Throw explicite si manquant. |
| Cookie OAuth inversé (httpOnly sur le mauvais cookie) | Toujours vérifier les attributs de sécurité des cookies manuellement |
| XSS dans digest email | Sanitizer tout contenu user avant injection HTML |
| Usurpation identité chat | Valider côté serveur l'identité de l'auteur, jamais faire confiance au client |
| N+1 queries sur unread badge | Extraire les queries et Promise.all pour paralléliser |
| Fallback silencieux masque les vrais bugs pendant des mois | Préférer throw > fallback, surtout en auth/sécu |

## 2026-04-10
| Problème | Leçon |
|----------|-------|
| Checkboxes Google Sheets renvoient "TRUE"/"FALSE", pas "X" — `.trim()` truthy sur "FALSE" | Toujours vérifier le format réel des données du Sheet avant de coder le parsing |
| Lignes titre/compteurs du Sheet parsées comme données | Filtrer par format date valide, pas juste "non vide" |
| rowIndex calculé ne correspondait pas au vrai numéro de ligne (headers multiples) | Tracker le sheetRow réel dès le parsing, ne jamais calculer un offset manuellement |
| Scope OAuth changé → refresh token cassé, pas de bouton disconnect | Toujours prévoir un endpoint disconnect Google quand on touche aux scopes |
| Google Sheets API non activée dans le projet GCP | Vérifier que les APIs nécessaires sont activées AVANT de coder l'intégration |

## 2026-04-17
| Problème | Leçon |
|----------|-------|
| `catch {}` silencieux sur `getUserMedia` + sur `fetch` upload chat → vocaux "cassés" sans aucun signal, diagnostic impossible | Jamais de catch vide sur des flux user-facing. Minimum : `console.error` + bandeau d'erreur visible avec le nom de l'erreur (DOMException.name, code API). |
| `setConnected(data.error !== 'not_connected')` dans workspace → classait `refresh_failed`, `token_expired`, `invalid_tokens` comme "connecté" ⇒ user voyait la page OK mais tout échouait après changement de mdp Google | Pour un check de connexion OAuth : toute réponse 401 = non connecté. Enumerer explicitement tous les codes d'erreur, jamais filtrer par négation d'un seul code. |
| Changement de mdp Google révoque le refresh token quand le scope inclut Gmail — comportement Google non documenté côté app | Prévoir un flux reconnect UI dès qu'on a le scope Gmail. Le bouton "Reconnecter Google" doit pointer vers `/api/auth/google/disconnect` pour purger le cookie + relancer le consent OAuth. |
| Allowlist MIME en exact-match rejetait `audio/webm;codecs=opus` renvoyé par MediaRecorder → vocaux tous bloqués par le serveur avec "Type de fichier non autorisé" | Normaliser le MIME avec `file.type.split(';')[0].trim().toLowerCase()` avant check allowlist. Les navigateurs ajoutent souvent des params codec au Content-Type. |
| Set d'erreurs OAuth dupliqué dans 4+ fichiers (workspace, calendrier-presence, ChatWindow, etc.) → drift inévitable (invalid_tokens oublié dans ChatWindow) | Centraliser dans `lib/google.ts` (`OAUTH_ERROR_CODES`, `isOAuthError(code)`). Toute check OAuth passe par le helper. |
| `refresh_failed` laisse le cookie google_tokens en place 30j → chaque requête paie un round-trip Google qui échoue | Auto-purger le cookie côté serveur dans TOUTES les routes qui tentent un refresh (`clearGoogleTokensCookie` dans `lib/google.ts`). Self-healing : prochaine requête voit `not_connected`, UI déclenche reconnect. |
| CSRF sur `/api/auth/google/disconnect` (GET) : n'importe quel `<a href>` externe pouvait forcer un logout Google de l'utilisateur authentifié | Passer en POST + check Origin strict. Les liens UI utilisent un `<button>` qui fait `fetch POST` puis redirect. |
| Détails d'erreur Supabase (`uploadError.message`, `insertError.message`) renvoyés au client → leak de noms de buckets/tables/policies | Logger les détails côté serveur (`console.error`), renvoyer au client un code opaque (`upload_failed`, `insert_failed`). |
