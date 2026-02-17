'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useProfile } from '@/hooks/useProfile'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export function Header() {
  const { data: session } = useSession()
  const { profile, isLoading: profileLoading } = useProfile()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rko-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">RKO</span>
            </div>
            <span className="text-xl font-bold text-rko-dark hidden sm:inline">
              Takeaway Studio
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            {session && (
              <>
                <Link
                  href="/create"
                  className="text-gray-700 hover:text-rko-primary transition-colors font-medium"
                >
                  Create
                </Link>
                <Link
                  href="/board"
                  className="text-gray-700 hover:text-rko-primary transition-colors font-medium"
                >
                  Board
                </Link>
                {profile?.is_admin && (
                  <Link
                    href="/admin"
                    className="text-gray-700 hover:text-rko-primary transition-colors font-medium"
                  >
                    Admin
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* User Section */}
          <div className="flex items-center gap-4">
            {session ? (
              <>
                {/* Credits Badge */}
                {!profileLoading && profile && (
                  <Badge variant="info" className="hidden sm:inline-flex">
                    {profile.credits_remaining} Credits
                  </Badge>
                )}

                {/* User Menu */}
                <div className="flex items-center gap-3">
                  <div className="hidden md:block text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {profile?.name || session.user?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {profile?.role || 'User'}
                    </p>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {session.user?.image && (
                      <img
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <span className="text-sm text-gray-700 hidden lg:inline">
                      Sign Out
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <Button onClick={() => signIn('google')} size="sm">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
