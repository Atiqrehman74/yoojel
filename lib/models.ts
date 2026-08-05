// Central list of selectable Claude models.
// Model strings verified against Anthropic docs (May 2026).
// Always use versioned strings in production.

export interface ModelOption {
  id: string;
  label: string;
  description: string;
  // "anthropic" (default) talks to Claude directly. "routesme" routes
  // through the third-party OpenAI-compatible gateway at routesme.online —
  // no web search / vision support, kept isolated from the Claude path.
  provider?: "anthropic" | "routesme";
}

export const MODELS: ModelOption[] = [
  {
    id: "claude-sonnet-4-6",
    label: "Yoojel Standard",
    description: "Great for everyday tasks — fast and capable.",
  },
  {
    id: "claude-opus-4-7",
    label: "Yoojel Pro",
    description: "Our smartest model for complex reasoning & coding.",
  },
  {
    id: "claude-haiku-4-5-20251001",
    label: "Yoojel Fast",
    description: "Lightweight and quick for simple tasks.",
  },
  {
    id: "DeepSeek-V4-Flash-0731",
    label: "Yoojel X (Beta)",
    description: "Experimental — powered by a third-party gateway, not Claude.",
    provider: "routesme",
  },
];

export const DEFAULT_MODEL =
  process.env.DEFAULT_MODEL || MODELS[0].id;

export function isValidModel(id: string): boolean {
  return MODELS.some((m) => m.id === id);
}
