import { createClient } from './client'

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
}

export async function updateProfile(userId: string, data: { name?: string; avatar_url?: string }) {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('profiles')
    .update(data)
    .eq('id', userId)
  return { error }
}
