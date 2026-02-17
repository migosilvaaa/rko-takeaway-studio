import { useState, useEffect, useCallback } from 'react'

export type GenerationStatus = 'queued' | 'processing' | 'rendering' | 'completed' | 'failed'

export interface Generation {
  id: string
  format: 'video' | 'podcast' | 'slides'
  language: string
  tone: string
  length: string
  status: GenerationStatus
  output_urls: {
    video_url?: string
    audio_url?: string
    slides_url?: string
    pdf_url?: string
  }
  thumbnail_url?: string
  upvotes_count: number
  views_count: number
  error_message?: string
  created_at: string
  completed_at?: string
  is_owner: boolean
  has_upvoted: boolean
  user: {
    name: string | null
    email?: string
  }
}

interface UseGenerationReturn {
  generation: Generation | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch and poll generation status
 * Automatically polls while status is queued/processing/rendering
 */
export function useGeneration(generationId: string | null): UseGenerationReturn {
  const [generation, setGeneration] = useState<Generation | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGeneration = useCallback(async () => {
    if (!generationId) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/generation/${generationId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch generation')
      }

      const data = await response.json()
      setGeneration(data)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
      console.error('Failed to fetch generation:', err)
    } finally {
      setIsLoading(false)
    }
  }, [generationId])

  useEffect(() => {
    if (!generationId) return

    let cancelled = false
    let pollInterval: NodeJS.Timeout | null = null

    async function poll() {
      if (cancelled) return

      await fetchGeneration()

      // Continue polling if status is not terminal
      if (!cancelled && generation?.status && !isTerminalStatus(generation.status)) {
        pollInterval = setTimeout(poll, 2000) // Poll every 2 seconds
      }
    }

    poll()

    return () => {
      cancelled = true
      if (pollInterval) {
        clearTimeout(pollInterval)
      }
    }
  }, [generationId, generation?.status, fetchGeneration])

  return {
    generation,
    isLoading,
    error,
    refetch: fetchGeneration,
  }
}

function isTerminalStatus(status: GenerationStatus): boolean {
  return status === 'completed' || status === 'failed'
}
