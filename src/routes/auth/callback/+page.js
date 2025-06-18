// src/routes/auth/callback/+page.js
import { redirect } from '@sveltejs/kit'
import { base } from '$app/paths'

export const load = async ({ url }) => {
  // Supabase manejará la autenticación automáticamente
  // Solo necesitamos redirigir al usuario
  throw redirect(303, `${base}/dashboard`)
}