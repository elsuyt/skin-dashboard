# Skin Bots Dashboard — setup

Controls your watchlists (skin-sniper, skin-sniper account #3) and buy orders
(Steam Skins, MAIN STEAM SKINS) from one page. `BO - Account #3`'s buy orders
aren't wired in yet — it uses a different internal structure than the other
two order bots, and needs its own pass rather than a forced fit.

**How it works:** Vercel can't reach your home PC directly (and it shouldn't —
that would mean opening your PC to inbound internet traffic while it holds
live Steam sessions). So each bot pushes its own state *out* to a small cloud
database every 30 seconds, and pulls back any pending commands you queued from
the dashboard (add a skin, place an order, etc.) on its next cycle. Nothing
happens instantly — the bot applies it on its own next tick, same as it
already does for Telegram commands. No credentials ever leave your machines,
only watchlist/order data.

## 1. Create a GitHub repo and push this folder

```bash
cd "C:\Users\elias_rusrerb\Desktop\skin-dashboard"
git init
git add .
git commit -m "Initial dashboard"
```

Then create a new repo on github.com (empty, no README) and:

```bash
git remote add origin https://github.com/<you>/skin-dashboard.git
git branch -M main
git push -u origin main
```

## 2. Import into Vercel

1. Go to https://vercel.com/new
2. Import the GitHub repo you just pushed
3. Click Deploy (it'll fail once — that's expected, no env vars yet)

## 3. Add a Redis database

1. In the Vercel project, go to **Storage** tab
2. **Create Database** → pick **Redis** (via Upstash) → create it
3. Connect it to this project — Vercel auto-adds `KV_REST_API_URL` and
   `KV_REST_API_TOKEN` to your project's environment variables

## 4. Add the other two env vars

Project → **Settings** → **Environment Variables**:

| Name | Value |
|---|---|
| `SESSION_SECRET` | any random 32+ character string |
| `DASHBOARD_PASSWORD` | whatever password you want to log in with |

Then **Deployments** → latest → **Redeploy** (env var changes need a redeploy
to take effect).

## 5. Get the Redis URL/token for your bots

Same Storage tab → your Redis database → **`.env.local` tab** (or similar) —
copy the `KV_REST_API_URL` and `KV_REST_API_TOKEN` values (or the raw Upstash
`UPSTASH_REDIS_REST_URL`/`TOKEN` if you provisioned it directly on
upstash.com instead — either naming works, the bots accept both).

## 6. Paste those into each bot's `.env`

Each of these four already has the lines waiting, empty:

```
DASHBOARD_KV_URL=
DASHBOARD_KV_TOKEN=
```

Fill in the same two values in all four:

- `skin-sniper\.env`
- `skin-sniper account #3\.env`
- `Steam Skins\.env`
- `MAIN STEAM SKINS\.env`

(`DASHBOARD_BOT_KEY` is already filled in correctly per project — leave it.)

## 7. Restart each of those four bots

However you normally do it (they auto-restart under their supervisor scripts
if you just kill the process — see each project's `supervised.ps1`).

## 8. Open the dashboard, log in

Your Vercel deployment URL, password from step 4. Within ~30 seconds you
should see watches and orders populate on the **Watchlists** and **Buy
orders** pages as each bot's first sync tick lands.

---

### If something doesn't show up

- Check the bot's own log file for `dashboard sync: on, every 30s, bot key "..."` 
  right after startup — if you instead see `not configured`, the env vars
  didn't get read (typo, or forgot to restart the bot after editing `.env`).
- Check for `dashboard sync: <error>` lines — usually a wrong/expired Redis
  token, or a typo in the URL.
- The dashboard itself never talks to your bots directly, so a bot being
  offline just means its section goes stale, not that the dashboard errors.
