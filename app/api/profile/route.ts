import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnon || !serviceKey) {
    return NextResponse.json({ profile: null })
  }

  // Read the session from cookies (browser sends them automatically)
  const cookieStore = cookies()
  const serverClient = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll() {},
    },
  })

  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ profile: null })

  // Use service role to bypass RLS
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    const { data: newProfile } = await adminClient
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email ?? '',
        full_name: (user.user_metadata?.full_name as string) ?? null,
        plan: 'free',
        message_count: 0,
        is_admin: false,
      })
      .select()
      .single()
    return NextResponse.json({ profile: newProfile ?? null })
  }

  return NextResponse.json({ profile })
}
