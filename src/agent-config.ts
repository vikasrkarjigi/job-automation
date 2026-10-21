import fs from "node:fs";
import path from "node:path";
import { paths } from "./settings.ts";

export const DEFAULT_MODEL_CHAIN = ["composer-2.5", "grok-4.7", "claude-opus-5-5", "claude-fable-5-1"] as const;

export interface AgentConfig {
  /** Cursor model ids, first = preferred. */
  models: string[];
  /** When false, only the first model is used (good for trying one model). */
  fallback: boolean;
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  models: [...DEFAULT_MODEL_CHAIN],
  fallback: true,
};

const file = () => path.join(paths.data(), "agent-config.json");

export function loadAgentConfig(): AgentConfig {
  if (!fs.existsSync(file())) return { models: [...DEFAULT_AGENT_CONFIG.models], fallback: DEFAULT_AGENT_CONFIG.fallback };
  try {
    return cleanAgentConfig(JSON.parse(fs.readFileSync(file(), "utf8")));
  } catch {
    return { models: [...DEFAULT_AGENT_CONFIG.models], fallback: DEFAULT_AGENT_CONFIG.fallback };
  }
}

function cleanAgentConfig(raw: Partial<AgentConfig>): AgentConfig {
  const models = [...new Set((raw.models ?? []).map(String).filter(Boolean))].slice(0, 8);
  return {
    models: models.length ? models : [...DEFAULT_AGENT_CONFIG.models],
    fallback: raw.fallback !== false,
  };
}

export function saveAgentConfig(config: AgentConfig): AgentConfig {
  const clean = cleanAgentConfig(config);
  fs.mkdirSync(paths.data(), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(clean, null, 2) + "\n");
  return clean;
}

/** Model order for cloud agent starts. Env var overrides saved config. */
export function effectiveModelChain(cfg = loadAgentConfig()): string[] {
  const env = process.env.SHORTLIST_AGENT_MODELS?.trim();
  const list = env ? [...new Set(env.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean))] : cfg.models;
  if (!cfg.fallback && list.length) return [list[0]!];
  return list.length ? list : [...DEFAULT_AGENT_CONFIG.models];
}
