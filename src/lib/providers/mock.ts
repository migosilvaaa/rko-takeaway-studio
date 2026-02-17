import { logger } from '@/lib/utils/logger'
import { sleep } from '@/lib/utils/retry'

/**
 * Mock provider for development mode (MOCK_MEDIA=true)
 * Returns dummy URLs instantly without calling external APIs
 */

const MOCK_DELAY_MS = 2000 // 2 second delay to simulate API calls

export async function generateAudio(params: any): Promise<string> {
  logger.info('MOCK: Generating audio', params)
  await sleep(MOCK_DELAY_MS)

  // Return a dummy audio URL
  return 'https://example.com/mock-audio-' + Date.now() + '.mp3'
}

export async function generateVideo(params: any): Promise<{ video_url: string; thumbnail_url?: string }> {
  logger.info('MOCK: Generating video', params)
  await sleep(MOCK_DELAY_MS * 2) // Video takes longer

  // Return dummy video URLs
  return {
    video_url: 'https://example.com/mock-video-' + Date.now() + '.mp4',
    thumbnail_url: 'https://example.com/mock-thumbnail-' + Date.now() + '.jpg',
  }
}

export async function generateSlides(params: any): Promise<{ slides_url: string; pdf_url?: string; thumbnail_url?: string }> {
  logger.info('MOCK: Generating slides', params)
  await sleep(MOCK_DELAY_MS)

  // Return dummy slides URLs
  return {
    slides_url: 'https://example.com/mock-slides-' + Date.now(),
    pdf_url: 'https://example.com/mock-slides-' + Date.now() + '.pdf',
    thumbnail_url: 'https://example.com/mock-slide-thumbnail-' + Date.now() + '.jpg',
  }
}

export async function getAvailableVoices(): Promise<any[]> {
  return [
    { id: 'mock-voice-1', name: 'Mock Voice 1', language: 'en' },
    { id: 'mock-voice-2', name: 'Mock Voice 2', language: 'en' },
  ]
}

export async function getAvailableWorkflows(): Promise<any[]> {
  return [
    { id: 'mock-workflow-1', name: 'Mock Workflow 1' },
    { id: 'mock-workflow-2', name: 'Mock Workflow 2' },
  ]
}

export async function getAvailableThemes(): Promise<any[]> {
  return [
    { id: 'mock-theme-1', name: 'Mock Theme 1' },
    { id: 'mock-theme-2', name: 'Mock Theme 2' },
  ]
}
