import { createServiceRoleClient } from '@/lib/supabase/server'
import { InsufficientCreditsError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import { DEFAULT_CREDITS, COST_PER_GENERATION } from '@/lib/utils/constants'

/**
 * Deduct credits from user account atomically
 * Uses database function to prevent race conditions
 */
export async function deductCredits(
  userId: string,
  amount: number = COST_PER_GENERATION
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  logger.info('Attempting to deduct credits', { user_id: userId, amount })

  try {
    // Call database function for atomic deduction
    const { data, error } = await supabase.rpc('deduct_credits', {
      user_uuid: userId,
      amount,
    })

    if (error) {
      logger.error('Credits deduction failed', error)
      throw new Error(`Failed to deduct credits: ${error.message}`)
    }

    // data is a boolean indicating success
    if (!data) {
      const profile = await getUserCredits(userId)
      logger.warn('Insufficient credits', {
        user_id: userId,
        available: profile?.credits_remaining || 0,
        required: amount,
      })
      throw new InsufficientCreditsError(amount, profile?.credits_remaining || 0)
    }

    logger.info('Credits deducted successfully', { user_id: userId, amount })
    return true
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      throw error
    }
    logger.error('Credits deduction error', error as Error)
    throw error
  }
}

/**
 * Get user's current credit balance
 */
export async function getUserCredits(userId: string): Promise<{
  credits_remaining: number
  credits_used: number
} | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('users_profile')
    .select('credits_remaining, credits_used')
    .eq('id', userId)
    .single()

  if (error) {
    logger.error('Failed to fetch user credits', error)
    return null
  }

  return data
}

/**
 * Set user credits (admin only)
 */
export async function setUserCredits(
  userId: string,
  credits: number
): Promise<void> {
  const supabase = createServiceRoleClient()

  logger.info('Setting user credits', { user_id: userId, credits })

  const { error } = await supabase
    .from('users_profile')
    .update({
      credits_remaining: credits,
    })
    .eq('id', userId)

  if (error) {
    logger.error('Failed to set user credits', error)
    throw new Error(`Failed to set credits: ${error.message}`)
  }

  logger.info('User credits updated successfully', { user_id: userId, credits })
}

/**
 * Add credits to user account (admin only)
 */
export async function addCredits(
  userId: string,
  amount: number
): Promise<void> {
  const supabase = createServiceRoleClient()

  logger.info('Adding credits to user', { user_id: userId, amount })

  const { error } = await supabase
    .from('users_profile')
    .update({
      credits_remaining: supabase.rpc('increment', { x: amount }) as any,
    })
    .eq('id', userId)

  if (error) {
    logger.error('Failed to add credits', error)
    throw new Error(`Failed to add credits: ${error.message}`)
  }

  logger.info('Credits added successfully', { user_id: userId, amount })
}

/**
 * Check if generation is enabled globally
 */
export async function isGenerationEnabled(): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'feature_flags')
    .single()

  if (error) {
    logger.error('Failed to fetch feature flags', error)
    return true // Fail open - allow generation if config can't be read
  }

  const flags = data.value as any
  return flags?.generation_enabled !== false
}

/**
 * Toggle generation globally (admin only)
 */
export async function toggleGeneration(enabled: boolean): Promise<void> {
  const supabase = createServiceRoleClient()

  logger.info('Toggling generation globally', { enabled })

  const { data: currentFlags } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'feature_flags')
    .single()

  const flags = (currentFlags?.value as any) || {}
  flags.generation_enabled = enabled

  const { error } = await supabase
    .from('app_config')
    .update({ value: flags })
    .eq('key', 'feature_flags')

  if (error) {
    logger.error('Failed to toggle generation', error)
    throw new Error(`Failed to toggle generation: ${error.message}`)
  }

  logger.info('Generation toggled successfully', { enabled })
}
