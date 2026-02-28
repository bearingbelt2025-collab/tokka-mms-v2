import { useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Returns a stable Supabase client instance that persists across re-renders.
 * Prevents infinite refetch loops caused by useCallback dependency changes.
 */
export function useSupabase() {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => createClient(), [])
}
