'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { useProfile } from '@/hooks/useProfile'
import { createClientSupabase } from '@/lib/supabase/client'
import type { GenerationFormat, GenerationTone, GenerationLength } from '@/types/generation'

interface Presenter {
  id: string
  name: string
  title: string
}

export default function CreatePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { profile, isLoading: profileLoading } = useProfile()

  const [presenters, setPresenters] = useState<Presenter[]>([])
  const [loadingPresenters, setLoadingPresenters] = useState(true)

  const [format, setFormat] = useState<GenerationFormat>('video')
  const [presenterId, setPresenterId] = useState<string>('')
  const [language, setLanguage] = useState('en')
  const [tone, setTone] = useState<GenerationTone>('professional')
  const [length, setLength] = useState<GenerationLength>('medium')
  const [extraInstruction, setExtraInstruction] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  // Fetch presenters
  useEffect(() => {
    async function fetchPresenters() {
      try {
        const supabase = createClientSupabase()
        const { data, error } = await supabase
          .from('leader_presenters')
          .select('id, name, title')
          .eq('enabled', true)
          .order('name')

        if (error) throw error
        setPresenters(data || [])
        if (data && data.length > 0) {
          setPresenterId(data[0].id)
        }
      } catch (err) {
        console.error('Failed to fetch presenters:', err)
      } finally {
        setLoadingPresenters(false)
      }
    }

    if (session) {
      fetchPresenters()
    }
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!profile) {
      setError('Profile not loaded')
      return
    }

    if (profile.credits_remaining < 1) {
      setError('Insufficient credits. You need at least 1 credit to generate content.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          presenter_id: format === 'video' ? presenterId : null,
          language,
          tone,
          length,
          extra_instruction: extraInstruction || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create generation')
      }

      // Redirect to generation status page
      router.push(`/generation/${data.generation_id}`)
    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create generation')
      setIsSubmitting(false)
    }
  }

  if (status === 'loading' || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Your Takeaway
          </h1>
          <p className="text-gray-600">
            Generate personalized content from the keynote transcript
          </p>
          {profile && (
            <div className="mt-4">
              <Badge variant="info">
                {profile.credits_remaining} Credits Remaining
              </Badge>
            </div>
          )}
        </div>

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Content Format
              </label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setFormat('video')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    format === 'video'
                      ? 'border-rko-primary bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">🎥</div>
                    <div className="font-medium">Video</div>
                    <div className="text-xs text-gray-500">AI Avatar</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('podcast')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    format === 'podcast'
                      ? 'border-rko-primary bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">🎙️</div>
                    <div className="font-medium">Podcast</div>
                    <div className="text-xs text-gray-500">Audio Only</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('slides')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    format === 'slides'
                      ? 'border-rko-primary bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">📊</div>
                    <div className="font-medium">Slides</div>
                    <div className="text-xs text-gray-500">Presentation</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Presenter Selection (only for video) */}
            {format === 'video' && (
              <Select
                label="Presenter"
                value={presenterId}
                onChange={(e) => setPresenterId(e.target.value)}
                disabled={loadingPresenters || presenters.length === 0}
              >
                {loadingPresenters ? (
                  <option>Loading presenters...</option>
                ) : presenters.length === 0 ? (
                  <option>No presenters available</option>
                ) : (
                  presenters.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.title}
                    </option>
                  ))
                )}
              </Select>
            )}

            {/* Customization Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="pt">Portuguese</option>
              </Select>

              <Select
                label="Tone"
                value={tone}
                onChange={(e) => setTone(e.target.value as GenerationTone)}
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="inspiring">Inspiring</option>
                <option value="technical">Technical</option>
                <option value="executive">Executive</option>
              </Select>

              <Select
                label="Length"
                value={length}
                onChange={(e) => setLength(e.target.value as GenerationLength)}
              >
                <option value="short">Short (~60s)</option>
                <option value="medium">Medium (~90s)</option>
                <option value="long">Long (~120s)</option>
              </Select>
            </div>

            {/* Extra Instructions */}
            <div>
              <label
                htmlFor="extraInstruction"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Additional Instructions (Optional)
              </label>
              <textarea
                id="extraInstruction"
                value={extraInstruction}
                onChange={(e) => setExtraInstruction(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="E.g., 'Focus on sales enablement' or 'Emphasize customer success stories'"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rko-primary focus:border-transparent transition-all resize-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                {extraInstruction.length}/200 characters • Tone/framing only (no new facts)
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push('/')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={isSubmitting || !profile || profile.credits_remaining < 1}
              >
                Generate (1 Credit)
              </Button>
            </div>
          </form>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-blue-50 border border-blue-100">
          <div className="flex gap-3">
            <div className="text-2xl">ℹ️</div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                How it works
              </h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Content is personalized to your role, segment, and function</li>
                <li>• Generation takes 30-90 seconds depending on format</li>
                <li>• All outputs include AI disclosure badges</li>
                <li>• Share your creation to the trending board for upvotes</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
