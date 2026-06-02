import { createBrowserClient } from '@supabase/ssr'

export type Profile = {
  id: string
  email: string
  full_name: string | null
  plan: 'free' | 'pro'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  message_count: number
  is_admin: boolean
  created_at: string
}

const rawUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? ''
const rawAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Valid only if it's a proper https URL (not empty/placeholder/malformed)
export const supabaseConfigured = (() => {
  try {
    if (!rawUrl) return false
    const parsed = new URL(rawUrl)
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
           !rawUrl.includes('placeholder')
  } catch {
    return false
  }
})()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient(): any {
  if (!supabaseConfigured) return createSafeStub()
  return createBrowserClient(rawUrl, rawAnon)
}

// Safe stub used during prerender / when Supabase is not configured.
// Prevents build errors — all methods return empty/null safely.
function createSafeStub() {
  return {
    auth: {
      getUser:              async () => ({ data: { user: null }, error: null }),
      signInWithPassword:   async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      signUp:               async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      signOut:              async () => ({ error: null }),
      signInWithOAuth:      async () => ({ data: null, error: null }),
      onAuthStateChange:    (_event: unknown, _cb: unknown) => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession:           async () => ({ data: { session: null }, error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  } as any
}
