import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateTakeaway } from '@/lib/generation/orchestrator'
import { deductCredits, isGenerationEnabled } from '@/lib/credits/manager'
import { generateRequestSchema } from '@/lib/validation/schemas'
import { logger } from '@/lib/utils/logger'
import { ValidationError, UnauthorizedError } from '@/lib/utils/errors'
import type { UserProfile } from '@/types/user'

/**
 * POST /api/generate
 * Create a new generation job
 *
 * Flow:
 * 1. Validate user session
 * 2. Check if generation is enabled globally
 * 3. Validate request body
 * 4. Check and deduct credits
 * 5. Create generation record
 * 6. Start async processing (script generation)
 * 7. Return generation_id for polling
 */
export async function POST(req: Request) {
  try {
    // 1. Validate user session
    const session = await getServerSession()
    if (!session?.user?.email) {
      throw new UnauthorizedError('Authentication required')
    }

    const userEmail = session.user.email

    // Get user profile
    const supabase = createServiceRoleClient()
    const { data: userProfile, error: profileError } = await supabase
      .from('users_profile')
      .select('*')
      .eq('email', userEmail)
      .single()

    if (profileError || !userProfile) {
      throw new UnauthorizedError('User profile not found')
    }

    logger.info('Generation request received', {
      user_id: userProfile.id,
      user_email: userEmail,
    })

    // 2. Check if generation is enabled globally
    const generationEnabled = await isGenerationEnabled()
    if (!generationEnabled) {
      return NextResponse.json(
        { error: 'Generation is temporarily disabled' },
        { status: 503 }
      )
    }

    // 3. Validate request body
    const body = await req.json()
    const validated = generateRequestSchema.parse(body)

    logger.info('Generation request validated', {
      user_id: userProfile.id,
      format: validated.format,
      tone: validated.tone,
      length: validated.length,
    })

    // 4. Check and deduct credits
    const creditsDeducted = await deductCredits(userProfile.id, 1)
    if (!creditsDeducted) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 402 }
      )
    }

    logger.info('Credits deducted', {
      user_id: userProfile.id,
      credits_remaining: userProfile.credits_remaining - 1,
    })

    // 5. Create generation record
    const { data: generation, error: createError } = await supabase
      .from('generations')
      .insert({
        user_id: userProfile.id,
        format: validated.format,
        presenter_id: validated.presenter_id || null,
        language: validated.language,
        tone: validated.tone,
        length: validated.length,
        extra_instruction: validated.extra_instruction || null,
        status: 'queued',
      })
      .select()
      .single()

    if (createError || !generation) {
      logger.error('Failed to create generation record', createError)
      throw new Error('Failed to create generation')
    }

    logger.info('Generation record created', {
      generation_id: generation.id,
      user_id: userProfile.id,
      format: validated.format,
    })

    // 6. Start async processing (fire-and-forget)
    // Note: In production, consider using a proper queue system
    processGenerationAsync(generation.id, userProfile as UserProfile, validated).catch((error) => {
      logger.error('Async generation processing failed', {
        generation_id: generation.id,
        error,
      })
    })

    // 7. Return generation_id for polling
    return NextResponse.json({
      generation_id: generation.id,
      status: 'queued',
      message: 'Generation started. Poll /api/generation/[id] for status.',
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: 400 }
      )
    }

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    logger.error('Generate API error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Process generation asynchronously
 * This runs in the background after the API response is sent
 */
async function processGenerationAsync(
  generationId: string,
  userProfile: UserProfile,
  params: any
) {
  try {
    logger.info('Starting async generation processing', {
      generation_id: generationId,
    })

    // Get presenter if specified
    let presenter = null
    if (params.presenter_id) {
      const supabase = createServiceRoleClient()
      const { data } = await supabase
        .from('leader_presenters')
        .select('*')
        .eq('id', params.presenter_id)
        .eq('enabled', true)
        .single()
      presenter = data
    }

    // Run generation orchestrator
    await generateTakeaway({
      generation_id: generationId,
      user_profile: userProfile,
      format: params.format,
      presenter: presenter,
      customization: {
        language: params.language,
        tone: params.tone,
        length: params.length,
        extra_instruction: params.extra_instruction,
      },
    })

    logger.info('Async generation processing completed', {
      generation_id: generationId,
    })
  } catch (error) {
    logger.error('Async generation processing failed', {
      generation_id: generationId,
      error,
    })
    // Error is already handled by orchestrator (status set to 'failed')
  }
}
