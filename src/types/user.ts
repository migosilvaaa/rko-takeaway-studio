export interface UserProfile {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string | null
  segment: string | null
  geo: string | null
  function: string | null
  credits_remaining: number
  credits_used: number
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface LeaderPresenter {
  id: string
  name: string
  title: string | null
  heygen_avatar_id: string
  heygen_voice_id: string
  heygen_template_id: string | null
  thumbnail_url: string | null
  description: string | null
  enabled: boolean
  display_order: number
}
