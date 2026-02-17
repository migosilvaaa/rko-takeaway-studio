import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { UnauthorizedError, NotFoundError } from '@/lib/utils/errors'

/**
 * GET /api/generation/[id]
 * Get generation status and details
 *
 * Used for polling during generation process
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Validate user session
    const session = await getServerSession()
    if (!session?.user?.email) {
      throw new UnauthorizedError('Authentication required')
    }

    const generationId = params.id
    const userEmail = session.user.email

    logger.debug('Generation status check', {
      generation_id: generationId,
      user_email: userEmail,
    })

    // Get user profile
    const supabase = createServiceRoleClient()
    const { data: userProfile } = await supabase
      .from('users_profile')
      .select('id, is_admin')
      .eq('email', userEmail)
      .single()

    if (!userProfile) {
      throw new UnauthorizedError('User profile not found')
    }

    // Get generation
    const { data: generation, error } = await supabase
      .from('generations')
      .select(`
        *,
        users_profile!inner(id, name, email)
      `)
      .eq('id', generationId)
      .single()

    if (error || !generation) {
      logger.warn('Generation not found', { generation_id: generationId })
      throw new NotFoundError('Generation', generationId)
    }

    // Check access permissions
    const isOwner = generation.user_id === userProfile.id
    const isAdmin = userProfile.is_admin
    const isPublic = generation.is_public && !generation.is_deleted

    if (!isOwner && !isAdmin && !isPublic) {
      throw new UnauthorizedError('Access denied to this generation')
    }

    // Check if user has upvoted (if not the owner)
    let has_upvoted = false
    if (!isOwner) {
      const { data: upvote } = await supabase
        .from('upvotes')
        .select('id')
        .eq('user_id', userProfile.id)
        .eq('generation_id', generationId)
        .maybeSingle()

      has_upvoted = !!upvote
    }

    // Return generation details
    return NextResponse.json({
      id: generation.id,
      format: generation.format,
      language: generation.language,
      tone: generation.tone,
      length: generation.length,
      status: generation.status,
      output_urls: generation.output_urls || {},
      thumbnail_url: generation.thumbnail_url,
      upvotes_count: generation.upvotes_count,
      views_count: generation.views_count,
      error_message: generation.error_message,
      created_at: generation.created_at,
      completed_at: generation.completed_at,
      is_owner: isOwner,
      has_upvoted,
      user: {
        name: generation.users_profile.name,
        email: isOwner || isAdmin ? generation.users_profile.email : undefined,
      },
    })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    logger.error('Generation status API error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
