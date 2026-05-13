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

`sw.js` — Service Worker cache-first, version actuelle : **v12**. À bumper à chaque déploiement touchant des assets.

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

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | App complète |
| `sw.js` | Service Worker (version à bumper) |
| `manifest.json` | Manifest PWA |
| `icon.svg` | Icône app |
| `vercel.json` | Headers Vercel (no-cache sur sw.js) |
| `gen-icons.html` | Outil interne génération icônes (gitignored) |
