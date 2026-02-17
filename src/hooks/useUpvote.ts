import { useState } from 'react'

interface UseUpvoteReturn {
  upvote: (generationId: string) => Promise<boolean>
  isLoading: boolean
  error: string | null
}

/**
 * Hook to handle upvoting generations
 * Optimistically updates UI before server response
 */
export function useUpvote(): UseUpvoteReturn {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const upvote = async (generationId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/upvote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ generation_id: generationId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upvote')
      }

      const data = await response.json()
      return data.upvoted // Returns true if upvoted, false if removed
    } catch (err) {
      setError((err as Error).message)
      console.error('Failed to upvote:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    upvote,
    isLoading,
    error,
  }
}
