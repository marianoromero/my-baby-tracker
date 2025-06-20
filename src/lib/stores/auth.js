// src/lib/stores/auth.js
import { writable } from 'svelte/store'
import { supabase } from '$lib/supabase'
import { browser } from '$app/environment'

// Store para el usuario actual
export const user = writable(null)

// Store para el estado de carga
export const loading = writable(true)

// Solo ejecutar en el cliente
if (browser) {
  // Inicializar el store con la sesión actual
  supabase.auth.getSession().then(({ data: { session } }) => {
    user.set(session?.user ?? null)
    loading.set(false)
  })

  // Escuchar cambios en la autenticación
  supabase.auth.onAuthStateChange((event, session) => {
    user.set(session?.user ?? null)
  })
}

// Funciones helper para autenticación
export const signIn = async (email, password) => {
  loading.set(true)
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  loading.set(false)
  return { data, error }
}

export const signUp = async (email, password, invitationCode = null) => {
  loading.set(true)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        invitation_code: invitationCode
      }
    }
  })
  loading.set(false)
  return { data, error }
}

export const signInWithGoogle = async () => {
  loading.set(true)
  
  // Construir la URL de callback correcta considerando el base path
  const baseUrl = window.location.origin
  const basePath = import.meta.env.PROD ? '/my-baby-tracker' : ''
  const redirectUrl = `${baseUrl}${basePath}/auth/callback`
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl
    }
  })
  loading.set(false)
  return { data, error }
}

export const signOut = async () => {
  loading.set(true)
  const { error } = await supabase.auth.signOut()
  loading.set(false)
  return { error }
}