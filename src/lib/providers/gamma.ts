import { retryWithBackoff } from '@/lib/utils/retry'
import { MediaRenderError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import { sleep } from '@/lib/utils/retry'

const GAMMA_API_URL = 'https://api.gamma.app/v1'
const GAMMA_API_KEY = process.env.GAMMA_API_KEY

export interface GammaSlidesParams {
  content: string // Structured content (title + bullets per slide)
  title: string
  theme?: 'professional' | 'modern' | 'minimal' | 'bold'
  color_scheme?: string
  slides_data?: Array<{
    title: string
    bullets: string[]
  }>
}

export interface GammaSlidesResponse {
  doc_id: string
  status: 'processing' | 'completed' | 'failed'
  url?: string
  pdf_url?: string
  thumbnail_url?: string
  error?: string
}

/**
 * Generate presentation slides using Gamma.ai
 * For slides format with AI-powered design
 */
export async function generateSlides(params: GammaSlidesParams): Promise<{ slides_url: string; pdf_url?: string; thumbnail_url?: string }> {
  const { content, title, theme = 'professional', color_scheme, slides_data } = params

  logger.info('Starting Gamma slides generation', {
    title,
    theme,
    slides_count: slides_data?.length || 0,
  })

  if (!GAMMA_API_KEY) {
    throw new MediaRenderError(
      'Gamma API key not configured',
      'gamma',
      { params }
    )
  }

  try {
    // Prepare content for Gamma
    let gammaContent = content

    // If structured slides data provided, format it nicely
    if (slides_data && slides_data.length > 0) {
      gammaContent = slides_data
        .map((slide, index) => {
          const bullets = slide.bullets.map((bullet) => `  - ${bullet}`).join('\n')
          return `## Slide ${index + 1}: ${slide.title}\n\n${bullets}`
        })
        .join('\n\n')
    }

    // Create presentation generation job
    const createResponse = await retryWithBackoff(
      async () => {
        const response = await fetch(`${GAMMA_API_URL}/docs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GAMMA_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: title,
            content: gammaContent,
            theme: theme,
            color_scheme: color_scheme || 'corporate_blue',
            format: 'presentation',
            ai_enhance: true,
            auto_design: true,
            brand: {
              primary_color: '#1a73e8',
              secondary_color: '#34a853',
              accent_color: '#fbbc04',
              font_family: 'Inter',
            },
          }),
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Gamma API error: ${response.status} - ${error}`)
        }

        return response.json()
      },
      {
        maxRetries: 3,
        initialDelay: 2000,
        onRetry: (error, attempt) => {
          logger.warn('Retrying Gamma slides generation', { attempt, error: error.message })
        },
      }
    )

    const docId = createResponse.id || createResponse.doc_id
    if (!docId) {
      throw new MediaRenderError(
        'No doc_id returned from Gamma',
        'gamma',
        { response: createResponse }
      )
    }

    logger.info('Gamma slides job created', { doc_id: docId })

    // Poll for completion
    const result = await pollForSlidesCompletion(docId)

    logger.info('Gamma slides generation completed', {
      doc_id: docId,
      url: result.slides_url,
    })

    return result
  } catch (error) {
    logger.error('Gamma slides generation failed', error as Error)
    throw new MediaRenderError(
      `Failed to generate slides: ${(error as Error).message}`,
      'gamma',
      { params }
    )
  }
}

/**
 * Poll Gamma API for slides completion
 */
async function pollForSlidesCompletion(docId: string): Promise<{ slides_url: string; pdf_url?: string; thumbnail_url?: string }> {
  const maxAttempts = 40 // 40 * 3s = 2 minutes max
  const pollInterval = 3000 // 3 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${GAMMA_API_URL}/docs/${docId}`, {
        headers: {
          'Authorization': `Bearer ${GAMMA_API_KEY}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Gamma status check failed: ${response.status}`)
      }

      const data = await response.json()
      const status = data.status

      logger.debug('Gamma slides status check', {
        doc_id: docId,
        attempt,
        status,
      })

      if (status === 'completed' || status === 'ready') {
        const slidesUrl = data.url || data.web_url
        if (!slidesUrl) {
          throw new MediaRenderError(
            'No slides URL in completed response',
            'gamma',
            { response: data }
          )
        }

        return {
          slides_url: slidesUrl,
          pdf_url: data.pdf_url || data.export_urls?.pdf,
          thumbnail_url: data.thumbnail_url || data.preview_url,
        }
      }

      if (status === 'failed' || status === 'error') {
        throw new MediaRenderError(
          'Gamma slides generation failed',
          'gamma',
          { error: data.error, doc_id: docId }
        )
      }

      // Still processing, wait and retry
      await sleep(pollInterval)
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error
      }
      logger.warn('Gamma status check error, retrying', {
        doc_id: docId,
        attempt,
        error: (error as Error).message,
      })
      await sleep(pollInterval)
    }
  }

  throw new MediaRenderError(
    'Gamma slides generation timeout (2 minutes)',
    'gamma',
    { doc_id: docId }
  )
}

/**
 * Export Gamma presentation to PDF
 */
export async function exportToPDF(docId: string): Promise<string> {
  try {
    const response = await fetch(`${GAMMA_API_URL}/docs/${docId}/export`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GAMMA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        format: 'pdf',
      }),
    })

    if (!response.ok) {
      throw new Error(`Gamma export error: ${response.status}`)
    }

    const data = await response.json()
    return data.pdf_url || data.url
  } catch (error) {
    logger.error('Failed to export Gamma to PDF', error as Error)
    throw new MediaRenderError(
      'Failed to export presentation to PDF',
      'gamma',
      { doc_id: docId }
    )
  }
}

/**
 * Get available Gamma themes
 */
export async function getAvailableThemes(): Promise<any[]> {
  try {
    const response = await fetch(`${GAMMA_API_URL}/themes`, {
      headers: {
        'Authorization': `Bearer ${GAMMA_API_KEY}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Gamma themes API error: ${response.status}`)
    }

    const data = await response.json()
    return data.themes || []
  } catch (error) {
    logger.error('Failed to fetch Gamma themes', error as Error)
    return []
  }
}
