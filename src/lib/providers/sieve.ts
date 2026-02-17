import { retryWithBackoff } from '@/lib/utils/retry'
import { MediaRenderError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import { sleep } from '@/lib/utils/retry'

const SIEVE_API_URL = 'https://mango.sievedata.com/v2'
const SIEVE_API_KEY = process.env.SIEVE_API_KEY

export interface SieveVideoParams {
  script: string
  avatar_id?: string
  voice_id?: string
  title?: string
  style?: 'professional' | 'casual' | 'dynamic'
  background?: string
}

export interface SieveVideoResponse {
  job_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  video_url?: string
  thumbnail_url?: string
  error?: string
}

/**
 * Generate video using Sieve Dance 2.0
 * For video format with motion and dynamic visuals
 */
export async function generateVideo(params: SieveVideoParams): Promise<{ video_url: string; thumbnail_url?: string }> {
  const { script, avatar_id, voice_id, title, style = 'professional', background } = params

  logger.info('Starting Sieve video generation', {
    script_length: script.length,
    style,
    has_avatar: !!avatar_id,
  })

  if (!SIEVE_API_KEY) {
    throw new MediaRenderError(
      'Sieve API key not configured',
      'sieve',
      { params }
    )
  }

  try {
    // Create video generation job using Sieve's workflow API
    const createResponse = await retryWithBackoff(
      async () => {
        const response = await fetch(`${SIEVE_API_URL}/push`, {
          method: 'POST',
          headers: {
            'X-API-Key': SIEVE_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workflow: 'sieve/dance-2',
            inputs: {
              text: script,
              avatar: avatar_id || 'default',
              voice: voice_id || 'default',
              style: style,
              title: title || 'Video Takeaway',
              background: background || 'corporate',
              format: 'mp4',
              resolution: '1080p',
            },
          }),
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Sieve API error: ${response.status} - ${error}`)
        }

        return response.json()
      },
      {
        maxRetries: 3,
        initialDelay: 2000,
        onRetry: (error, attempt) => {
          logger.warn('Retrying Sieve video generation', { attempt, error: error.message })
        },
      }
    )

    const jobId = createResponse.id || createResponse.job_id
    if (!jobId) {
      throw new MediaRenderError(
        'No job_id returned from Sieve',
        'sieve',
        { response: createResponse }
      )
    }

    logger.info('Sieve video job created', { job_id: jobId })

    // Poll for completion
    const result = await pollForVideoCompletion(jobId)

    logger.info('Sieve video generation completed', {
      job_id: jobId,
      video_url: result.video_url,
    })

    return result
  } catch (error) {
    logger.error('Sieve video generation failed', error as Error)
    throw new MediaRenderError(
      `Failed to generate video: ${(error as Error).message}`,
      'sieve',
      { params }
    )
  }
}

/**
 * Poll Sieve API for video completion
 */
async function pollForVideoCompletion(jobId: string): Promise<{ video_url: string; thumbnail_url?: string }> {
  const maxAttempts = 60 // 60 * 5s = 5 minutes max
  const pollInterval = 5000 // 5 seconds (video takes longer)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${SIEVE_API_URL}/jobs/${jobId}`, {
        headers: {
          'X-API-Key': SIEVE_API_KEY!,
        },
      })

      if (!response.ok) {
        throw new Error(`Sieve status check failed: ${response.status}`)
      }

      const data = await response.json()
      const status = data.status

      logger.debug('Sieve video status check', {
        job_id: jobId,
        attempt,
        status,
      })

      if (status === 'finished' || status === 'completed') {
        const videoUrl = data.data?.video_url || data.outputs?.video || data.result?.url
        if (!videoUrl) {
          throw new MediaRenderError(
            'No video URL in completed response',
            'sieve',
            { response: data }
          )
        }

        return {
          video_url: videoUrl,
          thumbnail_url: data.data?.thumbnail_url || data.outputs?.thumbnail,
        }
      }

      if (status === 'failed' || status === 'error') {
        throw new MediaRenderError(
          'Sieve video generation failed',
          'sieve',
          { error: data.error, job_id: jobId }
        )
      }

      // Still processing, wait and retry
      await sleep(pollInterval)
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error
      }
      logger.warn('Sieve status check error, retrying', {
        job_id: jobId,
        attempt,
        error: (error as Error).message,
      })
      await sleep(pollInterval)
    }
  }

  throw new MediaRenderError(
    'Sieve video generation timeout (5 minutes)',
    'sieve',
    { job_id: jobId }
  )
}

/**
 * Get available Sieve workflows/models
 */
export async function getAvailableWorkflows(): Promise<any[]> {
  try {
    const response = await fetch(`${SIEVE_API_URL}/workflows`, {
      headers: {
        'X-API-Key': SIEVE_API_KEY!,
      },
    })

    if (!response.ok) {
      throw new Error(`Sieve workflows API error: ${response.status}`)
    }

    const data = await response.json()
    return data.workflows || []
  } catch (error) {
    logger.error('Failed to fetch Sieve workflows', error as Error)
    return []
  }
}
