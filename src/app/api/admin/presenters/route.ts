import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createServerSupabase } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerSupabase()

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users_profile')
      .select('is_admin')
      .eq('email', session.user.email)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    // Fetch all presenters (including disabled ones for admin)
    const { data: presenters, error } = await supabase
      .from('leader_presenters')
      .select('*')
      .order('name')

    if (error) {
      logger.error('Fetch presenters failed', { error })
      return NextResponse.json({ error: 'Failed to fetch presenters' }, { status: 500 })
    }

    return NextResponse.json({ presenters })
  } catch (error) {
    logger.error('Admin presenters GET error', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerSupabase()

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users_profile')
      .select('is_admin')
      .eq('email', session.user.email)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const body = await req.json()
    const { id, name, title, heygen_avatar_id, heygen_voice_id, heygen_template_id, enabled } = body

    if (id) {
      // Update existing presenter
      const { data, error } = await supabase
        .from('leader_presenters')
        .update({
          name,
          title,
          heygen_avatar_id,
          heygen_voice_id,
          heygen_template_id,
          enabled,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        logger.error('Update presenter failed', { error })
        return NextResponse.json({ error: 'Failed to update presenter' }, { status: 500 })
      }

      logger.info('Admin updated presenter', { presenter_id: id, admin: session.user.email })

      return NextResponse.json({ presenter: data })
    } else {
      // Create new presenter
      const { data, error } = await supabase
        .from('leader_presenters')
        .insert({
          name,
          title,
          heygen_avatar_id,
          heygen_voice_id,
          heygen_template_id,
          enabled: enabled ?? true,
        })
        .select()
        .single()

      if (error) {
        logger.error('Create presenter failed', { error })
        return NextResponse.json({ error: 'Failed to create presenter' }, { status: 500 })
      }

      logger.info('Admin created presenter', { presenter_id: data.id, admin: session.user.email })

      return NextResponse.json({ presenter: data })
    }
  } catch (error) {
    logger.error('Admin presenters POST error', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
