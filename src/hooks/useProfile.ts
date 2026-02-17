import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

export interface UserProfile {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string | null
  segment: string | null
  geo: string | null
  function: string | null
  credits_remaining: number
  credits_used: number
  is_admin: boolean
}

interface UseProfileReturn {
  profile: UserProfile | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
}

/**
 * Hook to fetch and manage user profile
 */
export function useProfile(): UseProfileReturn {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/profile')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch profile')
      }

      const data = await response.json()
      setProfile(data)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
      console.error('Failed to fetch profile:', err)
    } finally {
      setIsLoading(false)
    }
  }, [status])

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      const data = await response.json()
      setProfile(data)
    } catch (err) {
      setError((err as Error).message)
      console.error('Failed to update profile:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return {
    profile,
    isLoading,
    error,
    refetch: fetchProfile,
    updateProfile,
  }
}
