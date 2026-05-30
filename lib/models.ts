// Central list of selectable Claude models.
// Model strings verified against Anthropic docs (May 2026).
// Always use versioned strings in production.

export interface ModelOption {
  id: string;
  label: string;
  description: string;
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
];

export const DEFAULT_MODEL =
  process.env.DEFAULT_MODEL || MODELS[0].id;

export function isValidModel(id: string): boolean {
  return MODELS.some((m) => m.id === id);
}
