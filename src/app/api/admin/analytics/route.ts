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

    // Fetch analytics data
    const [
      { count: totalGenerations },
      { count: completedGenerations },
      { count: failedGenerations },
      { data: formatBreakdown },
      { data: topUsers },
      { data: recentActivity },
    ] = await Promise.all([
      supabase.from('generations').select('*', { count: 'exact', head: true }),
      supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed'),
      supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed'),
      supabase
        .from('generations')
        .select('format')
        .eq('status', 'completed')
        .then(({ data, error }) => {
          if (error || !data) return { data: [] }
          const breakdown = data.reduce((acc: Record<string, number>, gen) => {
            acc[gen.format] = (acc[gen.format] || 0) + 1
            return acc
          }, {})
          return { data: breakdown }
        }),
      supabase
        .from('users_profile')
        .select('id, name, email, credits_used')
        .order('credits_used', { ascending: false })
        .limit(10),
      supabase
        .from('generations')
        .select('id, format, status, created_at, users_profile(name, email)')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    const analytics = {
      total_generations: totalGenerations || 0,
      completed_generations: completedGenerations || 0,
      failed_generations: failedGenerations || 0,
      success_rate:
        totalGenerations > 0
          ? Math.round(((completedGenerations || 0) / totalGenerations) * 100)
          : 0,
      format_breakdown: formatBreakdown || {},
      top_users: topUsers || [],
      recent_activity: recentActivity || [],
    }

    return NextResponse.json({ analytics })
  } catch (error) {
    logger.error('Admin analytics error', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
