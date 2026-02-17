import { chat } from '@/lib/providers/openai'
import { LENGTH_PRESETS } from '@/lib/utils/constants'
import { logger } from '@/lib/utils/logger'
import type { TakeawayPlan, GenerationCustomization, GenerationFormat } from '@/types/generation'

interface ScriptParams {
  plan: TakeawayPlan
  format: GenerationFormat
  presenterName?: string
  customization: GenerationCustomization
}

export async function generateScript(params: ScriptParams): Promise<string> {
  const { plan, format, presenterName, customization } = params

  logger.info('Generating script', {
    format,
    tone: customization.tone,
    length: customization.length,
    has_presenter: !!presenterName,
  })

  const systemPrompt = getSystemPromptForFormat(format)
  const userPrompt = buildFormatSpecificPrompt(params)

  try {
    const response = await chat({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    })

    const script = response.content.trim()

    logger.info('Generated script', {
      format,
      word_count: script.split(/\s+/).length,
      char_count: script.length,
    })

    return script
  } catch (error) {
    logger.error('Failed to generate script', error as Error)
    throw new Error(`Failed to generate script: ${(error as Error).message}`)
  }
}

function getSystemPromptForFormat(format: GenerationFormat): string {
  switch (format) {
    case 'video':
      return `You are an expert video scriptwriter specializing in executive presentations.

Create a direct-to-camera video script that:
- Sounds natural when spoken aloud (conversational but polished)
- Has strong executive presence
- Uses short sentences and clear language
- Includes natural pauses and emphasis
- Avoids stage directions (just the words to say)
- Is engaging and maintains viewer attention

Output ONLY the script text that the presenter will speak. No formatting, no stage directions, just the spoken words.`

    case 'podcast':
      return `You are an expert podcast host and storyteller.

Create a conversational podcast-style script that:
- Sounds warm and engaging
- Uses storytelling techniques
- Includes rhetorical questions
- Has natural flow and pacing
- Uses "you" to connect with listener
- Includes strategic pauses for emphasis (mark with [PAUSE])
- Feels like a one-on-one conversation

Output the script with [PAUSE] markers where natural pauses should occur.`

    case 'slides':
      return `You are an expert presentation designer specializing in executive slide decks.

Create a slide deck outline as JSON with this schema:
[
  {
    "title": "Slide title (clear, action-oriented)",
    "bullets": ["Bullet 1", "Bullet 2", "Bullet 3"]
  }
]

Guidelines:
- Each bullet should be concise (max 10 words)
- Use action verbs and clear language
- Focus on key insights, not details
- 3-5 bullets per slide
- High signal-to-noise ratio
- Visual storytelling approach

Output ONLY the JSON array, nothing else.`

    default:
      throw new Error(`Unknown format: ${format}`)
  }
}

function buildFormatSpecificPrompt(params: ScriptParams): string {
  const { plan, format, presenterName, customization } = params

  const basePrompt = `
TAKEAWAY PLAN:
${JSON.stringify(plan, null, 2)}

TONE: ${customization.tone}
LENGTH: ${customization.length}
LANGUAGE: ${customization.language}
`

  switch (format) {
    case 'video':
      return buildVideoPrompt(plan, presenterName, customization, basePrompt)

    case 'podcast':
      return buildPodcastPrompt(plan, customization, basePrompt)

    case 'slides':
      return buildSlidesPrompt(plan, customization, basePrompt)

    default:
      throw new Error(`Unknown format: ${format}`)
  }
}

function buildVideoPrompt(
  plan: TakeawayPlan,
  presenterName: string | undefined,
  customization: GenerationCustomization,
  basePrompt: string
): string {
  const lengthConfig = LENGTH_PRESETS[customization.length]
  const presenter = presenterName || 'the presenter'

  return `${basePrompt}

Create a video script for ${presenter} with these requirements:

TARGET LENGTH: ${lengthConfig.video_seconds} seconds (~${lengthConfig.video_words} words)
DELIVERY STYLE: Direct, confident, executive presence
STRUCTURE:
1. Hook (attention-grabbing opening from the plan)
2. Key points with smooth transitions
3. Strong CTA (from the plan)

IMPORTANT:
- This will be delivered directly to camera
- Keep it natural and conversational
- Use short, punchy sentences
- Build momentum throughout
- End with energy and clear next step

Output the script only, ready for ${presenter} to deliver.
`.trim()
}

function buildPodcastPrompt(
  plan: TakeawayPlan,
  customization: GenerationCustomization,
  basePrompt: string
): string {
  const lengthConfig = LENGTH_PRESETS[customization.length]

  return `${basePrompt}

Create a podcast-style script with these requirements:

TARGET LENGTH: ${lengthConfig.podcast_seconds} seconds (~${lengthConfig.podcast_words} words)
DELIVERY STYLE: Warm, engaging, conversational host
STRUCTURE:
1. Hook with storytelling
2. Key points woven into narrative
3. Use rhetorical questions to engage
4. Natural pauses for emphasis [PAUSE]
5. Personal anecdotes or examples
6. Strong CTA

IMPORTANT:
- Sound like you're having a conversation with a colleague
- Use "you" to connect directly with listener
- Include [PAUSE] markers for dramatic effect
- Build intrigue and curiosity
- Make complex ideas accessible

Output the script with [PAUSE] markers.
`.trim()
}

function buildSlidesPrompt(
  plan: TakeawayPlan,
  customization: GenerationCustomization,
  basePrompt: string
): string {
  const lengthConfig = LENGTH_PRESETS[customization.length]

  return `${basePrompt}

Create a slide deck outline with these requirements:

TARGET SLIDES: ${lengthConfig.slides_count} slides
STYLE: Executive summary, high signal-to-noise
STRUCTURE:
1. Title slide (use plan.title)
2. Hook slide (set the context)
3. Key insights (1-2 per slide)
4. CTA slide (clear next step)

IMPORTANT:
- Each bullet max 10 words
- Use action verbs
- Focus on "so what?" insights
- Visual hierarchy matters
- Leave room for visuals

Output as JSON array matching the schema:
[
  { "title": "Slide Title", "bullets": ["Point 1", "Point 2", "Point 3"] }
]
`.trim()
}
