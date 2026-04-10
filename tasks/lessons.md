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
