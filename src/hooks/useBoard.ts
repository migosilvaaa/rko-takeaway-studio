import { useState, useEffect, useCallback } from 'react'
import type { Generation } from './useGeneration'

interface BoardFilters {
  format?: 'video' | 'podcast' | 'slides'
  time_filter?: 'day' | 'week' | 'month' | 'all'
  limit?: number
  offset?: number
}

interface UseBoardReturn {
  generations: Generation[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
}

/**
 * Hook to fetch trending generations for the social board
 */
export function useBoard(filters: BoardFilters = {}): UseBoardReturn {
  const [generations, setGenerations] = useState<Generation[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState<number>(0)
  const [hasMore, setHasMore] = useState<boolean>(true)

  const limit = filters.limit || 20

  const fetchBoard = useCallback(
    async (currentOffset: number = 0, append: boolean = false) => {
      setIsLoading(true)

      try {
        const params = new URLSearchParams({
          ...(filters.format && { format: filters.format }),
          time_filter: filters.time_filter || 'month',
          limit: limit.toString(),
          offset: currentOffset.toString(),
        })

        const response = await fetch(`/api/board?${params}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch board')
        }

        const data = await response.json()

        if (append) {
          setGenerations((prev) => [...prev, ...data.generations])
        } else {
          setGenerations(data.generations)
        }

        setHasMore(data.generations.length === limit)
        setError(null)
      } catch (err) {
        setError((err as Error).message)
        console.error('Failed to fetch board:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [filters.format, filters.time_filter, limit]
  )

  const loadMore = async () => {
    const newOffset = offset + limit
    setOffset(newOffset)
    await fetchBoard(newOffset, true)
  }

  const refetch = async () => {
    setOffset(0)
    await fetchBoard(0, false)
  }

  useEffect(() => {
    setOffset(0)
    fetchBoard(0, false)
  }, [fetchBoard])

  return {
    generations,
    isLoading,
    error,
    refetch,
    loadMore,
    hasMore,
  }
}
