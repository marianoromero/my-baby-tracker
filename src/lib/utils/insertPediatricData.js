// Utilidad para insertar datos pediátricos de Male Pediatra
// Se ejecuta desde el frontend cuando el usuario está autenticado

import { supabase } from '$lib/supabase'

// Datos extraídos del CSV
const pediatricData = [
  { date: '2025-01-13', weight: '3.580', height: '0.51' },
  { date: '2025-01-17', weight: '3.345', height: null },
  { date: '2025-01-24', weight: '3.380', height: null },
  { date: '2025-02-03', weight: '3.630', height: null },
  { date: '2025-02-14', weight: '3.780', height: '0.53' },
  { date: '2025-03-12', weight: '4.350', height: null },
  { date: '2025-03-17', weight: '4.360', height: '0.565' },
  { date: '2025-03-25', weight: '4.500', height: null },
  { date: '2025-04-01', weight: '4.650', height: null },
  { date: '2025-04-15', weight: '4.790', height: '0.60' },
  { date: '2025-04-29', weight: '5.100', height: null },
  { date: '2025-05-14', weight: '5.350', height: '0.605' },
  { date: '2025-06-13', weight: '5.710', height: '0.62' }
]

export async function insertPediatricDataForCurrentUser() {
  try {
    console.log('🔍 Obteniendo usuario actual...')
    
    // Obtener usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw new Error('Usuario no autenticado')
    }
    
    console.log('✅ Usuario actual:', user.email)
    const userId = user.id
    
    // Primero obtener la familia del usuario
    const { data: userFamily, error: familyError } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
      .single()
    
    if (familyError || !userFamily) {
      throw new Error('Error obteniendo familia del usuario: ' + (familyError?.message || 'Familia no encontrada'))
    }
    
    // Buscar todos los sujetos de la familia (no solo los vinculados al usuario)
    const { data: familySubjects, error: subjectError } = await supabase
      .from('subjects')
      .select('id, name, family_id, linked_user_id')
      .eq('family_id', userFamily.family_id)
    
    if (subjectError) {
      throw new Error('Error buscando sujetos de la familia: ' + subjectError.message)
    }
    
    // Buscar específicamente "Mi Bebé" o sujetos similares (sin linked_user_id)
    let babySubject = null
    if (familySubjects && familySubjects.length > 0) {
      babySubject = familySubjects.find(s => 
        s.name.toLowerCase().includes('mi bebé') || 
        s.name.toLowerCase().includes('bebé') ||
        s.name.toLowerCase().includes('male') ||
        s.name.toLowerCase().includes('baby') ||
        s.name.toLowerCase().includes('niñ') ||
        s.name.toLowerCase().includes('hij') ||
        !s.linked_user_id // Priorizar sujetos sin usuario vinculado (el bebé)
      ) || familySubjects[0] // Si no encuentra, toma el primero
    }
    
    if (!babySubject) {
      throw new Error('No se encontró un sujeto bebé')
    }
    
    console.log('✅ Bebé encontrado:', babySubject.name, '- ID:', babySubject.id)
    const subjectId = babySubject.id
    
    // Verificar si ya existen datos similares para evitar duplicados
    const { data: existingEvents, error: checkError } = await supabase
      .from('events')
      .select('action_name, event_timestamp')
      .eq('subject_id', subjectId)
      .eq('user_id', userId)
      .or('action_name.like.%Peso%,action_name.like.%Estatura%')
      .gte('event_timestamp', '2025-01-01')
      .lte('event_timestamp', '2025-07-01')
    
    if (checkError) {
      console.warn('⚠️ Error verificando eventos existentes:', checkError.message)
    }
    
    if (existingEvents && existingEvents.length > 0) {
      console.log(`⚠️ Se encontraron ${existingEvents.length} eventos existentes de peso/estatura`)
      console.log('Los nuevos datos se añadirán de todas formas...')
    }
    
    // Preparar eventos para insertar
    const events = []
    
    for (const entry of pediatricData) {
      // Convertir fecha a timestamp ISO con hora específica (10:00 AM)
      const timestamp = new Date(entry.date + 'T10:00:00.000Z').toISOString()
      
      // Añadir evento de peso
      if (entry.weight) {
        events.push({
          subject_id: subjectId,
          user_id: userId,
          action_name: `Peso (${entry.weight}kg)`,
          event_timestamp: timestamp
        })
      }
      
      // Añadir evento de estatura
      if (entry.height) {
        events.push({
          subject_id: subjectId,
          user_id: userId,
          action_name: `Estatura (${entry.height}m)`,
          event_timestamp: timestamp
        })
      }
    }
    
    console.log(`📝 Insertando ${events.length} eventos...`)
    
    // Insertar todos los eventos
    const { data: insertedEvents, error: insertError } = await supabase
      .from('events')
      .insert(events)
      .select()
    
    if (insertError) {
      throw new Error('Error insertando eventos: ' + insertError.message)
    }
    
    console.log('✅ Datos pediátricos insertados exitosamente!')
    
    const summary = {
      totalEvents: events.length,
      weightEvents: events.filter(e => e.action_name.includes('Peso')).length,
      heightEvents: events.filter(e => e.action_name.includes('Estatura')).length,
      startDate: pediatricData[0].date,
      endDate: pediatricData[pediatricData.length-1].date,
      babyName: babySubject.name
    }
    
    console.log('📊 Resumen:')
    console.log(`   - Total de eventos: ${summary.totalEvents}`)
    console.log(`   - Eventos de peso: ${summary.weightEvents}`)
    console.log(`   - Eventos de estatura: ${summary.heightEvents}`)
    console.log(`   - Fechas: desde ${summary.startDate} hasta ${summary.endDate}`)
    console.log(`   - Sujeto: ${summary.babyName}`)
    
    return summary
    
  } catch (error) {
    console.error('❌ Error insertando datos pediátricos:', error.message)
    throw error
  }
}

// Función helper para mostrar los datos que se van a insertar
export function previewPediatricData() {
  console.log('📋 Vista previa de datos pediátricos a insertar:')
  console.log('========================================')
  
  pediatricData.forEach((entry, index) => {
    console.log(`${index + 1}. ${entry.date}:`)
    if (entry.weight) console.log(`   - Peso: ${entry.weight}kg`)
    if (entry.height) console.log(`   - Estatura: ${entry.height}m`)
    console.log('---')
  })
  
  const totalWeight = pediatricData.filter(e => e.weight).length
  const totalHeight = pediatricData.filter(e => e.height).length
  
  console.log(`📊 Total: ${totalWeight} pesos + ${totalHeight} estaturas = ${totalWeight + totalHeight} eventos`)
  
  return {
    totalEntries: pediatricData.length,
    weightEntries: totalWeight,
    heightEntries: totalHeight,
    totalEvents: totalWeight + totalHeight
  }
}