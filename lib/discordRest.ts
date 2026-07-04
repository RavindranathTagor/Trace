// Thin Discord REST helpers (no gateway needed): derive the bot's application id
// from its token (first token segment is base64 of the id), build an invite URL,
// and post messages to a channel — used for the invite link and "post briefing".

export function botIdFromToken(token: string): string | null {
  try {
    const id = Buffer.from(token.split(".")[0] ?? "", "base64").toString("utf-8");
    return /^\d{15,21}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** View Channels + Send Messages + Read Message History. */
const PERMISSIONS = 1024 + 2048 + 65536;

export function inviteUrl(token: string): string | null {
  const id = botIdFromToken(token);
  if (!id) return null;
  return `https://discord.com/oauth2/authorize?client_id=${id}&scope=bot&permissions=${PERMISSIONS}`;
}

export async function postToDiscord(token: string, channelId: string, content: string): Promise<boolean> {
  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 1990) }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
