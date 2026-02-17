import * as gammaProvider from '@/lib/providers/gamma'
import * as mockProvider from '@/lib/providers/mock'
import { logger } from '@/lib/utils/logger'
import type { SlidesParams, SlideData } from '@/types/generation'

const IS_MOCK_MODE = process.env.MOCK_MEDIA === 'true'

/**
 * Generate presentation slides using Gamma.ai
 * Includes RKO branding and AI disclosure badge
 */
export async function generateSlides(params: SlidesParams): Promise<{ slides_url: string; pdf_url?: string; thumbnail_url?: string }> {
  const { slides, language } = params

  logger.info('Generating slides', {
    slides_count: slides.length,
    language,
    mock_mode: IS_MOCK_MODE,
  })

  if (IS_MOCK_MODE) {
    logger.info('Using mock provider for slides generation')
    return await mockProvider.generateSlides({ slides, language })
  }

  // Format slides for Gamma
  const title = slides[0]?.title || 'RKO Takeaway'
  const content = formatSlidesForGamma(slides)

  // Use Gamma.ai for presentation generation
  const result = await gammaProvider.generateSlides({
    title,
    content,
    theme: 'professional',
    color_scheme: 'rko_brand',
    slides_data: slides,
  })

  logger.info('Slides generated successfully', {
    slides_url: result.slides_url,
    pdf_url: result.pdf_url,
  })

  return result
}

/**
 * Format slides data for Gamma content input
 */
function formatSlidesForGamma(slides: SlideData[]): string {
  return slides
    .map((slide, index) => {
      const bullets = slide.bullets.map((bullet) => `  - ${bullet}`).join('\n')
      return `## ${slide.title}\n\n${bullets}`
    })
    .join('\n\n')
}

/**
 * Export slides to PDF format
 */
export async function exportSlidesToPDF(docId: string): Promise<string> {
  if (IS_MOCK_MODE) {
    return 'https://example.com/mock-slides-export.pdf'
  }

  return gammaProvider.exportToPDF(docId)
}

/**
 * Get available presentation themes
 */
export async function getAvailableThemes(): Promise<any[]> {
  if (IS_MOCK_MODE) {
    return mockProvider.getAvailableThemes()
  }

  return gammaProvider.getAvailableThemes()
}
