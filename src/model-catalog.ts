/** Client-safe model list for the dashboard (no Node imports). */

export const MODEL_CATALOG: { id: string; label: string; hint: string; accent: string }[] = [
  { id: "composer-2.5", label: "Composer 2.5", hint: "Fast Cursor agent, good default", accent: "from-violet-500/20 to-indigo-500/10" },
  { id: "composer-2.5-fast", label: "Composer 2.5 Fast", hint: "Quicker passes on large repos", accent: "from-sky-500/20 to-blue-500/10" },
  { id: "grok-4.7", label: "Grok 4.7", hint: "xAI via Cursor", accent: "from-emerald-500/20 to-teal-500/10" },
  { id: "grok-4.6", label: "Grok 4.6", hint: "Alternate Grok", accent: "from-emerald-500/15 to-cyan-500/10" },
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", hint: "Strong reasoning via Cursor", accent: "from-amber-500/20 to-orange-500/10" },
  { id: "claude-opus-5", label: "Claude Opus 5", hint: "Previous Opus generation", accent: "from-amber-500/15 to-rose-500/10" },
  { id: "claude-fable-5-1", label: "Claude Fable 5.1", hint: "Balanced Claude", accent: "from-rose-500/20 to-pink-500/10" },
  { id: "gpt-5.6-sol", label: "GPT 5.6", hint: "OpenAI via Cursor", accent: "from-slate-500/20 to-zinc-500/10" },
  { id: "gemini-4-argon", label: "Gemini 4 Argon", hint: "Google via Cursor", accent: "from-blue-500/20 to-indigo-500/10" },
];

export function modelLabel(id: string): string {
  if (id.startsWith("composer")) return "Composer";
  if (id.startsWith("grok")) return "Grok";
  if (id.startsWith("claude")) return "Claude";
  if (id.startsWith("gpt")) return "GPT";
  if (id === "default") return "Cursor default";
  return MODEL_CATALOG.find((m) => m.id === id)?.label ?? id;
}

export function catalogEntry(id: string) {
  return MODEL_CATALOG.find((m) => m.id === id) ?? { id, label: modelLabel(id), hint: "Custom model id", accent: "from-muted/40 to-muted/20" };
}
