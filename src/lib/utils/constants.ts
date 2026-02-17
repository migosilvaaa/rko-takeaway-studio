export const TONE_PRESETS = {
  professional: {
    label: 'Professional',
    description: 'Clear, confident, business-focused',
  },
  casual: {
    label: 'Casual',
    description: 'Friendly, conversational, approachable',
  },
  inspiring: {
    label: 'Inspiring',
    description: 'Motivational, visionary, energetic',
  },
  technical: {
    label: 'Technical',
    description: 'Detailed, precise, data-driven',
  },
  executive: {
    label: 'Executive',
    description: 'Strategic, high-level, decisive',
  },
} as const

export const LENGTH_PRESETS = {
  short: {
    label: 'Short',
    video_seconds: 60,
    video_words: 150,
    podcast_seconds: 120,
    podcast_words: 300,
    slides_count: 5,
  },
  medium: {
    label: 'Medium',
    video_seconds: 120,
    video_words: 300,
    podcast_seconds: 240,
    podcast_words: 600,
    slides_count: 8,
  },
  long: {
    label: 'Long',
    video_seconds: 180,
    video_words: 450,
    podcast_seconds: 360,
    podcast_words: 900,
    slides_count: 12,
  },
} as const

export const LANGUAGES = {
  en: { label: 'English', code: 'en' },
  es: { label: 'Spanish', code: 'es' },
  fr: { label: 'French', code: 'fr' },
  de: { label: 'German', code: 'de' },
  pt: { label: 'Portuguese', code: 'pt' },
  ja: { label: 'Japanese', code: 'ja' },
  zh: { label: 'Chinese', code: 'zh' },
  ko: { label: 'Korean', code: 'ko' },
} as const

export const DEFAULT_CREDITS = 3
export const COST_PER_GENERATION = 1
export const MAX_EXTRA_INSTRUCTION_LENGTH = 200
export const MAX_RETRIES = 3
export const GENERATION_TIMEOUT_MS = 90000 // 90 seconds

export const RAG_CONFIG = {
  TOP_K_CHUNKS: 10,
  SIMILARITY_THRESHOLD: 0.7,
  MAX_CHUNK_TOKENS: 600,
  MIN_CHUNK_TOKENS: 300,
  CHUNK_OVERLAP_TOKENS: 50,
} as const

export const PROHIBITED_PATTERNS = [
  {
    pattern: /\$\d+(?:\.\d{1,2})?[KMB]/i,
    description: 'Financial figures',
  },
  {
    pattern: /Q[1-4]\s*(?:20|FY)\d{2}/i,
    description: 'Quarterly projections',
  },
  {
    pattern: /\b(?:competitor|versus|vs\.?|compared to)\b/i,
    description: 'Competitor mentions',
  },
  {
    pattern: /\b(?:coming soon|roadmap|future release|will launch|planning to)\b/i,
    description: 'Forward-looking statements',
  },
  {
    pattern: /\b(?:guaranteed|promise|ensure)\b/i,
    description: 'Guarantees',
  },
] as const

export const AI_DISCLOSURE_TEXT = 'This content was generated using AI and may not reflect actual statements or commitments.'
