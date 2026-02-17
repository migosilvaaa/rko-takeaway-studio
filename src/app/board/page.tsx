'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { useBoard } from '@/hooks/useBoard'
import { useUpvote } from '@/hooks/useUpvote'
import type { GenerationFormat } from '@/types/generation'

type TimeRange = 'all' | 'day' | 'week' | 'month'

export default function BoardPage() {
  const router = useRouter()
  const [formatFilter, setFormatFilter] = useState<GenerationFormat | 'all'>('all')
  const [timeRange, setTimeRange] = useState<TimeRange>('all')

  const { generations, isLoading, error, hasMore, loadMore, isLoadingMore } = useBoard({
    format: formatFilter === 'all' ? undefined : formatFilter,
    timeRange: timeRange === 'all' ? undefined : timeRange,
  })

  const { upvote, isUpvoting } = useUpvote()

  const handleUpvote = async (generationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await upvote(generationId)
  }

  const getFormatIcon = (format: GenerationFormat) => {
    switch (format) {
      case 'video':
        return '🎥'
      case 'podcast':
        return '🎙️'
      case 'slides':
        return '📊'
    }
  }

  const getFormatColor = (format: GenerationFormat) => {
    switch (format) {
      case 'video':
        return 'text-blue-600'
      case 'podcast':
        return 'text-purple-600'
      case 'slides':
        return 'text-green-600'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Trending Board
          </h1>
          <p className="text-gray-600">
            Discover and upvote the best AI-generated takeaways
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format
              </label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={formatFilter === 'all' ? 'primary' : 'ghost'}
                  onClick={() => setFormatFilter('all')}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={formatFilter === 'video' ? 'primary' : 'ghost'}
                  onClick={() => setFormatFilter('video')}
                >
                  🎥 Video
                </Button>
                <Button
                  size="sm"
                  variant={formatFilter === 'podcast' ? 'primary' : 'ghost'}
                  onClick={() => setFormatFilter('podcast')}
                >
                  🎙️ Podcast
                </Button>
                <Button
                  size="sm"
                  variant={formatFilter === 'slides' ? 'primary' : 'ghost'}
                  onClick={() => setFormatFilter('slides')}
                >
                  📊 Slides
                </Button>
              </div>
            </div>

            <Select
              label="Time Range"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            >
              <option value="all">All Time</option>
              <option value="day">Last 24 Hours</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
            </Select>
          </div>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading trending content...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="bg-red-50 border border-red-200">
            <p className="text-red-600 text-center">{error}</p>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && generations.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No content yet
              </h2>
              <p className="text-gray-600 mb-6">
                Be the first to create and share content!
              </p>
              <Button onClick={() => router.push('/create')}>
                Create Content
              </Button>
            </div>
          </Card>
        )}

        {/* Generations Grid */}
        {generations.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generations.map((gen) => (
                <Card
                  key={gen.id}
                  hover
                  className="cursor-pointer"
                  onClick={() => router.push(`/generation/${gen.id}`)}
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-gradient-to-br from-rko-primary to-rko-secondary rounded-lg mb-4 flex items-center justify-center">
                    <span className={`text-6xl ${getFormatColor(gen.format)}`}>
                      {getFormatIcon(gen.format)}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    {/* Format Badge */}
                    <div className="flex items-center justify-between">
                      <Badge variant="default">
                        {gen.format.charAt(0).toUpperCase() + gen.format.slice(1)}
                      </Badge>
                      <Badge variant="ai">AI</Badge>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-gray-900 line-clamp-2 min-h-[3rem]">
                      {gen.title || 'Untitled Takeaway'}
                    </h3>

                    {/* Metadata */}
                    <div className="flex items-center text-xs text-gray-500 gap-2">
                      <span className="capitalize">{gen.tone}</span>
                      <span>•</span>
                      <span className="capitalize">{gen.length}</span>
                      <span>•</span>
                      <span>{new Date(gen.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Upvote Button */}
                    <div className="pt-3 border-t border-gray-200">
                      <Button
                        size="sm"
                        variant={gen.user_has_upvoted ? 'primary' : 'outline'}
                        onClick={(e) => handleUpvote(gen.id, e)}
                        disabled={isUpvoting}
                        className="w-full"
                      >
                        {gen.user_has_upvoted ? '❤️' : '🤍'} {gen.upvotes_count} Upvotes
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center mt-8">
                <Button
                  onClick={loadMore}
                  isLoading={isLoadingMore}
                  disabled={isLoadingMore}
                  size="lg"
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}

        {/* Info Card */}
        <Card className="mt-8 bg-blue-50 border border-blue-100">
          <div className="flex gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                How Trending Works
              </h3>
              <p className="text-sm text-gray-700">
                Content is ranked by upvotes. The most popular takeaways rise to the top.
                Create engaging content and share it with your team to climb the leaderboard!
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
