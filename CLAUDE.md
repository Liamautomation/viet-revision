# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

PWA mobile-first de révision de vocabulaire vietnamien. App 100% statique — une seule page HTML/CSS/JS, zéro framework, zéro build step.

**Déploiement** : Vercel via Git integration (push sur `main` → auto-deploy). Repo : `Liamautomation/viet-revision`. URL : viet-revision.vercel.app

**Jamais** faire `vercel --prod` directement — passer par `git push`.

---

## Architecture

Tout est dans `index.html` (~1950 lignes). Structure interne :

1. `<head>` — meta PWA, manifest, lib QR code (CDN async)
2. `<style>` — CSS complet inline (variables CSS, dark mode violet #512feb)
3. SVG sprite (`<svg style="display:none">`) — toutes les icônes `#i-*`
4. HTML — header, tabs, panels, overlays (stats, guide, fiches)
5. `<script>` — tout le JS, organisé ainsi :
   - **Données** : `const vocab=[...]` (285 entrées, 18 catégories) + `const sentences=[...]` (41 phrases)
   - **État** : `let mainTab, mode, exT, cat, srsMode=true, audRate`
   - **SRS** : `lSRS()`, `sSRS()`, `updScore()`, `getScore()`, clé localStorage `viet_srs_v1`
   - **Audio TTS** : `speak()`, `initAudio()` via Web Speech API
   - **Clavier VN** : `buildKB(vRowId, tRowId, targetId)` — crée un clavier indépendant ciblant un input précis
   - **Tabs** : `setTab()`, `reset()`, `showCard()`
   - **Modes exercice** : `renderE()` (écriture), `renderQ()` (QCM), `renderP()` (paires), `renderPhrase()`
   - **Fiches** : `renderFlash()`, `initSwipe()`, `filterFiches()`
   - **Examen** : `renderExamSetup()`, `startExam()`, `renderExamQ()`, `showExamResults()`
   - **Prononciation** : `renderPron()`, `startReco()` (Web Speech Recognition)
   - **Sync** : `buildSyncURL()`, `syncProg()`, `checkURLImport()`, `exportData()`, `importData()`
   - **Stats** : `openStats()`, `updSRSStat()`, `statMsg()`

`sw.js` — Service Worker cache-first, version actuelle : **v38**. À bumper à chaque déploiement touchant des assets.

---

## Conventions critiques

### Bumper le SW
Chaque déploiement → incrémenter `const CACHE = 'viet-vXX'` dans `sw.js`.

### Validation des réponses
Toujours passer par `normIn(s)` pour la comparaison : NFC normalization + lowercase + apostrophes unifiées (`'` → `'`). Ne jamais comparer les strings brutes (iOS autocorrect change les apostrophes et met des majuscules).

### Deux claviers vietnamiens
`buildKB('vRow','tRow','ans')` pour l'exercice écriture. `buildKB('vRow2','tRow2','phraseAns')` pour le mode phrases. Ne pas déplacer un seul clavier dans le DOM, les deux sont indépendants.

### Données vocab
Format : `{fr:"...", vn:"...", cat:"..."}`. Catégories existantes : phrases, pronoms, verbes, restaurant, transport, questions, salutations, chiffres, adjectifs, couleurs, consonnes, nourriture, nombres, jours, quantité, moment, famille, présentation, temps.

### Sync progression
Côté JS : `buildSyncURL()` génère `https://.../#import=BASE64`. `checkURLImport()` auto-importe au load. Sur mobile, `navigator.share()` ; sur desktop, QR code via `qrcode-generator` (CDN).

### iOS PWA isolation
localStorage de la PWA est isolé du Safari browser. Le mécanisme de sync URL (`#import=...`) est le seul moyen de transférer la progression entre les deux.

---

## Prof IA (onglet `ia`)

Traduction EN→VN (texte anglais généré calibré sur le vocab) + écriture libre corrigée. Backend : `api/ai.js`, fonction serverless Vercel → DeepSeek (`deepseek-chat`, JSON forcé).

- **Env Vercel (production)** : `DEEPSEEK_API_KEY` (clé du VPS Hermes) + `AI_ACCESS_CODE` (code que l'app demande une fois, stocké localStorage `viet_ai_code`).
- 3 tâches : `generate`, `correct-translation`, `correct-free` — payload/format JSON définis dans `api/ai.js`.
- L'endpoint renvoie 401 sans le bon code — ne jamais exposer la clé côté client.
- Claviers VN dédiés : `vRow3/tRow3` → `iaAns`, `vRow4/tRow4` → `iaFree` (convention : un clavier par input).

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | App complète |
| `sw.js` | Service Worker (version à bumper) |
| `manifest.json` | Manifest PWA |
| `icon.svg` | Icône app |
| `vercel.json` | Headers Vercel (no-cache sur sw.js) |
| `api/ai.js` | Fonction serverless Prof IA (proxy DeepSeek) |
| `gen-icons.html` | Outil interne génération icônes (gitignored) |

<!-- tokenade-scaffold -->
## Explore code with the `tokenade` CLI (cheaper than reading whole files)
Use these only when you don't yet know where code lives — if you know the path, open it directly:
`tokenade map` (repo structure) · `skeleton <file…>` (signatures) · `query <symbol…>` (locate a symbol) · `impact <file…>` (dependents) · `semantic "<query>"` (search by meaning). They take MANY targets per call (`tokenade skeleton a.rs b.rs c.rs`) — batch in ONE turn.

## Reading documents & media
tokenade extends your `Read` tool: reading .pdf .docx .xlsx .xls .xlsb .pptx .odt .ods .odp .epub returns extracted text instead of failing on the binary; .mp4 .mkv .mov .webm .avi .mp3 .wav .m4a .flac .ogg .opus (and other common containers) returns what the file is plus a transcript when one is available; and .png .jpg .jpeg .gif .webp .bmp .tif .tiff .ico .tga .pnm .qoi .hdr are decoded for you — any image format you cannot display yourself is converted to PNG automatically. Just Read the path as usual.
For a big document, asking beats reading it whole — `tokenade read <file> --prompt "q1, q2"` returns only the passages that answer, and putting several questions in ONE comma-separated call is the CHEAPEST option in tokens spent.

## Fetching or searching several things
Do them in ONE call — `tokenade web <url1> <url2> …` / `tokenade search "<q1>" "<q2>" …` — they run concurrently and cost fewer tokens than one at a time.

## Compute over data with `tokenade exec`
`tokenade exec --lang python --script '<code>'` (also sh/node/ruby/awk/jq/perl) runs in a sandbox and returns ONLY its stdout. Use it to COMPUTE over data — filter/aggregate a large or structured output, pull facts across SEVERAL files, or apply one mechanical edit across many files (migration, find-replace) — in ONE script, not one command per item. It is NOT a file reader: to read content, use the parallel reads above, not `exec`. Keep scripts SHORT (aim ≤ ~20 lines): exec is for throwaway one-shot computation, not for code you will edit and iterate on — every script char is billed as output, and a long script usually means a simpler command (or a real file you Write once and run) does it cheaper. Long or quote-heavy script? `--script-file <path>` (or `--script -` on stdin) avoids shell quoting entirely.

## Commands
If you do not have hooks (i.e. you are not Claude Code or Gemini CLI), use `tokenade wrap '<cmd>'` to wrap all your commands. If there is an opportunity for compacting noisy output, tokenade will find it — and you will waste fewer tokens.
Call binaries by their PATH name, not an absolute path (`git`, not `/usr/bin/git`) — an absolute path bypasses tokenade's hook, so that command's output isn't compacted.

## Keep output lean
Keep prose terse and code minimal — every token you write is billed as output.
- **Prose:** answer directly — no preamble, recap, tool-call narration, summary, or emoji. Drop articles, filler (*just/really/basically/simply*) and hedging; fragments fine; short word over long.
- **Output:** don't paste long raw output — quote the shortest decisive line. No decorative tables.
- **Code:** write the least that works; reuse before adding (`query` / `skeleton` / `impact`, stdlib, platform feature — YAGNI).
- **Verbatim:** keep code, identifiers, API/CLI names and error strings exact — never abbreviate or paraphrase. Keep the user's language.
- **Correctness first:** fix root causes not symptoms, don't downgrade the algorithm, don't guess APIs/flags/versions — verify.
- **Full prose where terseness could mislead:** security/data-loss warnings, irreversible-action confirmations, multi-step sequences.
<!-- /tokenade-scaffold -->
