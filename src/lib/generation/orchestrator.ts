import { createServiceRoleClient } from '@/lib/supabase/server'
import { retrieveRelevantContext } from './rag'
import { validateExtraInstruction, validatePlan, validateScript } from './guardrails'
import { generateTakeawayPlan } from './planner'
import { generateScript } from './scriptGenerator'
import { logger } from '@/lib/utils/logger'
import { GenerationError } from '@/lib/utils/errors'
import { isRetriableError } from '@/lib/utils/retry'
import { MAX_RETRIES } from '@/lib/utils/constants'
import type { UserProfile, LeaderPresenter } from '@/types/user'
import type { GenerationFormat, GenerationCustomization, GenerationStatus } from '@/types/generation'
import type { Database } from '@/types/database'

type Generation = Database['public']['Tables']['generations']['Row']

export interface GenerationParams {
  generation_id: string
  user_profile: UserProfile
  format: GenerationFormat
  presenter?: LeaderPresenter | null
  customization: GenerationCustomization
}

export async function generateTakeaway(params: GenerationParams): Promise<Generation> {
  const { generation_id, user_profile, format, presenter, customization } = params

  logger.info('Starting generation orchestration', {
    generation_id,
    user_id: user_profile.id,
    format,
    tone: customization.tone,
    length: customization.length,
  })

  const supabase = createServiceRoleClient()

  try {
    // ========================================
    // STEP 1: Validate extra instruction
    // ========================================
    await updateStatus(generation_id, 'processing', 'Validating input...')
    await validateExtraInstruction(customization.extra_instruction)

    // ========================================
    // STEP 2: RAG Retrieval
    // ========================================
    await updateStatus(generation_id, 'processing', 'Retrieving relevant content...')

    const context = await retrieveRelevantContext({
      userProfile: user_profile,
      format,
      customization,
    })

    logger.info('Retrieved RAG context', {
      generation_id,
      chunks_count: context.chunks.length,
      total_tokens: context.total_tokens,
    })

    // Store RAG query and chunk IDs
    await supabase
      .from('generations')
      .update({
        rag_query: context.query,
        rag_chunks_used: context.chunks.map((c) => c.id),
      })
      .eq('id', generation_id)

    // ========================================
    // STEP 3: Generate takeaway plan
    // ========================================
    await updateStatus(generation_id, 'processing', 'Creating takeaway plan...')

    const plan = await generateTakeawayPlan({
      context,
      userProfile: user_profile,
      format,
      customization,
    })

    logger.info('Generated takeaway plan', {
      generation_id,
      title: plan.title,
      key_points_count: plan.key_points.length,
    })

    // ========================================
    // STEP 4: Validate plan
    // ========================================
    await validatePlan(plan)

    // Store plan
    await supabase
      .from('generations')
      .update({
        takeaway_plan: plan as any,
      })
      .eq('id', generation_id)

    // ========================================
    // STEP 5: Generate script
    // ========================================
    await updateStatus(generation_id, 'processing', 'Writing script...')

    const script = await generateScript({
      plan,
      format,
      presenterName: presenter?.name,
      customization,
    })

    logger.info('Generated script', {
      generation_id,
      format,
      script_length: script.length,
    })

    // ========================================
    // STEP 6: Validate script
    // ========================================
    await validateScript(script)

    // Store script
    await supabase
      .from('generations')
      .update({
        script,
      })
      .eq('id', generation_id)

    // ========================================
    // STEP 7: Mark as ready for rendering
    // (Rendering will be handled by a separate API call due to Vercel timeout)
    // ========================================
    await updateStatus(generation_id, 'rendering', 'Preparing to render media...')

    logger.info('Generation orchestration completed (script ready)', {
      generation_id,
    })

    // Fetch and return updated generation
    const { data: updatedGeneration } = await supabase
      .from('generations')
      .select('*')
      .eq('id', generation_id)
      .single()

    return updatedGeneration!

  } catch (error) {
    logger.error('Generation orchestration failed', {
      generation_id,
      error: error as Error,
    })

    // Check if we should retry
    const { data: currentGeneration } = await supabase
      .from('generations')
      .select('retry_count')
      .eq('id', generation_id)
      .single()

    const retryCount = currentGeneration?.retry_count || 0

    if (isRetriableError(error as Error) && retryCount < MAX_RETRIES) {
      await retryGeneration(generation_id)
      throw new GenerationError('Generation failed, retrying...', {
        generation_id,
        retry_count: retryCount + 1,
      })
    } else {
      await failGeneration(generation_id, (error as Error).message)
      throw error
    }
  }
}

export async function updateStatus(
  generation_id: string,
  status: GenerationStatus,
  message?: string
): Promise<void> {
  const supabase = createServiceRoleClient()

  logger.debug('Updating generation status', {
    generation_id,
    status,
    message,
  })

  await supabase
    .from('generations')
    .update({
      status,
      ...(message && { error_message: message }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', generation_id)
}

export async function retryGeneration(generation_id: string): Promise<void> {
  const supabase = createServiceRoleClient()

  logger.info('Retrying generation', { generation_id })

  await supabase
    .from('generations')
    .update({
      status: 'queued',
      retry_count: supabase.rpc('increment', { x: 1 }) as any,
      updated_at: new Date().toISOString(),
    })
    .eq('id', generation_id)
}

export async function failGeneration(generation_id: string, error_message: string): Promise<void> {
  const supabase = createServiceRoleClient()

  logger.error('Marking generation as failed', {
    generation_id,
    error_message,
  })

  await supabase
    .from('generations')
    .update({
      status: 'failed',
      error_message,
      updated_at: new Date().toISOString(),
    })
    .eq('id', generation_id)
}

export async function completeGeneration(
  generation_id: string,
  output_urls: Record<string, string>,
  thumbnail_url?: string
): Promise<void> {
  const supabase = createServiceRoleClient()

  logger.info('Marking generation as completed', {
    generation_id,
    output_urls,
  })

  await supabase
    .from('generations')
    .update({
      status: 'completed',
      output_urls: output_urls as any,
      thumbnail_url,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', generation_id)
}

export async function getGeneration(generation_id: string): Promise<Generation | null> {
  const supabase = createServiceRoleClient()

  const { data } = await supabase
    .from('generations')
    .select('*')
    .eq('id', generation_id)
    .single()

  return data
}
