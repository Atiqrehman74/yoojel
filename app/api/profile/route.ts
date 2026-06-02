import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ profile: null })
  }

  // Get the user's JWT from the Authorization header
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ profile: null })

  // Verify the token and get the user
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const { data: { user }, error: userError } = await adminClient.auth.getUser(token)
  if (userError || !user) return NextResponse.json({ profile: null })

  // Fetch the profile using service role (bypasses RLS)
  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // If no profile exists yet, auto-create it
  if (!profile) {
    const { data: newProfile } = await adminClient
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name ?? null,
        plan: 'free',
        message_count: 0,
        is_admin: false,
      })
      .select()
      .single()
    return NextResponse.json({ profile: newProfile })
  }

  return NextResponse.json({ profile })
}
