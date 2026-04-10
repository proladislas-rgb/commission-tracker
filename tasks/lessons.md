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
