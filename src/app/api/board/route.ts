import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { boardQuerySchema } from '@/lib/validation/schemas'
import { logger } from '@/lib/utils/logger'
import { UnauthorizedError } from '@/lib/utils/errors'

/**
 * GET /api/board
 * Get trending generations for the social board
 *
 * Supports filtering by:
 * - format (video, podcast, slides)
 * - time_filter (day, week, month, all)
 * - pagination (limit, offset)
 */
export async function GET(req: Request) {
  try {
    // Validate user session
    const session = await getServerSession()
    if (!session?.user?.email) {
      throw new UnauthorizedError('Authentication required')
    }

    const userEmail = session.user.email

    // Get user profile
    const supabase = createServiceRoleClient()
    const { data: userProfile } = await supabase
      .from('users_profile')
      .select('id')
      .eq('email', userEmail)
      .single()

    if (!userProfile) {
      throw new UnauthorizedError('User profile not found')
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const query = boardQuerySchema.parse({
      format: searchParams.get('format'),
      time_filter: searchParams.get('time_filter') || 'month',
      limit: searchParams.get('limit') || '20',
      offset: searchParams.get('offset') || '0',
    })

    logger.debug('Board request', {
      user_id: userProfile.id,
      ...query,
    })

    // Calculate time filter interval
    const timeIntervals = {
      day: '1 day',
      week: '7 days',
      month: '30 days',
      all: '365 days', // Use 1 year as "all" to avoid infinite queries
    }
    const timeInterval = timeIntervals[query.time_filter]

    // Use database function for trending generations
    const { data: generations, error } = await supabase.rpc(
      'get_trending_generations',
      {
        limit_count: query.limit,
        offset_count: query.offset,
        format_filter: query.format || null,
        time_filter: timeInterval,
      }
    )

    if (error) {
      logger.error('Failed to fetch trending generations', error)
      throw new Error('Failed to fetch board data')
    }

    // Check which generations the user has upvoted
    const generationIds = generations.map((g: any) => g.id)
    const { data: userUpvotes } = await supabase
      .from('upvotes')
      .select('generation_id')
      .eq('user_id', userProfile.id)
      .in('generation_id', generationIds)

    const upvotedIds = new Set(userUpvotes?.map((u) => u.generation_id) || [])

    // Format response
    const formattedGenerations = generations.map((gen: any) => ({
      id: gen.id,
      format: gen.format,
      language: gen.language,
      tone: gen.tone,
      output_urls: gen.output_urls,
      thumbnail_url: gen.thumbnail_url,
      upvotes_count: gen.upvotes_count,
      views_count: gen.views_count,
      created_at: gen.created_at,
      user: {
        name: gen.user_name,
        email: gen.user_email,
      },
      has_upvoted: upvotedIds.has(gen.id),
      is_owner: gen.user_id === userProfile.id,
    }))

    logger.info('Board data fetched', {
      count: formattedGenerations.length,
      format: query.format,
      time_filter: query.time_filter,
    })

    return NextResponse.json({
      generations: formattedGenerations,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        total: formattedGenerations.length,
      },
    })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    logger.error('Board API error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
