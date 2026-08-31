# Static deployment — Repo 7

GitHub Pages settings:

- Source: Deploy from a branch
- Branch: `main`
- Folder: `/ (root)`
- Custom domain: `leaderboard.sv13tcg.com`

Cloudflare DNS:

- Type: `CNAME`
- Name: `leaderboard`
- Target: `madv313.github.io`
- Proxy: `DNS only`
- TTL: Auto

After GitHub reports `DNS check successful`, enable `Enforce HTTPS` when certificate provisioning completes.

Production smoke URL can be opened directly with **no token**:

`https://leaderboard.sv13tcg.com`

Optional player-specific navigation may be tested with a `/duelstats` or other tokenized link that supplies `?token=...`; the public leaderboard API request itself remains token-free.
