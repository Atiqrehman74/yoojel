import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ profile: null, debug: 'missing env' })
  }

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ profile: null, debug: 'no token' })

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const { data: { user }, error: userError } = await adminClient.auth.getUser(token)
  if (userError || !user) {
    return NextResponse.json({ profile: null, debug: `auth error: ${userError?.message}` })
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    // Auto-create profile if missing
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
