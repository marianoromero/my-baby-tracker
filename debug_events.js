// Script para debuggear eventos en la base de datos
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.PUBLIC_SUPABASE_ANON_KEY
)

async function debugEvents() {
  try {
    console.log('🔍 Verificando todos los eventos en la base de datos...')
    
    // Obtener todos los eventos sin filtros
    const { data: allEvents, error } = await supabase
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
      .order('event_timestamp', { ascending: true }) // Ascendente para ver los más antiguos primero
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    console.log(`📊 Total de eventos encontrados: ${allEvents.length}`)
    console.log('📅 Eventos ordenados por fecha (más antiguos primero):')
    console.log('=' .repeat(60))
    
    allEvents.forEach((event, index) => {
      const date = new Date(event.event_timestamp)
      const formattedDate = date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
      
      console.log(`${index + 1}. ${formattedDate} - ${event.action_name} (${event.subjects?.name || 'Sin sujeto'})`)
    })
    
    if (allEvents.length > 0) {
      const firstEvent = new Date(allEvents[0].event_timestamp)
      const lastEvent = new Date(allEvents[allEvents.length - 1].event_timestamp)
      
      console.log('=' .repeat(60))
      console.log(`📅 Rango de fechas:`)
      console.log(`   Primer evento: ${firstEvent.toLocaleDateString('es-ES')}`)
      console.log(`   Último evento: ${lastEvent.toLocaleDateString('es-ES')}`)
    }
    
    // Buscar específicamente eventos de peso y estatura
    console.log('\n🔍 Buscando eventos de peso y estatura...')
    const { data: weightHeightEvents, error: whError } = await supabase
      .from('events')
      .select('action_name, event_timestamp, subjects(name)')
      .or('action_name.ilike.%peso%,action_name.ilike.%estatura%')
      .order('event_timestamp', { ascending: true })
    
    if (whError) {
      console.error('❌ Error buscando peso/estatura:', whError)
    } else {
      console.log(`📊 Eventos de peso/estatura: ${weightHeightEvents.length}`)
      weightHeightEvents.forEach((event, index) => {
        const date = new Date(event.event_timestamp)
        console.log(`${index + 1}. ${date.toLocaleDateString('es-ES')} - ${event.action_name}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

debugEvents()