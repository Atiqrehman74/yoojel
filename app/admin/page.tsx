import { createClient, createServiceClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminDashboard from './AdminDashboard'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  // Check admin status
  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/?error=not_admin')
  }

  // Fetch all users
  const { data: users } = await service
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch stats
  const totalUsers = users?.length ?? 0
  const proUsers = users?.filter(u => u.plan === 'pro').length ?? 0
  const totalMessages = users?.reduce((sum, u) => sum + (u.message_count ?? 0), 0) ?? 0

  return (
    <AdminDashboard
      users={users ?? []}
      stats={{ totalUsers, proUsers, totalMessages }}
      adminEmail={user.email ?? ''}
    />
  )
}
