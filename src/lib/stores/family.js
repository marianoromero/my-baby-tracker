// src/lib/stores/family.js
import { writable, derived } from 'svelte/store'
import { supabase } from '$lib/supabase'
import { user } from './auth'

// Store para la familia actual
export const family = writable(null)
export const familyLoading = writable(true)

// Store para los sujetos
export const subjects = writable([])

// Store para las acciones
export const actions = writable({})

// Función para crear o obtener la familia del usuario
export async function initializeFamily() {
  familyLoading.set(true)
  
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    console.log('Usuario actual:', currentUser?.id)
    
    // Verificar si el usuario ya tiene una familia
    const { data: familyMembers, error: memberError } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', currentUser.id)

    console.log('Family member query:', { familyMembers, memberError })

    if (memberError) {
      console.error('Error al buscar familia:', memberError)
      familyLoading.set(false)
      return
    }

    const familyMember = familyMembers && familyMembers.length > 0 ? familyMembers[0] : null

    let familyId

    if (familyMember) {
      // El usuario ya tiene una familia
      familyId = familyMember.family_id
      console.log('Usuario tiene familia:', familyId)
    } else {
      // El usuario no tiene familia - necesita onboarding
      console.log('Usuario necesita onboarding')
      familyLoading.set(false)
      return { needsOnboarding: true }
    }

    if (!familyId) {
      console.error('No se pudo obtener o crear familia')
      familyLoading.set(false)
      return
    }

    // Obtener datos completos de la familia
    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .select('*')
      .eq('id', familyId)
      .single()

    console.log('Family data query:', { familyData, familyError })

    if (familyError) {
      console.error('Error al obtener familia:', familyError)
    } else {
      family.set(familyData)
      await loadSubjectsAndActions(familyId)
    }
  } catch (err) {
    console.error('Error general en initializeFamily:', err)
  } finally {
    familyLoading.set(false)
  }
}

// Generar código de invitación de 6 caracteres
function generateInvitationCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

// Función auxiliar para crear nueva familia
async function createNewFamily(userId) {
  const invitationCode = generateInvitationCode()
  console.log('Código de invitación generado:', invitationCode)
  
  const { data: newFamily, error: familyError } = await supabase
    .from('families')
    .insert({ invitation_code: invitationCode })
    .select()
    .single()

  if (familyError) {
    console.error('Error al crear familia:', familyError)
    return null
  }

  console.log('Familia creada:', newFamily)
  console.log('Código generado vs código en DB:', invitationCode, 'vs', newFamily.invitation_code)
  
  // Si la base de datos sobrescribió el código, actualizarlo manualmente
  if (newFamily.invitation_code !== invitationCode) {
    console.log('La base de datos sobrescribió el código, actualizando...')
    const { data: updatedFamily, error: updateError } = await supabase
      .from('families')
      .update({ invitation_code: invitationCode })
      .eq('id', newFamily.id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error actualizando código:', updateError)
    } else {
      console.log('Código actualizado exitosamente:', updatedFamily)
      newFamily.invitation_code = invitationCode
    }
  }

  // Añadir al usuario como miembro
  const { error: addMemberError } = await supabase
    .from('family_members')
    .insert({
      user_id: userId,
      family_id: newFamily.id
    })

  if (addMemberError) {
    console.error('Error al añadir miembro:', addMemberError)
  }

  return newFamily.id
}

// Cargar sujetos y sus acciones
async function loadSubjectsAndActions(familyId) {
  console.log('Cargando sujetos para familia:', familyId)
  
  // Cargar sujetos
  const { data: subjectsData, error: subjectsError } = await supabase
    .from('subjects')
    .select('*')
    .eq('family_id', familyId)
    .order('position')

  console.log('Subjects query:', { subjectsData, subjectsError })

  if (subjectsError) {
    console.error('Error al cargar sujetos:', subjectsError)
    return
  }

  subjects.set(subjectsData || [])

  // Cargar acciones para cada sujeto
  const actionsMap = {}
  
  for (const subject of subjectsData || []) {
    const { data: actionsData, error: actionsError } = await supabase
      .from('actions')
      .select('*')
      .eq('subject_id', subject.id)
      .order('name')

    console.log(`Actions for ${subject.name}:`, { actionsData, actionsError })

    if (!actionsError) {
      actionsMap[subject.id] = actionsData || []
    }
  }

  actions.set(actionsMap)
  console.log('Actions map final:', actionsMap)
}

// Función para unirse a una familia con código de invitación
export async function joinFamilyWithCode(invitationCode) {
  try {
    // Buscar familia por código
    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .select('id')
      .eq('invitation_code', invitationCode.toUpperCase())
      .single()

    if (familyError || !familyData) {
      return { error: 'Código de invitación inválido' }
    }

    // Verificar si ya es miembro
    const userId = (await supabase.auth.getUser()).data.user.id
    const { data: existingMember } = await supabase
      .from('family_members')
      .select('user_id')
      .eq('user_id', userId)
      .eq('family_id', familyData.id)
      .single()

    if (existingMember) {
      return { error: 'Ya eres miembro de esta familia' }
    }

    // Añadir como miembro
    const { error: addError } = await supabase
      .from('family_members')
      .insert({
        user_id: userId,
        family_id: familyData.id
      })

    if (addError) {
      return { error: 'Error al unirse a la familia' }
    }

    // Crear un sujeto/miembro personal para el nuevo usuario
    const { data: userProfile } = await supabase.auth.getUser()
    const userEmail = userProfile?.user?.email || ''
    const userName = userEmail.split('@')[0] || 'Nuevo miembro'

    const { data: newSubject, error: subjectError } = await supabase
      .from('subjects')
      .insert({
        name: userName,
        icon: 'fa-user',
        color: '#45B7D1',
        family_id: familyData.id,
        linked_user_id: userId
      })
      .select()
      .single()

    if (subjectError) {
      console.error('Error creando sujeto para nuevo miembro:', subjectError)
      // No fallar por esto, el usuario puede crear su propio sujeto después
    } else {
      console.log('Sujeto creado para nuevo miembro:', newSubject)
      
      // Crear acciones por defecto para el nuevo miembro
      const defaultActions = [
        'Salió de casa',
        'Llegó a casa',
        'Comida',
        'Descanso'
      ]

      const { error: actionsError } = await supabase
        .from('actions')
        .insert(
          defaultActions.map(actionName => ({
            subject_id: newSubject.id,
            name: actionName
          }))
        )

      if (actionsError) {
        console.error('Error creando acciones para nuevo miembro:', actionsError)
      }
    }

    return { success: true, familyId: familyData.id }
  } catch (err) {
    return { error: 'Error inesperado' }
  }
}

let currentUserId = null

// Suscribirse a cambios de la familia cuando el usuario cambie
user.subscribe(async ($user) => {
  const newUserId = $user?.id || null
  
  // Solo procesar si el usuario realmente cambió
  if (newUserId !== currentUserId) {
    currentUserId = newUserId
    
    if ($user) {
      console.log('Usuario cambió, inicializando familia para:', $user.id)
      const result = await initializeFamily()
      
      // Si el usuario necesita onboarding, esto se manejará en el layout
      if (result?.needsOnboarding) {
        console.log('Usuario necesita ir a onboarding')
      }
    } else {
      console.log('Usuario cerró sesión, limpiando datos')
      family.set(null)
      subjects.set([])
      actions.set({})
      familyLoading.set(false)
    }
  }
})