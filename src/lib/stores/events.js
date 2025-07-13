// src/lib/stores/events.js
import { writable, derived } from 'svelte/store'
import { supabase } from '$lib/supabase'
import { subjects } from './family'
import { family } from './family'

/** @typedef {'today' | 'yesterday' | 'week' | 'month' | 'all'} FilterType */

/** @typedef {{
  id: string;
  event_timestamp: string;
  user_id: string;
  subjects: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}} Event */

/** @type {import('svelte/store').Writable<Event[]>} */
export const events = writable([])
export const eventsLoading = writable(false)
/** @type {import('svelte/store').Writable<FilterType>} */
export const selectedFilter = writable('today')

// Función para obtener el rango de fechas según el filtro
/** @param {FilterType} filter */
function getDateRange(filter) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  switch (filter) {
    case 'today':
      return {
        start: today.toISOString(),
        end: tomorrow.toISOString()
      }
    
    case 'yesterday':
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return {
        start: yesterday.toISOString(),
        end: today.toISOString()
      }
    
    case 'week':
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return {
        start: weekAgo.toISOString(),
        end: tomorrow.toISOString()
      }
    
    case 'month':
      const monthAgo = new Date(today)
      monthAgo.setDate(monthAgo.getDate() - 30)
      return {
        start: monthAgo.toISOString(),
        end: tomorrow.toISOString()
      }
    
    case 'all':
      return {
        start: null,
        end: null
      }
    
    default:
      return {
        start: today.toISOString(),
        end: tomorrow.toISOString()
      }
  }
}

// Función para cargar eventos
export async function loadEvents(filter = 'today') {
  eventsLoading.set(true)
  
  try {
    const { start, end } = getDateRange(filter)
    
    // Construir query base
    let query = supabase
      .from('events')
      .select(`
        id,
        action_name,
        event_timestamp,
        user_id,
        subject_id,
        subjects (
          id,
          name,
          icon,
          color
        )
      `)
      .order('event_timestamp', { ascending: false })
    
    // Aplicar filtros de fecha si no es "all"
    if (start && end) {
      query = query
        .gte('event_timestamp', start)
        .lt('event_timestamp', end)
    }
    
    // Limitar resultados si es "all" para evitar cargar demasiados datos
    if (filter === 'all') {
      query = query.limit(500) // Aumentado de 100 a 500 para mostrar más historial
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error al cargar eventos:', error)
      events.set([])
    } else {
      console.log('Eventos cargados:', data)
      events.set(data || [])
    }
  } catch (err) {
    console.error('Error general al cargar eventos:', err)
    events.set([])
  } finally {
    eventsLoading.set(false)
  }
}

// Eventos agrupados por fecha
/** @type {import('svelte/store').Readable<Record<string, Event[]>>} */
export const groupedEvents = derived(events, ($events) => {
  const groups = {}
  
  $events.forEach(event => {
    const date = new Date(event.event_timestamp)
    const dateKey = date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    
    groups[dateKey].push(event)
  })
  
  return groups
})

// Suscribirse a eventos en tiempo real
/** @param {string} familyId */
export function subscribeToEvents(familyId) {
  if (!familyId) return null
  
  const subscription = supabase
    .channel(`events:${familyId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'events',
        filter: `subject_id=in.(SELECT id FROM subjects WHERE family_id=eq.${familyId})`
      },
      async (payload) => {
        console.log('Nuevo evento recibido:', payload)
        
        // Obtener los datos completos del evento
        const { data: newEvent } = await supabase
          .from('events')
          .select(`
            id,
            action_name,
            event_timestamp,
            user_id,
            subject_id,
            subjects (
              id,
              name,
              icon,
              color
            )
          `)
          .eq('id', payload.new.id)
          .single()
        
        if (newEvent) {
          // Agregar el nuevo evento al principio de la lista
          events.update(currentEvents => [newEvent, ...currentEvents])
        }
      }
    )
    .subscribe()
  
  return subscription
}

// Función para formatear la hora
/** @param {string} timestamp */
export function formatEventTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Función para obtener el nombre del usuario
/** @param {Event} event */
// Variable para cache de subjects
let subjectsCache = []
subjects.subscribe(value => {
  subjectsCache = value
})

export function getUserName(event) {
  // Buscar el subject que está vinculado al usuario que creó el evento
  const linkedSubject = subjectsCache.find(subject => 
    subject.linked_user_id === event.user_id
  )
  
  if (linkedSubject) {
    return linkedSubject.name
  }
  
  // Fallback: intentar obtener información del usuario
  // Si tenemos el email del usuario en el evento
  if (event.user_email) {
    const username = event.user_email.split('@')[0]
    return username
  }
  
  // Último fallback
  return 'Usuario'
}

// Función para eliminar un evento
export async function deleteEvent(eventId) {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
    
    if (error) {
      console.error('Error eliminando evento:', error)
      return { success: false, error: error.message }
    }
    
    // Remover el evento del store local
    events.update(currentEvents => 
      currentEvents.filter(event => event.id !== eventId)
    )
    
    return { success: true }
  } catch (err) {
    console.error('Error inesperado:', err)
    return { success: false, error: 'Error inesperado' }
  }
}