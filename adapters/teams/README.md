# Hindsight — Microsoft Teams adapter

Auto-ingests **every standard-channel message** into Hindsight's Cognee memory (via the
RSC permission `ChannelMessage.Read.Group`, so the bot doesn't need to be @mentioned),
and answers from memory when you @mention it.

> Teams is the heaviest integration (Azure AD app + Bot Framework + public tunnel).
> If you're short on time, the **Discord adapter** (`../discord-bot.mjs`) proves the same
> live auto-ingest with zero Azure setup and no tunnel. Build Teams as the enterprise headline.

## Prerequisites
- An Azure account and a Microsoft 365 tenant where you can sideload a custom Teams app.
- A public HTTPS tunnel (VS Code **Dev Tunnels** or `ngrok http 3978`).

## 1. Register the bot (Azure)
1. Azure Portal → **App registrations** → New registration (Multi-tenant is simplest).
   Copy the **Application (client) ID** → this is `{{BOT_ID}}`.
2. **Certificates & secrets** → new client secret → copy the value → `MicrosoftAppPassword`.
3. Azure Portal → create an **Azure Bot** resource; set its **Messaging endpoint** to
   `https://<your-tunnel>/api/messages`; enable the **Microsoft Teams** channel.

## 2. Configure & run the adapter
```bash
cd adapters && npm install
MicrosoftAppId={{BOT_ID}} \
MicrosoftAppPassword=<secret> \
MicrosoftAppType=MultiTenant \
HINDSIGHT_BASE_URL=http://localhost:3001 \
PORT=3978 \
node teams/teams-bot.mjs
# then start your tunnel:  ngrok http 3978   (point the Azure messaging endpoint at it)
```

## 3. Package & sideload the Teams app
1. In `manifest/`, replace `{{BOT_ID}}` with your app id and `{{APP_DOMAIN}}` with your
   tunnel host (e.g. `abc123.ngrok-free.app`), and add `color.png` (192×192) + `outline.png` (32×32).
2. Zip `manifest.json` + the two icons into `hindsight.zip`.
3. Teams → **Apps → Manage your apps → Upload a custom app** → upload `hindsight.zip`.
4. **Add the app to a team** (a standard channel). RSC activates on this fresh install,
   so the bot then receives all messages in that channel.

## Verify
Post a message in the channel → it appears in the Hindsight graph after a debounced cognify.
`@Hindsight what did we decide about pricing?` → it answers in-channel.

### Notes / limits
- RSC `ChannelMessage.Read.Group` covers **standard** channels only. Private/shared channels
  need tenant-admin `ChannelMessage.Read.All` — out of scope here.
- Some tenants under-deliver non-mention messages even with RSC; if so, demo the live beat
  via Discord and keep a recorded Teams clip.
