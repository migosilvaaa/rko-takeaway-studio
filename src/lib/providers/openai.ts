import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export interface ChatParams {
  model?: string
  messages: ChatCompletionMessageParam[]
  temperature?: number
  response_format?: { type: 'json_object' | 'text' }
  max_tokens?: number
}

export interface ChatResponse {
  content: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export async function chat(params: ChatParams): Promise<ChatResponse> {
  const {
    model = process.env.OPENAI_CHAT_MODEL || 'gpt-4',
    messages,
    temperature = 0.7,
    response_format,
    max_tokens,
  } = params

  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    response_format,
    max_tokens,
  })

  const choice = completion.choices[0]
  if (!choice || !choice.message.content) {
    throw new Error('No content in OpenAI response')
  }

  return {
    content: choice.message.content,
    usage: {
      prompt_tokens: completion.usage?.prompt_tokens || 0,
      completion_tokens: completion.usage?.completion_tokens || 0,
      total_tokens: completion.usage?.total_tokens || 0,
    },
  }
}

export async function createEmbedding(text: string): Promise<number[]> {
  const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large'

  const response = await openai.embeddings.create({
    model,
    input: text,
    encoding_format: 'float',
  })

  const embedding = response.data[0]?.embedding
  if (!embedding) {
    throw new Error('No embedding in OpenAI response')
  }

  return embedding
}

export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large'

  const response = await openai.embeddings.create({
    model,
    input: texts,
    encoding_format: 'float',
  })

  return response.data.map((item) => item.embedding)
}

// Helper to count tokens (approximation)
export function estimateTokenCount(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4)
}

// Helper to chunk text by token count
export function chunkText(
  text: string,
  maxTokens: number = 500,
  overlapTokens: number = 50
): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  let currentChunk: string[] = []
  let currentTokens = 0

  for (const word of words) {
    const wordTokens = estimateTokenCount(word)

    if (currentTokens + wordTokens > maxTokens && currentChunk.length > 0) {
      // Save current chunk
      chunks.push(currentChunk.join(' '))

      // Start new chunk with overlap
      const overlapWords = Math.floor(overlapTokens / 4)
      currentChunk = currentChunk.slice(-overlapWords)
      currentTokens = estimateTokenCount(currentChunk.join(' '))
    }

    currentChunk.push(word)
    currentTokens += wordTokens
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '))
  }

  return chunks
}
