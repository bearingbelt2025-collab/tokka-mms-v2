import { createClient } from './client'

export async function updateWorkOrderStatus(
  workOrderId: number,
  status: string,
  userId: string
) {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { error } = await sb
    .from('work_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', workOrderId)

  if (error) throw error
  return { success: true, userId }
}
