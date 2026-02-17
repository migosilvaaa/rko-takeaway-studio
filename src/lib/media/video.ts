import * as sieveProvider from '@/lib/providers/sieve'
import * as mockProvider from '@/lib/providers/mock'
import { logger } from '@/lib/utils/logger'
import type { VideoParams } from '@/types/generation'

const IS_MOCK_MODE = process.env.MOCK_MEDIA === 'true'

/**
 * Generate video using Sieve Dance 2.0
 * Includes RKO branding and AI disclosure badge
 */
export async function generateVideo(params: VideoParams): Promise<{ video_url: string; thumbnail_url?: string }> {
  const { script, avatar_id, voice_id, template_id, language } = params

  logger.info('Generating video', {
    script_length: script.length,
    avatar_id,
    voice_id,
    language,
    mock_mode: IS_MOCK_MODE,
  })

  if (IS_MOCK_MODE) {
    logger.info('Using mock provider for video generation')
    return await mockProvider.generateVideo({ script, avatar_id, voice_id, language })
  }

  // Use Sieve Dance 2.0 for video generation
  const result = await sieveProvider.generateVideo({
    script,
    avatar_id,
    voice_id,
    title: 'RKO Takeaway Video',
    style: determineStyle(params),
    background: 'corporate',
  })

  logger.info('Video generated successfully', {
    video_url: result.video_url,
    thumbnail_url: result.thumbnail_url,
  })

  return result
}

/**
 * Determine video style based on customization
 */
function determineStyle(params: VideoParams): 'professional' | 'casual' | 'dynamic' {
  // This can be mapped from tone presets
  // For now, default to professional
  return 'professional'
}

/**
 * Get available video workflows/avatars
 */
export async function getAvailableWorkflows(): Promise<any[]> {
  if (IS_MOCK_MODE) {
    return mockProvider.getAvailableWorkflows()
  }

  return sieveProvider.getAvailableWorkflows()
}
