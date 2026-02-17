import { retryWithBackoff } from '@/lib/utils/retry'
import { MediaRenderError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import { sleep } from '@/lib/utils/retry'

const HEYGEN_API_URL = 'https://api.heygen.com/v2'
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY

export interface HeyGenAudioParams {
  text: string
  voice_id: string
  title?: string
}

export interface HeyGenAudioResponse {
  video_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  audio_url?: string
  error?: string
}

/**
 * Generate audio using HeyGen's voice synthesis
 * For podcast format - audio-only output
 */
export async function generateAudio(params: HeyGenAudioParams): Promise<string> {
  const { text, voice_id, title } = params

  logger.info('Starting HeyGen audio generation', {
    text_length: text.length,
    voice_id,
  })

  if (!HEYGEN_API_KEY) {
    throw new MediaRenderError(
      'HeyGen API key not configured',
      'heygen',
      { params }
    )
  }

  try {
    // Create audio generation job
    const createResponse = await retryWithBackoff(
      async () => {
        const response = await fetch(`${HEYGEN_API_URL}/audio/generate`, {
          method: 'POST',
          headers: {
            'X-Api-Key': HEYGEN_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            voice_id,
            title: title || 'Podcast Episode',
            audio_format: 'mp3',
          }),
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`HeyGen API error: ${response.status} - ${error}`)
        }

        return response.json()
      },
      {
        maxRetries: 3,
        initialDelay: 2000,
        onRetry: (error, attempt) => {
          logger.warn('Retrying HeyGen audio generation', { attempt, error: error.message })
        },
      }
    )

    const videoId = createResponse.data?.video_id
    if (!videoId) {
      throw new MediaRenderError(
        'No video_id returned from HeyGen',
        'heygen',
        { response: createResponse }
      )
    }

    logger.info('HeyGen audio job created', { video_id: videoId })

    // Poll for completion
    const audioUrl = await pollForAudioCompletion(videoId)

    logger.info('HeyGen audio generation completed', {
      video_id: videoId,
      audio_url: audioUrl,
    })

    return audioUrl
  } catch (error) {
    logger.error('HeyGen audio generation failed', error as Error)
    throw new MediaRenderError(
      `Failed to generate audio: ${(error as Error).message}`,
      'heygen',
      { params }
    )
  }
}

/**
 * Poll HeyGen API for audio completion
 */
async function pollForAudioCompletion(videoId: string): Promise<string> {
  const maxAttempts = 60 // 60 * 3s = 3 minutes max
  const pollInterval = 3000 // 3 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${HEYGEN_API_URL}/video/${videoId}`, {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY!,
        },
      })

      if (!response.ok) {
        throw new Error(`HeyGen status check failed: ${response.status}`)
      }

      const data = await response.json()
      const status = data.data?.status

      logger.debug('HeyGen audio status check', {
        video_id: videoId,
        attempt,
        status,
      })

      if (status === 'completed') {
        const audioUrl = data.data?.audio_url || data.data?.video_url
        if (!audioUrl) {
          throw new MediaRenderError(
            'No audio URL in completed response',
            'heygen',
            { response: data }
          )
        }
        return audioUrl
      }

      if (status === 'failed') {
        throw new MediaRenderError(
          'HeyGen audio generation failed',
          'heygen',
          { error: data.data?.error, video_id: videoId }
        )
      }

      // Still processing, wait and retry
      await sleep(pollInterval)
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error
      }
      logger.warn('HeyGen status check error, retrying', {
        video_id: videoId,
        attempt,
        error: (error as Error).message,
      })
      await sleep(pollInterval)
    }
  }

  throw new MediaRenderError(
    'HeyGen audio generation timeout (3 minutes)',
    'heygen',
    { video_id: videoId }
  )
}

/**
 * Get available voices from HeyGen
 */
export async function getAvailableVoices(): Promise<any[]> {
  try {
    const response = await fetch(`${HEYGEN_API_URL}/voices`, {
      headers: {
        'X-Api-Key': HEYGEN_API_KEY!,
      },
    })

    if (!response.ok) {
      throw new Error(`HeyGen voices API error: ${response.status}`)
    }

    const data = await response.json()
    return data.data?.voices || []
  } catch (error) {
    logger.error('Failed to fetch HeyGen voices', error as Error)
    return []
  }
}
