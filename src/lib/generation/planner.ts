import { chat } from '@/lib/providers/openai'
import { formatContextForPrompt } from './rag'
import { logger } from '@/lib/utils/logger'
import type { UserProfile } from '@/types/user'
import type { GenerationCustomization, GenerationFormat, RAGContext, TakeawayPlan } from '@/types/generation'

interface PlannerParams {
  context: RAGContext
  userProfile: UserProfile
  format: GenerationFormat
  customization: GenerationCustomization
}

export async function generateTakeawayPlan(params: PlannerParams): Promise<TakeawayPlan> {
  const { context, userProfile, format, customization } = params

  logger.info('Generating takeaway plan', {
    user_id: userProfile.id,
    format,
    tone: customization.tone,
    length: customization.length,
  })

  const systemPrompt = buildPlannerSystemPrompt()
  const userPrompt = buildPlannerUserPrompt(params)

  try {
    const response = await chat({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1500,
    })

    const plan = JSON.parse(response.content) as TakeawayPlan

    logger.info('Generated takeaway plan', {
      user_id: userProfile.id,
      title: plan.title,
      key_points_count: plan.key_points.length,
    })

    // Validate plan structure
    validatePlanStructure(plan)

    return plan
  } catch (error) {
    logger.error('Failed to generate takeaway plan', error as Error)
    throw new Error(`Failed to generate takeaway plan: ${(error as Error).message}`)
  }
}

function buildPlannerSystemPrompt(): string {
  return `You are a B2B content strategist creating personalized takeaways from a keynote transcript.

Your task is to create a structured takeaway plan as JSON with this exact schema:
{
  "title": "Catchy, role-specific title (max 60 characters)",
  "hook": "Attention-grabbing opening (1-2 sentences)",
  "key_points": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
  "framing": "How to position these insights for maximum impact (2-3 sentences)",
  "cta": "Clear call-to-action for the audience (1 sentence)"
}

STRICT RULES:
1. Use ONLY information from the provided keynote context
2. DO NOT invent financial figures, dates, or product roadmap details
3. DO NOT mention competitors by name
4. DO NOT make guarantees or promises
5. Focus on strategic insights and implications
6. Tailor the framing to the user's role, segment, and function
7. Keep the CTA internal-focused (encourage browsing board, upvoting, creating more content)
8. Provide 3-5 key points (adjust based on length preference)

The output MUST be valid JSON matching the schema above.`
}

function buildPlannerUserPrompt(params: PlannerParams): string {
  const { context, userProfile, format, customization } = params

  const formattedContext = formatContextForPrompt(context)

  return `
KEYNOTE CONTEXT:
${formattedContext}

USER PROFILE:
- Role: ${userProfile.role || 'Not specified'}
- Segment: ${userProfile.segment || 'Not specified'}
- Geography: ${userProfile.geo || 'Not specified'}
- Function: ${userProfile.function || 'Not specified'}

OUTPUT FORMAT: ${format}
TONE: ${customization.tone}
LENGTH: ${customization.length}
LANGUAGE: ${customization.language}
${customization.extra_instruction ? `ADDITIONAL CONTEXT: ${customization.extra_instruction}` : ''}

Generate a takeaway plan as JSON matching the schema. Make it highly relevant to the user's profile and compelling for the ${format} format.
`.trim()
}

function validatePlanStructure(plan: any): asserts plan is TakeawayPlan {
  if (!plan || typeof plan !== 'object') {
    throw new Error('Plan must be an object')
  }

  if (typeof plan.title !== 'string' || plan.title.length === 0) {
    throw new Error('Plan must have a non-empty title')
  }

  if (typeof plan.hook !== 'string' || plan.hook.length === 0) {
    throw new Error('Plan must have a non-empty hook')
  }

  if (!Array.isArray(plan.key_points) || plan.key_points.length < 3) {
    throw new Error('Plan must have at least 3 key points')
  }

  if (typeof plan.framing !== 'string' || plan.framing.length === 0) {
    throw new Error('Plan must have a non-empty framing')
  }

  if (typeof plan.cta !== 'string' || plan.cta.length === 0) {
    throw new Error('Plan must have a non-empty CTA')
  }
}
