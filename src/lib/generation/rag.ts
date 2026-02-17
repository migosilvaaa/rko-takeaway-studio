import { createServiceRoleClient } from '@/lib/supabase/server'
import { createEmbedding } from '@/lib/providers/openai'
import { logger } from '@/lib/utils/logger'
import { RAG_CONFIG } from '@/lib/utils/constants'
import type { UserProfile } from '@/types/user'
import type { GenerationCustomization, GenerationFormat, RAGChunk, RAGContext } from '@/types/generation'

interface RetrievalParams {
  userProfile: UserProfile
  format: GenerationFormat
  customization: GenerationCustomization
  topK?: number
}

export async function retrieveRelevantContext(params: RetrievalParams): Promise<RAGContext> {
  const { userProfile, format, customization, topK = RAG_CONFIG.TOP_K_CHUNKS } = params

  logger.info('Starting RAG retrieval', {
    user_id: userProfile.id,
    format,
    topK,
  })

  // Step 1: Build semantic query
  const query = buildSemanticQuery(params)
  logger.debug('Built semantic query', { query })

  // Step 2: Generate query embedding
  const queryEmbedding = await createEmbedding(query)
  logger.debug('Generated query embedding', { dimensions: queryEmbedding.length })

  // Step 3: Vector similarity search
  const supabase = createServiceRoleClient()

  const { data: chunks, error } = await supabase.rpc('match_transcript_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: RAG_CONFIG.SIMILARITY_THRESHOLD,
    match_count: topK * 2, // Get more for filtering
  })

  if (error) {
    logger.error('RAG retrieval error', error)
    throw new Error(`Failed to retrieve context: ${error.message}`)
  }

  if (!chunks || chunks.length === 0) {
    logger.warn('No relevant chunks found', { query })
    throw new Error('No relevant content found for this query')
  }

  logger.info('Retrieved chunks from vector search', { count: chunks.length })

  // Step 4: Diversify by theme
  const diversifiedChunks = diversifyByTheme(chunks as RAGChunk[], topK)
  logger.info('Diversified chunks by theme', {
    original_count: chunks.length,
    diversified_count: diversifiedChunks.length,
    themes: [...new Set(diversifiedChunks.map((c) => c.theme))],
  })

  // Step 5: Calculate total tokens
  const totalTokens = diversifiedChunks.reduce((sum, chunk) => sum + chunk.token_count, 0)

  return {
    chunks: diversifiedChunks,
    query,
    total_tokens: totalTokens,
  }
}

function buildSemanticQuery(params: RetrievalParams): string {
  const { userProfile, format, customization } = params

  const segments: string[] = []

  // Format intent
  segments.push(`Create a ${customization.tone} ${format} takeaway`)

  // User profile context
  if (userProfile.role) {
    segments.push(`for ${userProfile.role}`)
  }

  if (userProfile.segment) {
    segments.push(`in ${userProfile.segment} segment`)
  }

  if (userProfile.function) {
    segments.push(`from ${userProfile.function} perspective`)
  }

  if (userProfile.geo) {
    segments.push(`in ${userProfile.geo} region`)
  }

  // Extra instruction (if provided and safe)
  if (customization.extra_instruction) {
    segments.push(customization.extra_instruction)
  }

  // Format-specific hints
  switch (format) {
    case 'video':
      segments.push('focusing on visual storytelling and key messages')
      break
    case 'podcast':
      segments.push('emphasizing conversational insights and context')
      break
    case 'slides':
      segments.push('highlighting strategic takeaways and actionable insights')
      break
  }

  return segments.join(' ')
}

export function diversifyByTheme(chunks: RAGChunk[], limit: number): RAGChunk[] {
  // Group chunks by theme
  const themeGroups: Record<string, RAGChunk[]> = {}

  for (const chunk of chunks) {
    if (!themeGroups[chunk.theme]) {
      themeGroups[chunk.theme] = []
    }
    themeGroups[chunk.theme].push(chunk)
  }

  // Sort chunks within each theme by similarity (descending)
  for (const theme in themeGroups) {
    themeGroups[theme].sort((a, b) => b.similarity - a.similarity)
  }

  // Round-robin selection from themes to ensure diversity
  const result: RAGChunk[] = []
  const themeKeys = Object.keys(themeGroups)
  let themeIndex = 0

  while (result.length < limit && themeKeys.length > 0) {
    const theme = themeKeys[themeIndex]
    const themeChunks = themeGroups[theme]

    if (themeChunks && themeChunks.length > 0) {
      const chunk = themeChunks.shift()!
      result.push(chunk)
    }

    // Remove theme if exhausted
    if (!themeChunks || themeChunks.length === 0) {
      themeKeys.splice(themeIndex, 1)
      if (themeIndex >= themeKeys.length) {
        themeIndex = 0
      }
    } else {
      themeIndex = (themeIndex + 1) % themeKeys.length
    }
  }

  return result
}

export function formatContextForPrompt(context: RAGContext): string {
  return context.chunks
    .map((chunk, index) => {
      return `[THEME: ${chunk.theme}]\n${chunk.content}\n`
    })
    .join('\n---\n\n')
}
