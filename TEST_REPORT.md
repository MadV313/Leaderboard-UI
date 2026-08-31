# Repo 7 Test Report

Automated regression coverage includes:

- one canonical production endpoint only
- public no-token leaderboard mode
- canonical payload parsing
- server-supplied minimum-match policy
- preservation of server ranking/tie-break order
- known W/L -> win-rate calculation display
- invalid/partial API payload rejection
- explicit `?mock=1` only
- no silent bundled demo-player fallback
- optional private Player Stats navigation only
- explicit outage/unavailable behavior
- correct `Top 10 Win Rates` semantics
- visibility/focus/periodic refresh hooks
- `leaderboard.sv13tcg.com` CNAME contract

Run:

```bash
npm test
```
