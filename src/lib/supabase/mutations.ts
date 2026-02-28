/**
 * Type-safe Supabase mutation helper.
 * Needed because TypeScript 5.9+ has stricter inference with Supabase's
 * PostgrestVersion "12" types, causing insert/update to resolve as `never`.
 * This helper bypasses the type issue while keeping runtime safety.
 */

import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns an untyped version of the supabase client for use with
 * insert/update/delete mutations where TypeScript 5.9 type inference fails.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMutationClient(supabase: SupabaseClient<Database>): any {
  return supabase
}
