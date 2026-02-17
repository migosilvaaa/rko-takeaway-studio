export type GenerationFormat = 'video' | 'podcast' | 'slides'
export type GenerationStatus = 'queued' | 'processing' | 'rendering' | 'completed' | 'failed'
export type TonePreset = 'professional' | 'casual' | 'inspiring' | 'technical' | 'executive'
export type LengthPreset = 'short' | 'medium' | 'long'

export interface GenerationCustomization {
  language: string
  tone: TonePreset
  length: LengthPreset
  extra_instruction?: string
}

export interface TakeawayPlan {
  title: string
  hook: string
  key_points: string[]
  framing: string
  cta: string
}

export interface RAGChunk {
  id: string
  transcript_id: string
  theme: string
  content: string
  token_count: number
  similarity: number
}

export interface RAGContext {
  chunks: RAGChunk[]
  query: string
  total_tokens: number
}

export interface GenerationParams {
  user_id: string
  format: GenerationFormat
  presenter_id?: string
  customization: GenerationCustomization
}

export interface VideoParams {
  script: string
  avatar_id: string
  voice_id: string
  template_id?: string
  language: string
}

export interface AudioParams {
  script: string
  voice_id: string
  language: string
}

export interface SlidesParams {
  slides: SlideData[]
  language: string
}

export interface SlideData {
  title: string
  bullets: string[]
}

export interface GenerationOutput {
  video_url?: string
  audio_url?: string
  slides_url?: string
  thumbnail_url?: string
}
