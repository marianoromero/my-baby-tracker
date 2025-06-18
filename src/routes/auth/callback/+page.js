// src/routes/auth/callback/+page.js
import { redirect } from '@sveltejs/kit'

export const load = async ({ url }) => {
  // Supabase manejará la autenticación automáticamente
  // Solo necesitamos redirigir al usuario
  throw redirect(303, '/dashboard')
}