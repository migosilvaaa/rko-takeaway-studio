import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createServerSupabase } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

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
    const { generation_id } = body

    if (!generation_id) {
      return NextResponse.json({ error: 'generation_id is required' }, { status: 400 })
    }

    // Hard delete the generation (admin privilege)
    const { error: deleteError } = await supabase
      .from('generations')
      .delete()
      .eq('id', generation_id)

    if (deleteError) {
      logger.error('Admin remove generation failed', { error: deleteError })
      return NextResponse.json({ error: 'Failed to remove generation' }, { status: 500 })
    }

    logger.info('Admin removed generation', { generation_id, admin: session.user.email })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Admin remove error', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
