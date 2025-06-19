<!-- src/routes/family/+page.svelte -->
<script>
  import { goto } from '$app/navigation'
  import { base } from '$app/paths'
  import { user } from '$lib/stores/auth'
  import { family, subjects, actions } from '$lib/stores/family'
  import { supabase } from '$lib/supabase'
  
  let loading = false
  let error = null
  let success = false
  let editingSubject = null
  let editingName = ''

  // Función para actualizar el nombre de un sujeto
  async function updateSubjectName(subjectId, newName) {
    if (!newName.trim()) {
      error = 'El nombre no puede estar vacío'
      return
    }

    loading = true
    error = null

    try {
      const { error: updateError } = await supabase
        .from('subjects')
        .update({ name: newName.trim() })
        .eq('id', subjectId)

      if (updateError) {
        console.error('Error actualizando nombre:', updateError)
        error = 'Error al actualizar el nombre'
        return
      }

      // Actualizar el store local
      subjects.update(currentSubjects => 
        currentSubjects.map(subject => 
          subject.id === subjectId 
            ? { ...subject, name: newName.trim() }
            : subject
        )
      )

      success = true
      editingSubject = null
      editingName = ''
      
      setTimeout(() => {
        success = false
      }, 3000)

    } catch (err) {
      console.error('Error:', err)
      error = 'Error inesperado'
    } finally {
      loading = false
    }
  }

  function startEditing(subject) {
    editingSubject = subject.id
    editingName = subject.name
  }

  function cancelEditing() {
    editingSubject = null
    editingName = ''
    error = null
  }

  function handleKeydown(event, subjectId) {
    if (event.key === 'Enter') {
      updateSubjectName(subjectId, editingName)
    } else if (event.key === 'Escape') {
      cancelEditing()
    }
  }

  // Función para asociar usuario actual con un sujeto
  async function linkUserToSubject(subjectId) {
    loading = true
    error = null

    try {
      console.log('Intentando vincular usuario', $user.id, 'con sujeto', subjectId)
      
      // Verificar si la columna linked_user_id existe en la tabla
      const { data: testData, error: testError } = await supabase
        .from('subjects')
        .select('linked_user_id')
        .limit(1)
      
      if (testError && testError.message.includes('column "linked_user_id" does not exist')) {
        error = 'Esta funcionalidad requiere una actualización de la base de datos. Por favor contacta al administrador.'
        console.warn('La columna linked_user_id no existe en la tabla subjects')
        return
      }

      // Primero, desasociar al usuario de cualquier otro sujeto
      const { error: unlinkError } = await supabase
        .from('subjects')
        .update({ linked_user_id: null })
        .eq('family_id', $family.id)
        .eq('linked_user_id', $user.id)

      if (unlinkError && !unlinkError.message.includes('column "linked_user_id" does not exist')) {
        console.error('Error desvinculando usuario:', unlinkError)
      }

      // Luego, asociar al usuario con el nuevo sujeto
      const { error: linkError } = await supabase
        .from('subjects')
        .update({ linked_user_id: $user.id })
        .eq('id', subjectId)

      if (linkError) {
        console.error('Error vinculando usuario:', linkError)
        if (linkError.message.includes('column "linked_user_id" does not exist')) {
          error = 'Esta funcionalidad requiere una actualización de la base de datos.'
        } else {
          error = 'Error al vincular usuario'
        }
        return
      }

      // Actualizar el store local
      subjects.update(currentSubjects => 
        currentSubjects.map(subject => ({
          ...subject,
          linked_user_id: subject.id === subjectId ? $user.id : 
                          (subject.linked_user_id === $user.id ? null : subject.linked_user_id)
        }))
      )

      success = true
      setTimeout(() => {
        success = false
      }, 3000)

    } catch (err) {
      console.error('Error:', err)
      error = 'Error inesperado: ' + err.message
    } finally {
      loading = false
    }
  }

  function goBack() {
    goto(`${base}/dashboard`)
  }
</script>

<svelte:head>
  <title>Familia - Baby Tracker</title>
</svelte:head>

<div class="container">
  <header>
    <button class="back-button" on:click={goBack}>
      <i class="fa-solid fa-arrow-left"></i>
    </button>
    <h1>Gestión de Familia</h1>
  </header>

  <main>
    {#if error}
      <div class="error-message">
        <i class="fa-solid fa-exclamation-circle"></i>
        {error}
      </div>
    {/if}

    {#if success}
      <div class="success-message">
        <i class="fa-solid fa-check-circle"></i>
        Cambios guardados correctamente
      </div>
    {/if}

    <div class="family-info">
      <h2>Información de la Familia</h2>
      <div class="info-card">
        <div class="info-item">
          <label>Código de invitación</label>
          <div class="invitation-code">
            <code>{$family?.invitation_code}</code>
            <button class="copy-btn" on:click={() => navigator.clipboard.writeText($family?.invitation_code)}>
              <i class="fa-solid fa-copy"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="members-section">
      <h2>Miembros de la Familia</h2>
      <p class="section-description">Puedes editar los nombres y asociarte con uno de los miembros</p>
      
      <div class="members-list">
        {#each $subjects as subject}
          <div class="member-card" style="border-left-color: {subject.color}">
            <div class="member-icon" style="background-color: {subject.color}">
              <i class="fa-solid {subject.icon}"></i>
            </div>
            
            <div class="member-info">
              {#if editingSubject === subject.id}
                <div class="edit-form">
                  <input
                    type="text"
                    bind:value={editingName}
                    on:keydown={(e) => handleKeydown(e, subject.id)}
                    placeholder="Nombre del miembro"
                    disabled={loading}
                    class="name-input"
                  />
                  <div class="edit-actions">
                    <button 
                      class="save-btn"
                      on:click={() => updateSubjectName(subject.id, editingName)}
                      disabled={loading || !editingName.trim()}
                    >
                      <i class="fa-solid fa-check"></i>
                    </button>
                    <button 
                      class="cancel-btn"
                      on:click={cancelEditing}
                      disabled={loading}
                    >
                      <i class="fa-solid fa-times"></i>
                    </button>
                  </div>
                </div>
              {:else}
                <div class="member-details">
                  <h3>{subject.name}</h3>
                  {#if subject.linked_user_id && subject.linked_user_id === $user.id}
                    <span class="linked-badge">
                      <i class="fa-solid fa-link"></i>
                      Eres tú
                    </span>
                  {/if}
                </div>
                
                <div class="member-actions">
                  <button 
                    class="edit-btn"
                    on:click={() => startEditing(subject)}
                    disabled={loading}
                  >
                    <i class="fa-solid fa-edit"></i>
                    Editar
                  </button>
                  
                  {#if !subject.linked_user_id || subject.linked_user_id !== $user.id}
                    <button 
                      class="link-btn"
                      on:click={() => linkUserToSubject(subject.id)}
                      disabled={loading}
                    >
                      <i class="fa-solid fa-user-plus"></i>
                      Soy yo
                    </button>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </main>
</div>

<style>
  .container {
    min-height: 100vh;
    background-color: var(--gray-light);
    display: flex;
    flex-direction: column;
  }

  header {
    background-color: var(--primary);
    color: var(--white);
    padding: var(--spacing-md);
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    box-shadow: var(--shadow-md);
  }

  .back-button {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: var(--radius-full);
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--white);
    transition: background-color 0.2s ease;
  }

  .back-button:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  header h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  main {
    padding: var(--spacing-lg);
    flex: 1;
  }

  .family-info {
    background: var(--white);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    box-shadow: var(--shadow-sm);
  }

  .family-info h2 {
    margin: 0 0 var(--spacing-md);
    color: var(--primary);
    font-size: 1.3rem;
  }

  .info-card {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .info-item label {
    display: block;
    font-weight: 600;
    color: var(--gray-dark);
    margin-bottom: var(--spacing-xs);
  }

  .invitation-code {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--gray-light);
    border-radius: var(--radius-md);
  }

  .invitation-code code {
    flex: 1;
    font-size: 1.1rem;
    font-weight: bold;
    letter-spacing: 0.1em;
  }

  .copy-btn {
    background: var(--primary);
    border: none;
    border-radius: var(--radius-sm);
    padding: var(--spacing-xs);
    color: var(--white);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .copy-btn:hover {
    background: var(--primary-dark);
  }

  .members-section {
    background: var(--white);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    box-shadow: var(--shadow-sm);
  }

  .members-section h2 {
    margin: 0 0 var(--spacing-sm);
    color: var(--primary);
    font-size: 1.3rem;
  }

  .section-description {
    margin: 0 0 var(--spacing-lg);
    color: var(--gray-dark);
    font-size: 0.9rem;
  }

  .members-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .member-card {
    border: 1px solid var(--gray);
    border-radius: var(--radius-lg);
    border-left-width: 4px;
    padding: var(--spacing-lg);
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    transition: box-shadow 0.2s ease;
  }

  .member-card:hover {
    box-shadow: var(--shadow-md);
  }

  .member-icon {
    width: 60px;
    height: 60px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--white);
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .member-info {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .member-details h3 {
    margin: 0 0 var(--spacing-xs);
    color: var(--black);
    font-size: 1.2rem;
  }

  .linked-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    background: var(--primary);
    color: var(--white);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-full);
    font-size: 0.8rem;
    font-weight: 600;
  }

  .member-actions {
    display: flex;
    gap: var(--spacing-sm);
  }

  .edit-btn, .link-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid;
    border-radius: var(--radius-md);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .edit-btn {
    background: var(--white);
    border-color: var(--gray);
    color: var(--gray-dark);
  }

  .edit-btn:hover:not(:disabled) {
    border-color: var(--primary);
    color: var(--primary);
  }

  .link-btn {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--white);
  }

  .link-btn:hover:not(:disabled) {
    background: var(--primary-dark);
  }

  .edit-form {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    flex: 1;
  }

  .name-input {
    flex: 1;
    padding: var(--spacing-sm);
    border: 2px solid var(--gray);
    border-radius: var(--radius-md);
    font-size: 1rem;
  }

  .name-input:focus {
    outline: none;
    border-color: var(--primary);
  }

  .edit-actions {
    display: flex;
    gap: var(--spacing-xs);
  }

  .save-btn, .cancel-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease;
  }

  .save-btn {
    background: var(--primary);
    color: var(--white);
  }

  .save-btn:hover:not(:disabled) {
    background: var(--primary-dark);
  }

  .save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .cancel-btn {
    background: var(--gray);
    color: var(--white);
  }

  .cancel-btn:hover:not(:disabled) {
    background: var(--gray-dark);
  }

  .error-message, .success-message {
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-lg);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .error-message {
    background: #fee;
    border: 1px solid #fcc;
    color: #c33;
  }

  .success-message {
    background: #efe;
    border: 1px solid #cfc;
    color: #363;
  }

  /* Responsive */
  @media (max-width: 640px) {
    main {
      padding: var(--spacing-md);
    }

    .member-info {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-sm);
    }

    .member-actions {
      align-self: stretch;
    }

    .edit-btn, .link-btn {
      flex: 1;
      justify-content: center;
    }
  }
</style>