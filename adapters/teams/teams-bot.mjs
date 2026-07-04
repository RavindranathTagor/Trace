// Hindsight Microsoft Teams adapter (Bot Framework).
// - Auto-ingests EVERY standard-channel message into Cognee via POST /api/ingest
//   (requires the RSC permission ChannelMessage.Read.Group in the app manifest,
//    which lets the bot receive messages without being @mentioned).
// - Mentioning the bot answers from the team's memory in-channel.
//
// Run:  cd adapters && npm install && node teams/teams-bot.mjs
// Needs a public HTTPS tunnel (VS Code dev tunnel / ngrok) pointing at this
// server's /api/messages, set as the bot's messaging endpoint in Azure.
//
// Env: MicrosoftAppId, MicrosoftAppPassword, MicrosoftAppType (SingleTenant|MultiTenant),
//      MicrosoftAppTenantId (for SingleTenant), PORT (default 3978),
//      HINDSIGHT_BASE_URL (default http://localhost:3001).

import restify from "restify";
import {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  ConfigurationServiceClientCredentialFactory,
  ActivityHandler,
  TurnContext,
} from "botbuilder";

const BASE = process.env.TRACE_BASE_URL ?? process.env.HINDSIGHT_BASE_URL ?? "http://localhost:3001";

const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
  MicrosoftAppId: process.env.MicrosoftAppId,
  MicrosoftAppPassword: process.env.MicrosoftAppPassword,
  MicrosoftAppType: process.env.MicrosoftAppType || "MultiTenant",
  MicrosoftAppTenantId: process.env.MicrosoftAppTenantId,
});
const botFrameworkAuth = new ConfigurationBotFrameworkAuthentication({}, credentialsFactory);
const adapter = new CloudAdapter(botFrameworkAuth);
adapter.onTurnError = async (_context, error) => {
  console.error("[teams] turn error:", error);
};

async function recall(query) {
  const res = await fetch(`${BASE}/api/recall`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, onlyContext: false }),
  });
  const data = await res.json();
  return data.answer || "I couldn't find that in the team's memory.";
}

async function ingest(context, text) {
  const a = context.activity;
  await fetch(`${BASE}/api/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "teams",
      channel: a.conversation?.id ?? "unknown",
      author: a.from?.name ?? "unknown",
      text,
      ts: a.timestamp ? new Date(a.timestamp).toISOString() : new Date().toISOString(),
    }),
  });
}

class HindsightTeamsBot extends ActivityHandler {
  constructor() {
    super();
    this.onMessage(async (context, next) => {
      const mentioned = TurnContext.getMentions(context.activity).some(
        (m) => m.mentioned?.id === context.activity.recipient?.id,
      );
      const text = (context.activity.text || "").replace(/<at>.*?<\/at>/g, "").trim();

      if (mentioned && text) {
        await context.sendActivity(await recall(text));
      } else if (text) {
        try {
          await ingest(context, text);
        } catch (err) {
          console.error("[teams] ingest failed:", err);
        }
      }
      await next();
    });
  }
}

const bot = new HindsightTeamsBot();

const server = restify.createServer();
server.use(restify.plugins.bodyParser());
server.post("/api/messages", async (req, res) => {
  await adapter.process(req, res, (context) => bot.run(context));
});

const port = process.env.PORT || 3978;
server.listen(port, () => {
  console.log(`Hindsight Teams adapter listening on :${port} (POST /api/messages)`);
  console.log(`Ingesting -> ${BASE}/api/ingest`);
});
