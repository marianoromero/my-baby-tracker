// Utilidad para limpiar y corregir datos pediátricos
import { supabase } from '$lib/supabase'

export async function cleanAndFixPediatricData() {
  try {
    console.log('🧹 Limpiando datos pediátricos incorrectos...')
    
    // Obtener usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw new Error('Usuario no autenticado')
    }
    
    console.log('✅ Usuario actual:', user.email)
    const userId = user.id
    
    // Obtener familia del usuario
    const { data: userFamily, error: familyError } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
      .single()
    
    if (familyError || !userFamily) {
      throw new Error('Error obteniendo familia del usuario')
    }
    
    // Buscar todos los sujetos de la familia
    const { data: familySubjects, error: subjectError } = await supabase
      .from('subjects')
      .select('id, name, linked_user_id')
      .eq('family_id', userFamily.family_id)
    
    if (subjectError) {
      throw new Error('Error buscando sujetos de la familia')
    }
    
    console.log('📋 Sujetos encontrados:', familySubjects.map(s => `${s.name} (${s.linked_user_id ? 'vinculado' : 'bebé'})`))
    
    // Identificar el sujeto bebé y el sujeto Mariano
    const babySubject = familySubjects.find(s => 
      s.name.toLowerCase().includes('mi bebé') || 
      s.name.toLowerCase().includes('bebé') ||
      !s.linked_user_id
    )
    
    const marianoSubject = familySubjects.find(s => 
      s.linked_user_id === userId
    )
    
    if (!babySubject) {
      throw new Error('No se encontró el sujeto bebé')
    }
    
    if (!marianoSubject) {
      throw new Error('No se encontró el sujeto de Mariano')
    }
    
    console.log(`👶 Sujeto bebé: ${babySubject.name} (ID: ${babySubject.id})`)
    console.log(`👨 Sujeto Mariano: ${marianoSubject.name} (ID: ${marianoSubject.id})`)
    
    // Buscar eventos de peso/estatura de enero-junio 2025
    const { data: pediatricEvents, error: eventsError } = await supabase
      .from('events')
      .select('id, action_name, event_timestamp, subject_id, subjects(name)')
      .or('action_name.ilike.%peso%,action_name.ilike.%estatura%')
      .gte('event_timestamp', '2025-01-01')
      .lte('event_timestamp', '2025-07-01')
      .order('event_timestamp', { ascending: true })
    
    if (eventsError) {
      throw new Error('Error buscando eventos pediátricos')
    }
    
    console.log(`📊 Eventos pediátricos encontrados: ${pediatricEvents.length}`)
    
    // Separar eventos por sujeto
    const babyEvents = pediatricEvents.filter(e => e.subject_id === babySubject.id)
    const marianoEvents = pediatricEvents.filter(e => e.subject_id === marianoSubject.id)
    
    console.log(`👶 Eventos en Mi Bebé: ${babyEvents.length}`)
    console.log(`👨 Eventos en Mariano: ${marianoEvents.length}`)
    
    if (marianoEvents.length === 0) {
      console.log('✅ No hay eventos incorrectos que limpiar')
      return {
        cleaned: 0,
        message: 'No se encontraron eventos que necesiten corrección'
      }
    }
    
    // Mostrar eventos que se van a mover
    console.log('🔄 Eventos a mover de Mariano a Mi Bebé:')
    marianoEvents.forEach((event, index) => {
      const date = new Date(event.event_timestamp).toLocaleDateString('es-ES')
      console.log(`${index + 1}. ${date} - ${event.action_name}`)
    })
    
    // Eliminar eventos incorrectos de Mariano
    const eventIdsToDelete = marianoEvents.map(e => e.id)
    
    console.log(`🗑️ Eliminando ${eventIdsToDelete.length} eventos incorrectos...`)
    
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .in('id', eventIdsToDelete)
    
    if (deleteError) {
      throw new Error('Error eliminando eventos incorrectos: ' + deleteError.message)
    }
    
    console.log('✅ Eventos incorrectos eliminados')
    
    // Reinsertar eventos en el sujeto bebé correcto
    const eventsToInsert = marianoEvents.map(event => ({
      subject_id: babySubject.id,
      user_id: userId, // Mariano sigue siendo quien los registra
      action_name: event.action_name,
      event_timestamp: event.event_timestamp
    }))
    
    console.log(`📝 Reinsertando ${eventsToInsert.length} eventos en Mi Bebé...`)
    
    const { data: insertedEvents, error: insertError } = await supabase
      .from('events')
      .insert(eventsToInsert)
      .select()
    
    if (insertError) {
      throw new Error('Error reinsertando eventos: ' + insertError.message)
    }
    
    console.log('✅ Eventos reinsertados correctamente')
    
    const summary = {
      cleaned: marianoEvents.length,
      totalBabyEvents: babyEvents.length + marianoEvents.length,
      babySubjectName: babySubject.name,
      marianoSubjectName: marianoSubject.name
    }
    
    console.log('📊 Resumen de limpieza:')
    console.log(`   - Eventos movidos: ${summary.cleaned}`)
    console.log(`   - Total eventos en ${summary.babySubjectName}: ${summary.totalBabyEvents}`)
    console.log(`   - Sujeto correcto: ${summary.babySubjectName}`)
    
    return summary
    
  } catch (error) {
    console.error('❌ Error en limpieza:', error.message)
    throw error
  }
}