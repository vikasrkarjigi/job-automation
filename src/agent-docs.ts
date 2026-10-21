import fs from "node:fs";
import path from "node:path";
import { AGENT_DOC_CATALOG, type AgentDocId } from "@/agent-docs-catalog";

export { AGENT_DOC_CATALOG, type AgentDocId } from "@/agent-docs-catalog";

const AGENTS_DIR = path.join(process.cwd(), "agents");

function entry(id: string) {
  const hit = AGENT_DOC_CATALOG.find((d) => d.id === id);
  if (!hit) throw new Error(`Unknown agent guide: ${id}`);
  return hit;
}

export function loadAgentDoc(id: AgentDocId): string {
  const { file } = entry(id);
  const p = path.join(AGENTS_DIR, file);
  if (!fs.existsSync(p)) return "";
  return fs.readFileSync(p, "utf8");
}

export function saveAgentDoc(id: AgentDocId, content: string): void {
  const { file } = entry(id);
  const p = path.join(AGENTS_DIR, file);
  fs.mkdirSync(AGENTS_DIR, { recursive: true });
  fs.writeFileSync(p, content.endsWith("\n") ? content : `${content}\n`);
}

export function loadAllAgentDocs(): Record<AgentDocId, string> {
  const out = {} as Record<AgentDocId, string>;
  for (const { id } of AGENT_DOC_CATALOG) out[id] = loadAgentDoc(id);
  return out;
}
