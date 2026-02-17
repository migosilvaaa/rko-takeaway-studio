import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateVideo } from '@/lib/media/video'
import { generatePodcast } from '@/lib/media/audio'
import { generateSlides } from '@/lib/media/slides'
import { uploadFromUrl, generateFilePath } from '@/lib/media/storage'
import { completeGeneration, failGeneration, updateStatus } from '@/lib/generation/orchestrator'
import { logger } from '@/lib/utils/logger'
import { UnauthorizedError, NotFoundError } from '@/lib/utils/errors'

/**
 * POST /api/render/[id]
 * Render media for a generation that has a script ready
 *
 * This is step 2 of the split-step generation process
 * (Step 1 was script generation in /api/generate)
 *
 * Flow:
 * 1. Validate user session and ownership
 * 2. Check generation is in 'rendering' status with script ready
 * 3. Render media based on format
 * 4. Upload to Supabase Storage
 * 5. Update generation status to 'completed'
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Validate user session
    const session = await getServerSession()
    if (!session?.user?.email) {
      throw new UnauthorizedError('Authentication required')
    }

    const generationId = params.id
    const userEmail = session.user.email

    logger.info('Render request received', {
      generation_id: generationId,
      user_email: userEmail,
    })

    // Get user profile
    const supabase = createServiceRoleClient()
    const { data: userProfile } = await supabase
      .from('users_profile')
      .select('id')
      .eq('email', userEmail)
      .single()

    if (!userProfile) {
      throw new UnauthorizedError('User profile not found')
    }

    // 2. Get generation and check ownership
    const { data: generation, error } = await supabase
      .from('generations')
      .select('*')
      .eq('id', generationId)
      .eq('user_id', userProfile.id) // Must be owner
      .single()

    if (error || !generation) {
      throw new NotFoundError('Generation', generationId)
    }

    // Check status
    if (generation.status !== 'rendering') {
      return NextResponse.json(
        { error: `Generation is not ready for rendering (status: ${generation.status})` },
        { status: 400 }
      )
    }

    if (!generation.script) {
      return NextResponse.json(
        { error: 'No script available for rendering' },
        { status: 400 }
      )
    }

    logger.info('Starting media rendering', {
      generation_id: generationId,
      format: generation.format,
    })

    // 3. Render media based on format
    let outputUrls: any = {}
    let thumbnailUrl: string | undefined

    try {
      await updateStatus(generationId, 'rendering', 'Rendering media...')

      switch (generation.format) {
        case 'video': {
          const result = await generateVideo({
            script: generation.script,
            avatar_id: generation.presenter_id || undefined,
            voice_id: undefined, // Can be added from presenter
            template_id: undefined,
            language: generation.language,
          })

          // Upload to Supabase Storage for permanent retention
          const videoPath = generateFilePath('video', 'mp4')
          const videoUrl = await uploadFromUrl(result.video_url, { path: videoPath })

          outputUrls.video_url = videoUrl
          thumbnailUrl = result.thumbnail_url

          if (result.thumbnail_url) {
            const thumbPath = generateFilePath('video', 'jpg')
            thumbnailUrl = await uploadFromUrl(result.thumbnail_url, { path: thumbPath })
          }

          break
        }

        case 'podcast': {
          const audioUrl = await generatePodcast({
            script: generation.script,
            voice_id: generation.presenter_id || process.env.HEYGEN_VOICE_ID || 'default',
            language: generation.language,
          })

          // Upload to Supabase Storage
          const audioPath = generateFilePath('podcast', 'mp3')
          outputUrls.audio_url = await uploadFromUrl(audioUrl, { path: audioPath })

          break
        }

        case 'slides': {
          // Parse script as JSON (should be array of slides)
          const slides = JSON.parse(generation.script)

          const result = await generateSlides({
            slides,
            language: generation.language,
          })

          outputUrls.slides_url = result.slides_url
          outputUrls.pdf_url = result.pdf_url
          thumbnailUrl = result.thumbnail_url

          break
        }

        default:
          throw new Error(`Unknown format: ${generation.format}`)
      }

      // 4. Complete generation
      await completeGeneration(generationId, outputUrls, thumbnailUrl)

      logger.info('Media rendering completed', {
        generation_id: generationId,
        format: generation.format,
        output_urls: outputUrls,
      })

      return NextResponse.json({
        generation_id: generationId,
        status: 'completed',
        output_urls: outputUrls,
        thumbnail_url: thumbnailUrl,
      })
    } catch (renderError) {
      logger.error('Media rendering failed', {
        generation_id: generationId,
        error: renderError,
      })

      await failGeneration(
        generationId,
        `Rendering failed: ${(renderError as Error).message}`
      )

      throw renderError
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    logger.error('Render API error', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
