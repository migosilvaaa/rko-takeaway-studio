import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createServerSupabase } from '@/lib/supabase/server'
import { setUserCredits, addUserCredits } from '@/lib/credits/manager'
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
    const { user_id, action, amount } = body

    if (!user_id || !action || typeof amount !== 'number') {
      return NextResponse.json(
        { error: 'user_id, action (set|add), and amount are required' },
        { status: 400 }
      )
    }

    let success = false
    let newBalance = 0

    if (action === 'set') {
      success = await setUserCredits(user_id, amount)
      newBalance = amount
    } else if (action === 'add') {
      success = await addUserCredits(user_id, amount)
      // Fetch new balance
      const { data: userData } = await supabase
        .from('users_profile')
        .select('credits_remaining')
        .eq('id', user_id)
        .single()
      newBalance = userData?.credits_remaining || 0
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "set" or "add"' }, { status: 400 })
    }

    if (!success) {
      return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 })
    }

    logger.info('Admin updated credits', {
      user_id,
      action,
      amount,
      newBalance,
      admin: session.user.email,
    })

    return NextResponse.json({ success: true, new_balance: newBalance })
  } catch (error) {
    logger.error('Admin credits error', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
