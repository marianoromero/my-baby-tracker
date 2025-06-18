<!-- src/routes/dashboard/+page.svelte -->
<script>
    import { user, signOut } from '$lib/stores/auth'
    import { family, familyLoading, subjects, actions } from '$lib/stores/family'
    import { supabase } from '$lib/supabase'
    import { goto } from '$app/navigation'
    import { base } from '$app/paths'
    
    let selectedSubject = null
    let registering = false
    let menuOpen = false
    let recentActions = {}
    
    // Registrar un evento
    async function registerEvent(subjectId, actionName) {
      registering = true
      
      try {
        // Registrar el evento
        const { error } = await supabase
          .from('events')
          .insert({
            subject_id: subjectId,
            user_id: $user.id,
            action_name: actionName,
            event_timestamp: new Date().toISOString()
          })
        
        if (error) throw error

        // Recargar las acciones recientes
        await loadRecentActions()

        showNotification(`✅ ${actionName} registrado`)
      } catch (err) {
        console.error('Error:', err)
        showNotification('❌ Error al registrar el evento')
      } finally {
        registering = false
        selectedSubject = null
      }
    }
    
    // Copiar código de invitación
    async function copyInvitationCode() {
      try {
        await navigator.clipboard.writeText($family.invitation_code)
        showNotification('📋 Código copiado al portapapeles')
      } catch (err) {
        showNotification('❌ Error al copiar el código')
      }
    }
    
    // Mostrar notificación temporal
    function showNotification(message) {
      const notification = document.createElement('div')
      notification.className = 'notification'
      notification.textContent = message
      document.body.appendChild(notification)
      
      setTimeout(() => notification.classList.add('show'), 10)
      
      setTimeout(() => {
        notification.classList.remove('show')
        setTimeout(() => notification.remove(), 300)
      }, 3000)
    }

    function toggleMenu() {
      menuOpen = !menuOpen
    }

    function closeMenu() {
      menuOpen = false
    }

    function navigateToTimeline() {
      closeMenu()
      goto(`${base}/timeline?filter=today`)
    }

    function navigateToSubject(subjectId) {
      goto(`${base}/subject/${subjectId}`)
    }

    // Obtener las 3 acciones más recientes de un sujeto
    async function getRecentActions(subjectId) {
      if (!$actions[subjectId]) return []
      
      try {
        // Obtener los eventos más recientes para este sujeto
        const { data: recentEvents, error } = await supabase
          .from('events')
          .select('action_name')
          .eq('subject_id', subjectId)
          .order('event_timestamp', { ascending: false })
          .limit(3)

        if (error) throw error

        // Crear un Set con las acciones más recientes
        const recentActionNames = new Set(recentEvents.map(e => e.action_name))

        // Obtener todas las acciones del sujeto
        const allActions = $actions[subjectId]

        // Ordenar las acciones: primero las recientes, luego el resto alfabéticamente
        const sortedActions = allActions.sort((a, b) => {
          const aIsRecent = recentActionNames.has(a.name)
          const bIsRecent = recentActionNames.has(b.name)
          
          if (aIsRecent && !bIsRecent) return -1
          if (!aIsRecent && bIsRecent) return 1
          return a.name.localeCompare(b.name)
        })

        // Tomar las 3 primeras
        return sortedActions.slice(0, 3)
      } catch (err) {
        console.error('Error al obtener acciones recientes:', err)
        return $actions[subjectId].slice(0, 3)
      }
    }

    // Cargar acciones recientes para cada sujeto
    async function loadRecentActions() {
      for (const subject of $subjects) {
        recentActions[subject.id] = await getRecentActions(subject.id)
      }
      recentActions = recentActions // Trigger reactivity
    }

    // Cargar acciones recientes cuando cambien los sujetos o acciones
    $: if ($subjects && $actions) {
      loadRecentActions()
    }

    // Reactively handle user state changes
    $: if ($user === null) {
      console.log('User is not authenticated')
    }
</script>

<div class="container">
  <header>
    <h1>Baby Tracker</h1>
    <button class="menu-button" on:click={toggleMenu}>
      <i class="fa-solid fa-bars"></i>
    </button>
  </header>

  {#if $familyLoading}
    <div class="loading">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <p>Cargando datos familiares...</p>
    </div>
  {:else if $family}
    <main>
      <!-- Secciones principales -->
      <div class="main-sections">
        {#each $subjects as subject}
          <div class="subject-section" style="background-color: {subject.color}">
            <div class="subject-header" on:click={() => navigateToSubject(subject.id)}>
              <i class="fa-solid {subject.icon}"></i>
              <h2>{subject.name}</h2>
              <i class="fa-solid fa-chevron-right"></i>
            </div>
            
            <div class="actions-list">
              {#if $actions[subject.id]}
                {#each recentActions[subject.id] || [] as action}
                  <button 
                    class="action-btn"
                    on:click={() => registerEvent(subject.id, action.name)}
                    disabled={registering}
                  >
                    {action.name}
                  </button>
                {/each}
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </main>
  {:else}
    <div class="error">
      <p>Error al cargar los datos familiares</p>
      <button class="btn btn-primary" on:click={() => window.location.reload()}>
        Reintentar
      </button>
    </div>
  {/if}
</div>

<!-- Side Menu -->
<div class="side-menu" class:open={menuOpen}>
  <div class="menu-header">
    <button class="close-button" on:click={closeMenu}>
      <i class="fa-solid fa-times"></i>
    </button>
  </div>
  
  <div class="menu-content">
    <div class="menu-section">
      <h3>Código de familia</h3>
      <div class="invitation-code" on:click={copyInvitationCode}>
        <code>{$family?.invitation_code}</code>
        <i class="fa-solid fa-copy"></i>
      </div>
    </div>

    <div class="menu-section">
      <button class="menu-item" on:click={navigateToTimeline}>
        <i class="fa-solid fa-history"></i>
        Timeline
      </button>
    </div>

    <div class="menu-divider"></div>

    <div class="menu-section">
      <button class="menu-item logout" on:click={signOut}>
        <i class="fa-solid fa-sign-out-alt"></i>
        Cerrar Sesión
      </button>
    </div>
  </div>
</div>

<!-- Overlay para cerrar el menú al hacer click fuera -->
{#if menuOpen}
  <div class="overlay" on:click={closeMenu}></div>
{/if}

<style>
  .container {
    min-height: 100vh;
    background-color: var(--gray-light);
    width: 100%;
    max-width: none;
    display: flex;
    flex-direction: column;
  }

  header {
    background-color: var(--primary);
    color: var(--white);
    padding: var(--spacing-md);
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: var(--shadow-md);
    width: 100%;
    flex-shrink: 0;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  .menu-button {
    background: none;
    border: none;
    color: var(--white);
    font-size: 1.5rem;
    cursor: pointer;
    padding: var(--spacing-sm);
  }

  main {
    padding: 0;
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .main-sections {
    display: flex;
    flex-direction: column;
    width: 100%;
    flex: 1;
  }

  .subject-section {
    padding: var(--spacing-lg);
    color: var(--white);
    margin-bottom: 0;
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .subject-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
    cursor: pointer;
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    transition: background-color 0.2s ease;
  }

  .subject-header:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .subject-header i {
    font-size: 2rem;
  }

  .subject-header h2 {
    margin: 0;
    font-size: 1.5rem;
    flex: 1;
  }

  .subject-header .fa-chevron-right {
    font-size: 1rem;
    opacity: 0.7;
  }

  .actions-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--spacing-sm);
    width: 100%;
    flex: 1;
  }

  .action-btn {
    padding: var(--spacing-md);
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: var(--white);
    cursor: pointer;
    transition: background-color 0.2s ease;
    font-size: 1rem;
    width: 100%;
    height: 100%;
  }

  .action-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Side Menu */
  .side-menu {
    position: fixed;
    top: 0;
    right: -300px;
    width: 300px;
    height: 100vh;
    background: var(--white);
    box-shadow: var(--shadow-lg);
    transition: right 0.3s ease;
    z-index: 1000;
  }

  .side-menu.open {
    right: 0;
  }

  .menu-header {
    padding: var(--spacing-md);
    display: flex;
    justify-content: flex-end;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--gray-dark);
    cursor: pointer;
  }

  .menu-content {
    padding: var(--spacing-md);
  }

  .menu-section {
    margin-bottom: var(--spacing-lg);
  }

  .menu-section h3 {
    color: var(--primary);
    margin-bottom: var(--spacing-sm);
  }

  .invitation-code {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--gray-light);
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  .invitation-code code {
    flex: 1;
    font-size: 1.1rem;
    font-weight: bold;
    letter-spacing: 0.1em;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    width: 100%;
    padding: var(--spacing-md);
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    color: var(--gray-dark);
    transition: background-color 0.2s ease;
  }

  .menu-item:hover {
    background: var(--gray-light);
  }

  .menu-item.logout {
    color: var(--error);
  }

  .menu-divider {
    height: 1px;
    background: var(--gray);
    margin: var(--spacing-md) 0;
  }

  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
  }

  /* Notificaciones */
  :global(.notification) {
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--primary);
    color: var(--white);
    padding: var(--spacing-md) var(--spacing-lg);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    transform: translateX(400px);
    transition: transform 0.3s ease;
    z-index: 1000;
  }

  :global(.notification.show) {
    transform: translateX(0);
  }

  /* Responsive */
  @media (max-width: 640px) {
    :global(.notification) {
      right: var(--spacing-md);
      left: var(--spacing-md);
      transform: translateY(-100px);
    }
    
    :global(.notification.show) {
      transform: translateY(0);
    }
  }
</style>