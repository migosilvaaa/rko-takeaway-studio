import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { createServerSupabase } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          hd: process.env.GOOGLE_WORKSPACE_DOMAIN, // Restrict to workspace domain
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Verify the user is from the correct workspace domain
      const email = user.email
      const workspaceDomain = process.env.GOOGLE_WORKSPACE_DOMAIN

      if (workspaceDomain && email && !email.endsWith(`@${workspaceDomain}`)) {
        logger.warn('Sign-in attempt from unauthorized domain', { email, workspaceDomain })
        return false
      }

      try {
        const supabase = createServerSupabase()

        // Check if user profile exists
        const { data: existingProfile } = await supabase
          .from('users_profile')
          .select('id')
          .eq('email', email!)
          .single()

        if (!existingProfile) {
          // Create new user profile on first sign-in
          const { error: insertError } = await supabase.from('users_profile').insert({
            email: email!,
            name: user.name || email!.split('@')[0],
            role: 'User', // Default role
            segment: 'General', // Default segment
            geo: 'Global', // Default geo
            function: 'General', // Default function
            credits_remaining: 3, // Initial credits
            credits_used: 0,
            is_admin: false,
          })

          if (insertError) {
            logger.error('Failed to create user profile', { email, error: insertError })
            return false
          }

          logger.info('Created new user profile', { email, name: user.name })
        }

        return true
      } catch (error) {
        logger.error('Sign-in callback error', { error })
        return false
      }
    },
    async session({ session, token }) {
      // Add user ID to session if needed
      if (session.user && token.sub) {
        const supabase = createServerSupabase()
        const { data: profile } = await supabase
          .from('users_profile')
          .select('id')
          .eq('email', session.user.email!)
          .single()

        if (profile) {
          session.user.id = profile.id
        }
      }

      return session
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  session: {
    strategy: 'jwt',
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
