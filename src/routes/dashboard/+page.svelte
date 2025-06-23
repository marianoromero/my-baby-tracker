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

    function navigateToFamily() {
      closeMenu()
      goto(`${base}/family`)
    }

    function navigateToSubject(subjectId) {
      goto(`${base}/subject/${subjectId}`)
    }



    // Reactively handle user state changes
    $: if ($user === null) {
      console.log('User is not authenticated')
    }
</script>

{#if $familyLoading}
  <!-- Loading mientras se obtienen los datos de la familia -->
  <div class="loading-container">
    <div class="loading-spinner"></div>
    <p>Cargando datos...</p>
  </div>
{:else}
  <div class="container">
    <header>
      <h1>Baby Tracker</h1>
      <button class="menu-button" on:click={toggleMenu}>
        <i class="fa-solid fa-bars"></i>
      </button>
    </header>

    {#if $family}
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
              {#if $actions[subject.id] && $actions[subject.id].length > 0}
                {#each $actions[subject.id].slice(0, 3) as action}
                  <button 
                    class="action-btn"
                    on:click={() => registerEvent(subject.id, action.name)}
                    disabled={registering}
                  >
                    {action.name}
                  </button>
                {/each}
              {:else}
                <div class="action-placeholder"></div>
                <div class="action-placeholder"></div>
                <div class="action-placeholder"></div>
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
      
      <button class="menu-item" on:click={navigateToFamily}>
        <i class="fa-solid fa-users"></i>
        Familia
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
{/if}

<style>
  .loading-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--background);
    gap: var(--spacing-md);
  }

  .loading-spinner {
    width: 50px;
    height: 50px;
    border: 4px solid var(--light);
    border-top: 4px solid var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .container {
    height: 100vh;
    background-color: var(--gray-light);
    width: 100%;
    max-width: none;
    display: flex;
    flex-direction: column;
    overflow: hidden;
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
    overflow-y: auto;
  }

  .main-sections {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
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
    display: flex;
    flex-direction: column;
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
    font-size: 1.1rem;
    font-weight: 500;
    width: 100%;
    flex: 1;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    word-wrap: break-word;
    hyphens: auto;
  }

  .action-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-placeholder {
    background: rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    flex: 1;
    height: 40px;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0% {
      opacity: 0.3;
    }
    50% {
      opacity: 0.6;
    }
    100% {
      opacity: 0.3;
    }
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
    .subject-section {
      padding: var(--spacing-md);
    }

    .action-btn {
      font-size: 1rem;
      padding: var(--spacing-sm);
    }

    .subject-header h2 {
      font-size: 1.3rem;
    }

    .subject-header i {
      font-size: 1.8rem;
    }

    :global(.notification) {
      right: var(--spacing-md);
      left: var(--spacing-md);
      transform: translateY(-100px);
    }
    
    :global(.notification.show) {
      transform: translateY(0);
    }
  }

  /* Extra small screens */
  @media (max-width: 480px) {
    .subject-section {
      padding: var(--spacing-sm);
    }

    .actions-list {
      gap: var(--spacing-xs);
    }

    .action-btn {
      font-size: 0.9rem;
      padding: var(--spacing-xs);
    }

    .subject-header {
      margin-bottom: var(--spacing-sm);
    }

    .subject-header h2 {
      font-size: 1.2rem;
    }

    .subject-header i {
      font-size: 1.6rem;
    }
  }

  /* Height-based adjustments for compact layouts */
  @media (max-height: 700px) {
    .subject-section {
      padding: var(--spacing-md);
    }

    .action-btn {
      font-size: 0.95rem;
      padding: var(--spacing-xs);
    }
  }

  @media (max-height: 600px) {
    .subject-section {
      padding: var(--spacing-sm);
    }

    .subject-header {
      margin-bottom: var(--spacing-xs);
    }

    .subject-header h2 {
      font-size: 1.1rem;
    }

    .subject-header i {
      font-size: 1.4rem;
    }

    .actions-list {
      gap: var(--spacing-xs);
    }

    .action-btn {
      font-size: 0.85rem;
      padding: var(--spacing-xs);
    }
  }
</style>