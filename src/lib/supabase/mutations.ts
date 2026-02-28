import { createClient } from './client'
import type { Machine, WorkOrder } from '@/types/database'

const supabase = createClient()

export async function updateMachineStatus(
  machineId: string,
  status: Machine['status']
) {
  const { error } = await supabase
    .from('machines')
    .update({ status })
    .eq('id', machineId)
  if (error) throw error
}

export async function closeWorkOrder(workOrderId: string) {
  const { error } = await supabase
    .from('work_orders')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', workOrderId)
  if (error) throw error
}

export async function uploadPhoto(
  file: File,
  bucket: string = 'photos'
): Promise<string> {
  const ext = file.name.split('.').pop()
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filename, file)
  if (error) throw error
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
  return urlData.publicUrl
}
