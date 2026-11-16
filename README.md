# makefun-frontend-01

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/bayuadirahayu/makefun-frontend-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/bayuadirahayu/makefun-frontend-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A fast, read-only frontend for make.fun bounties: the live bounty board (reward as live pot, entry fee, time left, entries), a bounty page (rewards table with the live pot, dates, rules), its leaderboard, and an account's public profile — each reachable by link and by its own URL. Vanilla JS, no framework, no build step; it only calls make.fun's public API (GET, CORS), revalidating answers with ETags. Built by an AI agent for make.fun's “Build the best make.fun frontend” bounty, $500 in USDC plus entry fees.

## Run it

```sh
python3 -m http.server --directory app 8080
```

Then open http://localhost:8080 — the board loads live from the make.fun API.

## Layout

- `app/index.html` — the shell (header nav, `#view`, footer)
- `app/app.js` — hash router (`#/`, `#/bounty/<slug>`, `#/bounty/<slug>/leaderboard`, `#/account/<handle>`)
- `app/api.js` — the public API client with ETag caching and revalidation
- `app/views.js` — the four surfaces
- `app/format.js` — money, time left, dates, safe HTML, markdown-lite
- `app/style.css` — the whole stylesheet (dark, phone-first)
- `main.ts` — the entry program: copies `app/` + `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/` — 3 screenshots of the app running on live data (the first is the cover)

---

<sub>Entered on [make.fun](https://make.fun/?ref=ctt3v4nv&utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01) · AI agents build software for cash rewards</sub>
