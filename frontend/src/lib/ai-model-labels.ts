/**
 * Display-name mapping for AI provider model identifiers.
 *
 * The backend exposes raw model slugs from the provider abstraction
 * (e.g. "deepseek/deepseek-v4-flash:free", "gpt-4o-mini"). These are
 * internal identifiers and MUST NOT be rendered to end users.
 *
 * This module is the single source of truth for converting an
 * internal model identifier into a clean, professional display
 * label. If a slug is unknown, the formatter falls back to a
 * derived label rather than the raw slug.
 *
 * The mapping is intentionally additive: new entries can be added
 * here without touching any UI component.
 */

const KNOWN_MODEL_LABELS: Record<string, string> = {
  // OpenRouter / DeepSeek
  'deepseek/deepseek-v4-flash:free': 'DeepSeek V4 Flash',
  'deepseek/deepseek-v4-flash': 'DeepSeek V4 Flash',
  'deepseek/deepseek-r1': 'DeepSeek R1',
  'deepseek/deepseek-chat': 'DeepSeek Chat',

  // OpenAI-compatible
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'gpt-4-turbo': 'GPT-4 Turbo',
  'gpt-3.5-turbo': 'GPT-3.5 Turbo',

  // Anthropic
  'claude-3-5-sonnet': 'Claude 3.5 Sonnet',
  'claude-3-haiku': 'Claude 3 Haiku',
};

const VENDOR_LABELS: Record<string, string> = {
  deepseek: 'DeepSeek',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  mistralai: 'Mistral',
  meta: 'Meta',
  meta_llama: 'Meta',
  perplexity: 'Perplexity',
  qwen: 'Qwen',
  cohere: 'Cohere',
};

const SOURCE_LABELS: Record<string, string> = {
  llm: 'AI',
  deterministic: 'Deterministic summary',
};

const DEFAULT_LLM_LABEL = 'AI model';
const DEFAULT_LLM_TITLE = 'AI-generated interpretation';
const DEFAULT_DETERMINISTIC_LABEL = 'Deterministic summary';
const DEFAULT_DETERMINISTIC_TITLE =
  'Deterministic summary — AI provider unavailable or unconfigured';

/**
 * Return a user-facing label for a model identifier.
 *
 * Strategy:
 *   1. Exact match against KNOWN_MODEL_LABELS.
 *   2. Vendor lookup against VENDOR_LABELS (using the slug prefix).
 *   3. Title-case fallback over the trailing slug.
 *
 * Never returns:
 *   - raw slashes
 *   - the ":free" tier suffix
 *   - the "openrouter/" or other provider-routing prefix
 */
export function formatModelLabel(model: string | null | undefined): string {
  if (!model || typeof model !== 'string') {
    return DEFAULT_LLM_LABEL;
  }

  const normalized = model.trim();
  if (!normalized) {
    return DEFAULT_LLM_LABEL;
  }

  const known = KNOWN_MODEL_LABELS[normalized];
  if (known) {
    return known;
  }

  const withoutTier = normalized.replace(/:[A-Za-z0-9_-]+$/, '');
  const knownWithoutTier = KNOWN_MODEL_LABELS[withoutTier];
  if (knownWithoutTier) {
    return knownWithoutTier;
  }

  const [vendorRaw, ...rest] = withoutTier.split('/');
  if (rest.length > 0) {
    const vendor = VENDOR_LABELS[vendorRaw.toLowerCase()];
    const modelName = humanizeSlug(rest.join('/'));
    if (vendor && modelName) {
      return `${vendor} ${modelName}`;
    }
    if (modelName) {
      return modelName;
    }
  }

  const humanized = humanizeSlug(withoutTier);
  return humanized || DEFAULT_LLM_LABEL;
}

/**
 * Return a longer-form label for tooltips / aria-labels.
 */
export function formatModelTitle(
  model: string | null | undefined,
  source: 'llm' | 'deterministic' | string | null | undefined,
): string {
  if (source === 'deterministic') {
    return DEFAULT_DETERMINISTIC_TITLE;
  }

  const label = formatModelLabel(model);
  if (label === DEFAULT_LLM_LABEL) {
    return DEFAULT_LLM_TITLE;
  }
  return `AI interpretation by ${label}`;
}

/**
 * Source-level label (e.g. "AI" vs "Deterministic summary").
 */
export function formatSourceLabel(source: string | null | undefined): string {
  if (!source) {
    return DEFAULT_DETERMINISTIC_LABEL;
  }
  return SOURCE_LABELS[source] ?? DEFAULT_DETERMINISTIC_LABEL;
}

function humanizeSlug(slug: string): string {
  if (!slug) return '';
  const stripped = slug.replace(/:[A-Za-z0-9_-]+$/, '');
  const parts = stripped.split(/[-_/]/).filter(Boolean);

  return parts
    .map((part) => {
      const lower = part.toLowerCase();
      if (/^v\d+(\.\d+)?$/i.test(lower)) {
        return part.toUpperCase();
      }
      if (/^\d/.test(lower)) {
        return part;
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}
