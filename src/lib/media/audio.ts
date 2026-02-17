import * as heygenProvider from '@/lib/providers/heygen'
import * as mockProvider from '@/lib/providers/mock'
import { logger } from '@/lib/utils/logger'
import type { AudioParams } from '@/types/generation'

const IS_MOCK_MODE = process.env.MOCK_MEDIA === 'true'

/**
 * Generate podcast audio using HeyGen voice synthesis
 * Includes RKO branding intro/outro (handled by provider)
 */
export async function generatePodcast(params: AudioParams): Promise<string> {
  const { script, voice_id, language } = params

  logger.info('Generating podcast audio', {
    script_length: script.length,
    voice_id,
    language,
    mock_mode: IS_MOCK_MODE,
  })

  if (IS_MOCK_MODE) {
    logger.info('Using mock provider for podcast generation')
    return await mockProvider.generateAudio({ script, voice_id, language })
  }

  // Use HeyGen for audio generation
  const audioUrl = await heygenProvider.generateAudio({
    text: script,
    voice_id: voice_id || process.env.HEYGEN_VOICE_ID || 'default',
    title: 'RKO Takeaway Podcast',
  })

  logger.info('Podcast audio generated successfully', {
    audio_url: audioUrl,
  })

  return audioUrl
}

/**
 * Get available voices for podcast
 */
export async function getAvailableVoices(): Promise<any[]> {
  if (IS_MOCK_MODE) {
    return mockProvider.getAvailableVoices()
  }

  return heygenProvider.getAvailableVoices()
}
