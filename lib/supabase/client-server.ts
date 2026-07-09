// Server-side Supabase client using anon key — no auth session needed
// Singleton pattern: reuse the same client within a serverless function invocation
// to avoid repeated TCP handshakes on every Server Action call.

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function createClient() {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  _client = createSupabaseClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (url, opts = {}) => fetch(url, { ...opts, keepalive: true }),
    },
  })

  return _client
}
