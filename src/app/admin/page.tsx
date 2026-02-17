'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { createClientSupabase } from '@/lib/supabase/client'
import type { Generation } from '@/types/generation'

interface Analytics {
  total_generations: number
  completed_generations: number
  failed_generations: number
  success_rate: number
  format_breakdown: Record<string, number>
  top_users: Array<{ id: string; name: string; email: string; credits_used: number }>
  recent_activity: Array<any>
}

interface Presenter {
  id: string
  name: string
  title: string
  heygen_avatar_id: string | null
  heygen_voice_id: string | null
  heygen_template_id: string | null
  enabled: boolean
}

export default function AdminPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'analytics' | 'moderation' | 'credits' | 'presenters'>('analytics')

  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [generations, setGenerations] = useState<Generation[]>([])
  const [presenters, setPresenters] = useState<Presenter[]>([])
  const [loading, setLoading] = useState(true)

  // Credit management state
  const [searchEmail, setSearchEmail] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [creditAction, setCreditAction] = useState<'set' | 'add'>('add')
  const [creditAmount, setCreditAmount] = useState(0)

  // Check admin access
  useEffect(() => {
    async function checkAdmin() {
      if (!session?.user?.email) {
        router.push('/')
        return
      }

      const supabase = createClientSupabase()
      const { data: profile } = await supabase
        .from('users_profile')
        .select('is_admin')
        .eq('email', session.user.email)
        .single()

      if (!profile?.is_admin) {
        router.push('/')
      }
    }

    checkAdmin()
  }, [session, router])

  // Fetch data based on active tab
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        if (activeTab === 'analytics') {
          const response = await fetch('/api/admin/analytics')
          const data = await response.json()
          setAnalytics(data.analytics)
        } else if (activeTab === 'moderation') {
          const supabase = createClientSupabase()
          const { data } = await supabase
            .from('generations')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)
          setGenerations(data || [])
        } else if (activeTab === 'presenters') {
          const response = await fetch('/api/admin/presenters')
          const data = await response.json()
          setPresenters(data.presenters || [])
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      fetchData()
    }
  }, [activeTab, session])

  const handleRemoveGeneration = async (generationId: string) => {
    if (!confirm('Are you sure you want to permanently remove this generation?')) return

    try {
      const response = await fetch('/api/admin/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generation_id: generationId }),
      })

      if (response.ok) {
        setGenerations(generations.filter((g) => g.id !== generationId))
        alert('Generation removed successfully')
      } else {
        alert('Failed to remove generation')
      }
    } catch (error) {
      console.error('Remove error:', error)
      alert('Failed to remove generation')
    }
  }

  const handleUpdateCredits = async () => {
    if (!selectedUserId) {
      alert('Please search for a user first')
      return
    }

    try {
      const response = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUserId,
          action: creditAction,
          amount: creditAmount,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Credits updated successfully. New balance: ${data.new_balance}`)
        setCreditAmount(0)
      } else {
        alert(`Failed to update credits: ${data.error}`)
      }
    } catch (error) {
      console.error('Credits update error:', error)
      alert('Failed to update credits')
    }
  }

  const handleSearchUser = async () => {
    if (!searchEmail) {
      alert('Please enter an email')
      return
    }

    try {
      const supabase = createClientSupabase()
      const { data, error } = await supabase
        .from('users_profile')
        .select('id, name, email, credits_remaining')
        .eq('email', searchEmail)
        .single()

      if (error || !data) {
        alert('User not found')
        setSelectedUserId('')
        return
      }

      setSelectedUserId(data.id)
      alert(`Found user: ${data.name} (${data.email})\nCurrent credits: ${data.credits_remaining}`)
    } catch (error) {
      console.error('Search error:', error)
      alert('Failed to search user')
    }
  }

  const handleTogglePresenter = async (presenter: Presenter) => {
    try {
      const response = await fetch('/api/admin/presenters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: presenter.id,
          name: presenter.name,
          title: presenter.title,
          heygen_avatar_id: presenter.heygen_avatar_id,
          heygen_voice_id: presenter.heygen_voice_id,
          heygen_template_id: presenter.heygen_template_id,
          enabled: !presenter.enabled,
        }),
      })

      if (response.ok) {
        setPresenters(
          presenters.map((p) =>
            p.id === presenter.id ? { ...p, enabled: !p.enabled } : p
          )
        )
      } else {
        alert('Failed to update presenter')
      }
    } catch (error) {
      console.error('Toggle presenter error:', error)
      alert('Failed to update presenter')
    }
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage content, users, and system settings</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <Button
            variant={activeTab === 'analytics' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics
          </Button>
          <Button
            variant={activeTab === 'moderation' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('moderation')}
          >
            🛡️ Moderation
          </Button>
          <Button
            variant={activeTab === 'credits' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('credits')}
          >
            💳 Credits
          </Button>
          <Button
            variant={activeTab === 'presenters' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('presenters')}
          >
            👤 Presenters
          </Button>
        </div>

        {loading && (
          <Card>
            <p className="text-center text-gray-600">Loading...</p>
          </Card>
        )}

        {/* Analytics Tab */}
        {!loading && activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Total Generations</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.total_generations}</p>
                </div>
              </Card>
              <Card>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{analytics.completed_generations}</p>
                </div>
              </Card>
              <Card>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Failed</p>
                  <p className="text-3xl font-bold text-red-600">{analytics.failed_generations}</p>
                </div>
              </Card>
              <Card>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Success Rate</p>
                  <p className="text-3xl font-bold text-blue-600">{analytics.success_rate}%</p>
                </div>
              </Card>
            </div>

            {/* Format Breakdown */}
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Format Breakdown</h2>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(analytics.format_breakdown).map(([format, count]) => (
                  <div key={format} className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-sm text-gray-600 capitalize">{format}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top Users */}
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Users (by credits used)</h2>
              <div className="space-y-2">
                {analytics.top_users.map((user, index) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-400">#{index + 1}</span>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <Badge variant="info">{user.credits_used} credits used</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Moderation Tab */}
        {!loading && activeTab === 'moderation' && (
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Content Moderation</h2>
            <div className="space-y-3">
              {generations.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No generations found</p>
              ) : (
                generations.map((gen) => (
                  <div key={gen.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={
                          gen.status === 'completed' ? 'success' :
                          gen.status === 'failed' ? 'danger' :
                          'info'
                        }>
                          {gen.status}
                        </Badge>
                        <Badge variant="default">{gen.format}</Badge>
                      </div>
                      <p className="font-medium text-gray-900">{gen.title || 'Untitled'}</p>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(gen.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/generation/${gen.id}`)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleRemoveGeneration(gen.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {/* Credits Tab */}
        {!loading && activeTab === 'credits' && (
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Credit Management</h2>
            <div className="space-y-6">
              {/* Search User */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search User by Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="user@company.com"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rko-primary focus:border-transparent"
                  />
                  <Button onClick={handleSearchUser}>Search</Button>
                </div>
              </div>

              {/* Adjust Credits */}
              {selectedUserId && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                  <h3 className="font-semibold text-gray-900">Adjust Credits</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Action
                      </label>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={creditAction === 'set' ? 'primary' : 'ghost'}
                          onClick={() => setCreditAction('set')}
                        >
                          Set
                        </Button>
                        <Button
                          size="sm"
                          variant={creditAction === 'add' ? 'primary' : 'ghost'}
                          onClick={() => setCreditAction('add')}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount
                      </label>
                      <input
                        type="number"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rko-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                  <Button onClick={handleUpdateCredits} variant="primary">
                    Update Credits
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Presenters Tab */}
        {!loading && activeTab === 'presenters' && (
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Presenter Management</h2>
            <div className="space-y-3">
              {presenters.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No presenters configured</p>
              ) : (
                presenters.map((presenter) => (
                  <div key={presenter.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">{presenter.name}</p>
                        <Badge variant={presenter.enabled ? 'success' : 'default'}>
                          {presenter.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{presenter.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Avatar: {presenter.heygen_avatar_id || 'N/A'} | Voice: {presenter.heygen_voice_id || 'N/A'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={presenter.enabled ? 'outline' : 'primary'}
                      onClick={() => handleTogglePresenter(presenter)}
                    >
                      {presenter.enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
