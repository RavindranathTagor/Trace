// Trace — Company Brain MCP server.
//
// Exposes the org's live memory as MCP tools so any MCP-capable coding agent
// (Claude Code, Cursor, Windsurf, …) can consult it BEFORE it writes code:
//   • company_brain({ topic? })      → constraints · conventions · past mistakes ·
//                                        rejected designs · known bugs · ownership
//   • check_before_coding({ intent }) → the same, plus an explicit CONFLICT flag if
//                                        the intent reverses a past decision.
//
// It's a thin, stateless wrapper over the app's HTTP endpoints (secrets stay
// server-side). Run:  cd adapters && npm install && node brain-mcp.mjs
// Wire it into an agent via mcp.example.json.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const BASE = process.env.TRACE_BASE_URL ?? process.env.HINDSIGHT_BASE_URL ?? "http://localhost:3001";

const TOOLS = [
  {
    name: "company_brain",
    description:
      "Fetch the organization's live memory BEFORE writing code: architecture constraints, coding conventions, past mistakes, rejected designs, known bugs, and current ownership. Always call this before proposing or writing code so you don't reintroduce something the team already ruled out.",
    inputSchema: {
      type: "object",
      properties: { topic: { type: "string", description: "Optional area to scope to, e.g. 'database', 'billing', 'api', 'auth'." } },
    },
  },
  {
    name: "check_before_coding",
    description:
      "Check a coding intent against the org's memory. Returns the relevant constraints/mistakes AND an explicit CONFLICT flag when the intent reverses a past decision (e.g. proposing MongoDB when the team standardized on Postgres). Call this before implementing a plan.",
    inputSchema: {
      type: "object",
      properties: { intent: { type: "string", description: "What you're about to build or change, in one sentence." } },
      required: ["intent"],
    },
  },
];

const server = new Server({ name: "trace-company-brain", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    if (name === "company_brain") {
      const qs = args.topic ? `?format=md&topic=${encodeURIComponent(String(args.topic))}` : "?format=md";
      const res = await fetch(`${BASE}/api/brain/context${qs}`);
      const text = await res.text();
      return { content: [{ type: "text", text: text || "(company brain unavailable)" }] };
    }

    if (name === "check_before_coding") {
      const intent = String(args.intent ?? "").trim();
      if (!intent) return { content: [{ type: "text", text: "Provide an `intent`." }], isError: true };
      const [ctx, guard] = await Promise.all([
        fetch(`${BASE}/api/brain/context?format=md&topic=${encodeURIComponent(intent)}`).then((r) => r.text()).catch(() => ""),
        fetch(`${BASE}/api/guard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: intent, author: "coding-agent" }),
        }).then((r) => r.json()).catch(() => ({})),
      ]);
      const flag = guard?.message
        ? `⚠️ CONFLICT with a past decision — reconsider before coding:\n${guard.message}\n\n---\n\n`
        : "✅ No direct conflict with a past decision detected.\n\n---\n\n";
      return { content: [{ type: "text", text: flag + (ctx || "(memory unavailable)") }] };
    }

    return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  } catch (err) {
    return { content: [{ type: "text", text: `Error contacting Trace at ${BASE}: ${err?.message || err}` }], isError: true };
  }
});

await server.connect(new StdioServerTransport());
// stdout is the MCP channel — log to stderr only.
console.error(`Trace company-brain MCP server running (stdio) → ${BASE}`);
