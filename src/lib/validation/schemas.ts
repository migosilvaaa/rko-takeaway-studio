import { z } from 'zod'

/**
 * Validation schemas for API requests
 */

export const generateRequestSchema = z.object({
  format: z.enum(['video', 'podcast', 'slides']),
  presenter_id: z.string().uuid().optional().nullable(),
  language: z.string().min(2).max(10).default('en'),
  tone: z.enum(['professional', 'casual', 'inspiring', 'technical', 'executive']).default('professional'),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
  extra_instruction: z.string().max(200).optional().nullable(),
})

export type GenerateRequest = z.infer<typeof generateRequestSchema>

export const upvoteRequestSchema = z.object({
  generation_id: z.string().uuid(),
})

export type UpvoteRequest = z.infer<typeof upvoteRequestSchema>

export const deleteRequestSchema = z.object({
  generation_id: z.string().uuid(),
})

export type DeleteRequest = z.infer<typeof deleteRequestSchema>

export const boardQuerySchema = z.object({
  format: z.enum(['video', 'podcast', 'slides']).optional(),
  time_filter: z.enum(['day', 'week', 'month', 'all']).default('month'),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

export type BoardQuery = z.infer<typeof boardQuerySchema>

export const adminRemovePostSchema = z.object({
  generation_id: z.string().uuid(),
  reason: z.string().optional(),
})

export type AdminRemovePost = z.infer<typeof adminRemovePostSchema>

export const adminSetCreditsSchema = z.object({
  user_id: z.string().uuid(),
  credits: z.number().min(0).max(1000),
})

export type AdminSetCredits = z.infer<typeof adminSetCreditsSchema>

export const adminToggleGenerationSchema = z.object({
  enabled: z.boolean(),
})

export type AdminToggleGeneration = z.infer<typeof adminToggleGenerationSchema>

export const adminUpdatePresenterSchema = z.object({
  presenter_id: z.string().uuid(),
  enabled: z.boolean().optional(),
  heygen_avatar_id: z.string().optional(),
  heygen_voice_id: z.string().optional(),
  heygen_template_id: z.string().optional(),
})

export type AdminUpdatePresenter = z.infer<typeof adminUpdatePresenterSchema>

export const profileUpdateSchema = z.object({
  role: z.string().max(100).optional(),
  segment: z.string().max(100).optional(),
  geo: z.string().max(100).optional(),
  function: z.string().max(100).optional(),
})

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>
