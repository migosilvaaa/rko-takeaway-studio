import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { deleteRequestSchema } from '@/lib/validation/schemas'
import { logger } from '@/lib/utils/logger'
import { UnauthorizedError, ValidationError, NotFoundError } from '@/lib/utils/errors'

/**
 * POST /api/delete
 * Soft delete user's own generation
 *
 * Soft delete means setting is_deleted = true
 * The generation remains in database but is hidden from social board
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
    const validated = deleteRequestSchema.parse(body)

    logger.info('Delete request', {
      user_id: userProfile.id,
      generation_id: validated.generation_id,
    })

    // Check if generation exists and user is owner
    const { data: generation, error } = await supabase
      .from('generations')
      .select('id, user_id, is_deleted')
      .eq('id', validated.generation_id)
      .eq('user_id', userProfile.id) // Must be owner
      .single()

    if (error || !generation) {
      throw new NotFoundError('Generation', validated.generation_id)
    }

    if (generation.is_deleted) {
      return NextResponse.json(
        { error: 'Generation already deleted' },
        { status: 400 }
      )
    }

    // Soft delete (set is_deleted = true)
    const { error: updateError } = await supabase
      .from('generations')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.generation_id)

    if (updateError) {
      logger.error('Failed to delete generation', updateError)
      throw new Error('Failed to delete generation')
    }

    logger.info('Generation deleted', {
      user_id: userProfile.id,
      generation_id: validated.generation_id,
    })

    return NextResponse.json({
      success: true,
      message: 'Generation deleted successfully',
    })
  } catch (error) {
    if (error instanceof ValidationError || error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    logger.error('Delete API error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
