// Script para insertar datos pediátricos de Male Pediatra
// Ejecutar con: node insert_pediatric_data.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config()

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.PUBLIC_SUPABASE_ANON_KEY
)

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

async function insertPediatricData() {
  try {
    console.log('🔍 Buscando usuario Mariano...')
    
    // Buscar el usuario Mariano (suponiendo que usa email marianoromero)
    const { data: users, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      console.error('❌ Error buscando usuarios:', userError)
      return
    }
    
    // Buscar usuario que contenga "mariano" en el email
    let marianoUser = null
    if (users) {
      marianoUser = users.users.find(user => 
        user.email && user.email.toLowerCase().includes('mariano')
      )
    }
    
    if (!marianoUser) {
      console.error('❌ Usuario Mariano no encontrado')
      return
    }
    
    console.log('✅ Usuario Mariano encontrado:', marianoUser.email)
    const userId = marianoUser.id
    
    // Buscar el sujeto bebé de Mariano
    const { data: subjects, error: subjectError } = await supabase
      .from('subjects')
      .select('id, name, family_id')
      .eq('linked_user_id', userId)
    
    if (subjectError) {
      console.error('❌ Error buscando sujetos:', subjectError)
      return
    }
    
    // Buscar el bebé (probablemente el primer sujeto o uno que contenga "bebé")
    let babySubject = null
    if (subjects && subjects.length > 0) {
      babySubject = subjects.find(s => 
        s.name.toLowerCase().includes('bebé') || 
        s.name.toLowerCase().includes('male') ||
        s.name.toLowerCase().includes('baby')
      ) || subjects[0] // Si no encuentra, toma el primero
    }
    
    if (!babySubject) {
      console.error('❌ Sujeto bebé no encontrado')
      return
    }
    
    console.log('✅ Bebé encontrado:', babySubject.name)
    const subjectId = babySubject.id
    
    // Preparar eventos para insertar
    const events = []
    
    for (const entry of pediatricData) {
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
      console.error('❌ Error insertando eventos:', insertError)
      return
    }
    
    console.log('✅ Datos pediátricos insertados exitosamente!')
    console.log(`📊 Total de eventos insertados: ${events.length}`)
    console.log('📈 Resumen:')
    console.log(`   - Eventos de peso: ${events.filter(e => e.action_name.includes('Peso')).length}`)
    console.log(`   - Eventos de estatura: ${events.filter(e => e.action_name.includes('Estatura')).length}`)
    console.log(`   - Fechas: desde ${pediatricData[0].date} hasta ${pediatricData[pediatricData.length-1].date}`)
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar el script
insertPediatricData()