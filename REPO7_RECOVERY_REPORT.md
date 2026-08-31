# Repo 7 Recovery Report — Leaderboard-UI-main

## Production contract

- Domain: `https://leaderboard.sv13tcg.com`
- API: `https://api.sv13tcg.com`
- Global endpoint: `GET /leaderboard`
- Public rankings do **not** require a viewer token.
- A viewer token is used only to construct the optional private `View Your Player Stats` link.

## Critical audit findings repaired

1. The previous frontend guessed many leaderboard URLs (`/stats/leaderboard`, `/duel/leaderboard`, `/players/leaderboard`, split win/loss and coin endpoints, static backend JSON paths, and token-scoped stats).
2. It silently fell back to bundled `data/player_data.json`, allowing demo players to appear as live rankings during backend/API failure.
3. It persisted `sv13.token` and `sv13.api` globally in browser localStorage and appended them broadly to navigation links.
4. It computed and sorted win-rate ranking in the browser even though leaderboard qualification and tie-breaking are authoritative backend policy.
5. The heading said `Top 10 Win/Loss Ratios` while the displayed value was actually wins / (wins + losses), i.e. win rate.
6. API failure rendered empty placeholder rankings with no explicit service state.

## Canonical backend contract verified

The current Duel Bot `routes/leaderboard.js` already provides the needed authoritative server policy:

- `minimumMatches` defaults to 3 (configurable by `LEADERBOARD_MIN_MATCHES`).
- Win-rate ranking excludes players below the minimum.
- Win-rate tie breakers are server-side: win rate desc, wins desc, losses asc, name asc.
- Coin tie breaker is server-side: coins desc, name asc.
- Payload: `{ updatedAt, minimumMatches, winRate, coins }`.

The repaired UI preserves the order supplied by the backend rather than re-ranking it client-side.

## Mock/failure policy

- Production never loads bundled player demo data.
- Explicit `?mock=1` loads only `data/mock_leaderboard.json` and visibly labels the page as developer mock mode.
- API/network/invalid-payload failure shows `Leaderboard service unavailable` plus Retry and `Leaderboard unavailable` table states.
- No fake players are substituted.

## Repository cleanup required

Delete these legacy files after applying this update:

- `data/player_data.json`
- `data/coin_bank.json`

See `_DELETE_FROM_REPO.txt`.

## Preserved

- Existing background art
- snowfall effect
- background music and local audio preference
- existing general visual theme
- mobile/tablet accessibility, now with safer horizontal table scrolling

## Deferred future work

Your Rank, ranking tabs, seasons, Top 50, search, public player profiles, rank movement, badges, provisional display, and other future leaderboard expansion remain intentionally deferred.
