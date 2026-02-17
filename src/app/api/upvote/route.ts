import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { upvoteRequestSchema } from '@/lib/validation/schemas'
import { logger } from '@/lib/utils/logger'
import { UnauthorizedError, ValidationError } from '@/lib/utils/errors'

/**
 * POST /api/upvote
 * Upvote or remove upvote from a generation
 *
 * If user has already upvoted, this will remove the upvote
 * If user hasn't upvoted, this will add an upvote
 */
export async function POST(req: Request) {
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

    // Validate request body
    const body = await req.json()
    const validated = upvoteRequestSchema.parse(body)

    logger.info('Upvote request', {
      user_id: userProfile.id,
      generation_id: validated.generation_id,
    })

    // Check if generation exists and is public
    const { data: generation } = await supabase
      .from('generations')
      .select('id, user_id, is_public, is_deleted')
      .eq('id', validated.generation_id)
      .single()

    if (!generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      )
    }

    if (generation.is_deleted) {
      return NextResponse.json(
        { error: 'Cannot upvote deleted generation' },
        { status: 400 }
      )
    }

    // Cannot upvote own generation
    if (generation.user_id === userProfile.id) {
      return NextResponse.json(
        { error: 'Cannot upvote your own generation' },
        { status: 400 }
      )
    }

    // Check if user has already upvoted
    const { data: existingUpvote } = await supabase
      .from('upvotes')
      .select('id')
      .eq('user_id', userProfile.id)
      .eq('generation_id', validated.generation_id)
      .maybeSingle()

    if (existingUpvote) {
      // Remove upvote
      await supabase
        .from('upvotes')
        .delete()
        .eq('id', existingUpvote.id)

      // Decrement count
      await supabase.rpc('decrement_upvote_count', {
        generation_uuid: validated.generation_id,
      })

      logger.info('Upvote removed', {
        user_id: userProfile.id,
        generation_id: validated.generation_id,
      })

      return NextResponse.json({
        upvoted: false,
        message: 'Upvote removed',
      })
    } else {
      // Add upvote
      await supabase.from('upvotes').insert({
        user_id: userProfile.id,
        generation_id: validated.generation_id,
      })

      // Increment count
      await supabase.rpc('increment_upvote_count', {
        generation_uuid: validated.generation_id,
      })

      logger.info('Upvote added', {
        user_id: userProfile.id,
        generation_id: validated.generation_id,
      })

      return NextResponse.json({
        upvoted: true,
        message: 'Upvote added',
      })
    }
  } catch (error) {
    if (error instanceof ValidationError || error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    logger.error('Upvote API error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
