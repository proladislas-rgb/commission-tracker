# Lessons Learned

## 2026-06-30
| Problème | Leçon |
|----------|-------|
| `model: 'claude-sonnet-4-20250514'` hardcodé dans 3 routes API → 404 `not_found_error` du jour où Anthropic a retiré le modèle (15/06/2026), facturation + chat Reem + insights cassés simultanément, UI affichait juste "Erreur serveur." | Les model IDs datés ont une date de retraite. Utiliser les alias non datés (`claude-sonnet-4-6`) qui pointent toujours sur une version active. Surveiller les annonces de dépréciation Anthropic. |
| Le `catch` de invoice/chat renvoyait `'Erreur serveur.'` opaque alors que l'erreur réelle (404 model not found) était parfaitement diagnostiquable | Diagnostic d'une erreur API tierce = TOUJOURS lire les logs runtime Vercel (`get_runtime_logs`) plutôt que deviner. Le message générique côté client masque la cause exacte loggée côté serveur. |
| Un push sur `main` a buildé en `target: null` (preview) sans promouvoir en prod ; le domaine `commission-tracker-neon.vercel.app` continuait à servir un vieux commit. Contredit le CLAUDE.md (« déploiement auto sur push main ») | Sur ce projet, les déploiements production passent par un **promote manuel** (action:"promote"). Ne JAMAIS annoncer un fix comme « live en prod » sur la base d'un build READY : vérifier que `get_deployment <domaine-prod>` pointe bien sur le nouveau commit/déploiement promu. |
| « Télécharger PDF » faisait `window.open` + `window.print()` → le nom du fichier dépendait de la boîte d'impression macOS (résultat : `Invoice N4 — LR Consulting.2`, sans extension `.pdf`, non ouvrable). | Le nom de fichier de « Enregistrer au format PDF » = le `<title>` du document. Forcer un titre propre ASCII (`Facture-N4`) suffit à obtenir `Facture-N4.pdf`. Imprimer depuis une **iframe cachée** (`iframe.contentWindow.print()`) au lieu d'ouvrir un onglet : pas d'onglet parasite, nettoyage sur `afterprint` + filet timeout. |
| Tentative intermédiaire : remplacer l'impression par html2canvas + jsPDF (download 1-clic). Résultat : PDF **rasterisé** (image), texte décalé verticalement — logo « LR » et « €50,000.00 » poussés vers le bas, « INVOICE » rogné. | html2canvas ré-implémente le rendu CSS et n'égale JAMAIS le navigateur (line-height serrés, `vertical-align:middle` mal interprétés). À PROSCRIRE pour un document fidélité-critique (facture client). Son rendu n'est pas reproductible hors navigateur → impossible à débugger en local. Le moteur d'impression natif donne un PDF **vectoriel** pixel-parfait + texte sélectionnable : le préférer, et régler le nom via `document.title`. Si un download strictement 1-clic est requis → Chrome headless serveur (puppeteer-core + @sparticuz/chromium), pas html2canvas. |

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

## 2026-04-27
| Problème | Leçon |
|----------|-------|
| `catch {}` muet sur l'injection facture → paiement (`InvoicePreview.tsx`) : un échec Supabase (RLS, contrainte, réseau) laissait l'utilisateur croire que le paiement était passé — bug financier silencieux | La règle du 17/04 ("jamais de catch vide sur flux user-facing") s'applique AUSSI aux flux financiers/CRUD, pas seulement aux médias. Audit ponctuel : `grep -rn "catch {}" --include="*.tsx"` à chaque session pour traquer les régressions du pattern. |

## 2026-06-01
| Problème | Leçon |
|----------|-------|
| `PUT /api/sheets/presence` faisait 3 clears + 1 set séquentiels (Promise.all de writeSheetCell) = 4 appels Google Sheets par clic → quota 60w/min/user atteint en 15 clics, UI rollback les cases | Pour toute API externe avec quota strict (Sheets, GitHub, etc.), TOUJOURS batcher les writes sur une range au lieu de paralléliser N appels individuels. Promise.all économise du temps mais pas du quota. |
| Supabase free tier auto-pause les projets après 7j d'inactivité → 503 silencieux, login "ne marche plus" alors que les mdp sont intacts | Quand un user signale une auth qui marche plus après un break > 1 semaine, vérifier en priorité le status du projet Supabase (`list_projects`). Restore = ~1-5min. Pour les outils internes critiques, garder un ping hebdomadaire ou passer Pro. |

## 2026-06-10
| Problème | Leçon |
|----------|-------|
| `git add -A` a ajouté `telegram-bot/` (repo git imbriqué) comme gitlink 160000 → faux submodule poussé sur main, clones cassés | Avant tout `git add -A`, vérifier `git status` pour les dossiers contenant un `.git/`. Un sous-repo indépendant doit être dans `.gitignore` (le dossier entier), jamais indexé. |
| Grep `catch {}` ne détecte pas les catch silencieux avec commentaire (`catch { // silencieux }`) | L'audit de session doit utiliser `grep -rn -A1 "} catch" \| grep -i "silencieux\|silent"` en plus du pattern vide. |
| `await supabase.from(...).insert(...)` dans un try/catch ne catche RIEN : supabase-js renvoie `{ error }` sans throw → échec RLS/contrainte invisible même avec catch | Toujours destructurer `const { error } = await supabase...` et `if (error) throw error`. Un try/catch seul autour d'un appel supabase-js est un faux filet de sécurité. |

## 2026-06-11
| Problème | Leçon |
|----------|-------|
| Itération mensuelle avec des objets `Date` (`setMonth`) : `new Date("YYYY-MM-DD")` parse en UTC → l'heure locale héritée varie selon DST (01:00 vs 02:00), la boucle `cursor <= end` pouvait sauter le dernier mois | Pour grouper/itérer par mois, utiliser un index entier `année×12+mois` dérivé de la string ISO (`/^(\d{4})-(\d{2})/`), jamais d'arithmétique sur des objets Date |
