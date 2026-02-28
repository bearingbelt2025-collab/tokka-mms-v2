import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryFn<T> = (supabase: SupabaseClient) => PromiseLike<{ data: T[] | null; error: unknown }>

export function useSupabase<T>(queryFn: QueryFn<T>) {
  const [data, setData] = useState<T[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await queryFn(supabase)
    setData(data)
    setError(error)
    setLoading(false)
  }, [queryFn])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
