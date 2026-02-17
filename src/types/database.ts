export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string
          value: Json
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          updated_at?: string
        }
      }
      users_profile: {
        Row: {
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
        Insert: {
          id?: string
          email: string
          name?: string | null
          image?: string | null
          role?: string | null
          segment?: string | null
          geo?: string | null
          function?: string | null
          credits_remaining?: number
          credits_used?: number
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          image?: string | null
          role?: string | null
          segment?: string | null
          geo?: string | null
          function?: string | null
          credits_remaining?: number
          credits_used?: number
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      transcript: {
        Row: {
          id: string
          title: string
          event_name: string | null
          speaker_name: string | null
          raw_text: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          event_name?: string | null
          speaker_name?: string | null
          raw_text: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          event_name?: string | null
          speaker_name?: string | null
          raw_text?: string
          metadata?: Json
          created_at?: string
        }
      }
      transcript_chunks: {
        Row: {
          id: string
          transcript_id: string
          theme: string
          content: string
          token_count: number
          chunk_index: number
          embedding: number[] | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          transcript_id: string
          theme: string
          content: string
          token_count: number
          chunk_index: number
          embedding?: number[] | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          transcript_id?: string
          theme?: string
          content?: string
          token_count?: number
          chunk_index?: number
          embedding?: number[] | null
          metadata?: Json
          created_at?: string
        }
      }
      leader_presenters: {
        Row: {
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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          title?: string | null
          heygen_avatar_id: string
          heygen_voice_id: string
          heygen_template_id?: string | null
          thumbnail_url?: string | null
          description?: string | null
          enabled?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          title?: string | null
          heygen_avatar_id?: string
          heygen_voice_id?: string
          heygen_template_id?: string | null
          thumbnail_url?: string | null
          description?: string | null
          enabled?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      generations: {
        Row: {
          id: string
          user_id: string
          format: 'video' | 'podcast' | 'slides'
          presenter_id: string | null
          language: string
          tone: string
          length: string
          extra_instruction: string | null
          rag_query: string | null
          rag_chunks_used: string[]
          takeaway_plan: Json | null
          script: string | null
          output_urls: Json
          thumbnail_url: string | null
          status: 'queued' | 'processing' | 'rendering' | 'completed' | 'failed'
          error_message: string | null
          retry_count: number
          upvotes_count: number
          views_count: number
          is_public: boolean
          is_deleted: boolean
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          format: 'video' | 'podcast' | 'slides'
          presenter_id?: string | null
          language?: string
          tone?: string
          length?: string
          extra_instruction?: string | null
          rag_query?: string | null
          rag_chunks_used?: string[]
          takeaway_plan?: Json | null
          script?: string | null
          output_urls?: Json
          thumbnail_url?: string | null
          status?: 'queued' | 'processing' | 'rendering' | 'completed' | 'failed'
          error_message?: string | null
          retry_count?: number
          upvotes_count?: number
          views_count?: number
          is_public?: boolean
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          format?: 'video' | 'podcast' | 'slides'
          presenter_id?: string | null
          language?: string
          tone?: string
          length?: string
          extra_instruction?: string | null
          rag_query?: string | null
          rag_chunks_used?: string[]
          takeaway_plan?: Json | null
          script?: string | null
          output_urls?: Json
          thumbnail_url?: string | null
          status?: 'queued' | 'processing' | 'rendering' | 'completed' | 'failed'
          error_message?: string | null
          retry_count?: number
          upvotes_count?: number
          views_count?: number
          is_public?: boolean
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      upvotes: {
        Row: {
          id: string
          user_id: string
          generation_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          generation_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          generation_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_upvote_count: {
        Args: { generation_uuid: string }
        Returns: void
      }
      decrement_upvote_count: {
        Args: { generation_uuid: string }
        Returns: void
      }
      deduct_credits: {
        Args: { user_uuid: string; amount?: number }
        Returns: boolean
      }
      match_transcript_chunks: {
        Args: {
          query_embedding: number[]
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          transcript_id: string
          theme: string
          content: string
          token_count: number
          similarity: number
        }[]
      }
      increment_views_count: {
        Args: { generation_uuid: string }
        Returns: void
      }
      get_trending_generations: {
        Args: {
          limit_count?: number
          offset_count?: number
          format_filter?: string | null
          time_filter?: string
        }
        Returns: {
          id: string
          user_id: string
          format: string
          language: string
          tone: string
          output_urls: Json
          thumbnail_url: string | null
          upvotes_count: number
          views_count: number
          created_at: string
          user_name: string | null
          user_email: string
        }[]
      }
      user_has_upvoted: {
        Args: { user_uuid: string; generation_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
