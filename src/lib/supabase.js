// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    redirectTo: typeof window !== 'undefined' && window.location.hostname === 'localhost' 
      ? 'http://localhost:5174/auth/callback'
      : undefined
  }
})