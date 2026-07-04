// Shared types for Hindsight — the AI teammate that never forgets a decision.

export type NodeType =
  | "Decision"
  | "Person"
  | "Project"
  | "ActionItem"
  | "Reason"
  | "Blocker"
  | "Meeting"
  | "Entity"; // fallback bucket for whatever Cognee extracts

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  properties?: Record<string, unknown>;
  /** true when this node is part of the subgraph that answered the last query */
  highlighted?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Result of a recall (voice or text). */
export interface RecallResult {
  /** Natural-language answer (composed by Cognee GRAPH_COMPLETION or the caller's LLM). */
  answer: string;
  /** The traversed subgraph as text — what was sent to / used by the LLM. */
  context: string;
  /** Node ids to light up in the graph. */
  nodeIds: string[];
  /** Original source snippets (chat messages / transcript chunks) backing the answer. */
  sources?: string[];
  /** Which engine produced this answer. */
  source: "cognee" | "mock";
}

/** A single ingested meeting / chat blob. */
export interface Meeting {
  id: string;
  date: string; // ISO date
  title: string;
  attendees: string[];
  /** Raw transcript/notes — this is what gets sent to Cognee `add`. */
  text: string;
}

/** A message arriving from a chat platform adapter. */
export interface IngestMessage {
  source: "discord" | "teams" | "slack" | "manual";
  channel: string;
  author: string;
  text: string;
  ts: string; // ISO timestamp
}
