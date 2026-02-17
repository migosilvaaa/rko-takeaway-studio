'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { useGeneration } from '@/hooks/useGeneration'
import { useUpvote } from '@/hooks/useUpvote'

export default function GenerationPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const generationId = params.id as string

  const { generation, isLoading, error } = useGeneration(generationId)
  const { upvote, isUpvoting } = useUpvote()

  // Redirect if not authenticated
  useEffect(() => {
    if (!session) {
      router.push('/')
    }
  }, [session, router])

  const handleUpvote = async () => {
    if (!generation) return
    await upvote(generation.id)
  }

  const handleDelete = async () => {
    if (!generation) return
    if (!confirm('Are you sure you want to delete this generation?')) return

    try {
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generation_id: generation.id }),
      })

      if (response.ok) {
        router.push('/board')
      } else {
        alert('Failed to delete generation')
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete generation')
    }
  }

  const getStatusMessage = () => {
    if (!generation) return ''

    switch (generation.status) {
      case 'queued':
        return 'Your generation is queued and will start shortly...'
      case 'processing':
        return generation.status_message || 'Generating your personalized content...'
      case 'rendering':
        return generation.status_message || 'Rendering media...'
      case 'completed':
        return 'Your content is ready!'
      case 'failed':
        return 'Generation failed. Please try again.'
      default:
        return 'Processing...'
    }
  }

  const getProgressValue = () => {
    if (!generation) return 0

    switch (generation.status) {
      case 'queued':
        return 10
      case 'processing':
        return 40
      case 'rendering':
        return 70
      case 'completed':
        return 100
      case 'failed':
        return 0
      default:
        return 0
    }
  }

  const isProcessing = generation?.status === 'queued' || generation?.status === 'processing' || generation?.status === 'rendering'
  const isCompleted = generation?.status === 'completed'
  const isFailed = generation?.status === 'failed'

  if (isLoading && !generation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading generation...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-red-50 border border-red-200">
            <div className="text-center">
              <p className="text-red-600 font-medium mb-4">{error}</p>
              <Button onClick={() => router.push('/create')}>
                Create New
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (!generation) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Card>
            <div className="text-center">
              <p className="text-gray-600 mb-4">Generation not found</p>
              <Button onClick={() => router.push('/create')}>
                Create New
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge variant={
            isCompleted ? 'success' :
            isFailed ? 'danger' :
            'info'
          } className="mb-2">
            {generation.status.toUpperCase()}
          </Badge>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {generation.title || 'Your Takeaway'}
          </h1>
          <p className="text-gray-600">
            Format: {generation.format.charAt(0).toUpperCase() + generation.format.slice(1)}
          </p>
        </div>

        {/* Processing State */}
        {isProcessing && (
          <Card className="mb-6">
            <div className="text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <svg
                    className="animate-spin h-8 w-8 text-rko-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {getStatusMessage()}
                </h2>
                <p className="text-gray-600 text-sm mb-6">
                  This usually takes 30-90 seconds. Feel free to wait or come back later.
                </p>
              </div>
              <Progress value={getProgressValue()} showPercentage={false} />
            </div>
          </Card>
        )}

        {/* Completed State */}
        {isCompleted && (
          <>
            {/* Media Preview */}
            <Card className="mb-6">
              <div className="space-y-4">
                {/* AI Disclosure Badge */}
                <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <Badge variant="ai">AI Generated</Badge>
                  <span className="text-xs text-gray-600">
                    This content was created by AI and is for internal use only
                  </span>
                </div>

                {/* Media Player */}
                {generation.format === 'video' && generation.output_url && (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      src={generation.output_url}
                      controls
                      className="w-full h-full"
                    >
                      Your browser does not support video playback.
                    </video>
                  </div>
                )}

                {generation.format === 'podcast' && generation.output_url && (
                  <div className="p-6 bg-gray-100 rounded-lg">
                    <audio src={generation.output_url} controls className="w-full">
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                )}

                {generation.format === 'slides' && generation.output_url && (
                  <div className="text-center p-8 bg-gray-100 rounded-lg">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Presentation Ready
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Your slides have been generated and are ready to download
                    </p>
                    <Button
                      onClick={() => window.open(generation.output_url!, '_blank')}
                      variant="primary"
                    >
                      Download Presentation
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                onClick={handleUpvote}
                variant={generation.user_has_upvoted ? 'primary' : 'outline'}
                disabled={isUpvoting}
                size="lg"
              >
                {generation.user_has_upvoted ? '❤️ Upvoted' : '🤍 Upvote'}
                {generation.upvotes_count > 0 && ` (${generation.upvotes_count})`}
              </Button>

              <Button
                onClick={() => router.push('/board')}
                variant="secondary"
                size="lg"
              >
                View Board
              </Button>

              <Button
                onClick={() => router.push('/create')}
                variant="ghost"
                size="lg"
              >
                Create Another
              </Button>

              {session?.user && generation.user_id === session.user.id && (
                <Button
                  onClick={handleDelete}
                  variant="danger"
                  size="lg"
                >
                  Delete
                </Button>
              )}
            </div>
          </>
        )}

        {/* Failed State */}
        {isFailed && (
          <Card className="bg-red-50 border border-red-200">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Generation Failed
              </h2>
              <p className="text-gray-600 mb-2">
                {generation.error_message || 'An error occurred during generation'}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Your credit has been refunded
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => router.push('/create')} variant="primary">
                  Try Again
                </Button>
                <Button onClick={() => router.push('/board')} variant="ghost">
                  View Board
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Metadata */}
        {generation && (
          <Card className="mt-6 bg-gray-50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Language</p>
                <p className="font-medium text-gray-900">{generation.language}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Tone</p>
                <p className="font-medium text-gray-900 capitalize">{generation.tone}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Length</p>
                <p className="font-medium text-gray-900 capitalize">{generation.length}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Created</p>
                <p className="font-medium text-gray-900">
                  {new Date(generation.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
