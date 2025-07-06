<!-- src/routes/dashboard/+page.svelte -->
<script>
    import { user, signOut } from '$lib/stores/auth'
    import { family, familyLoading, subjects } from '$lib/stores/family'
    import { goto } from '$app/navigation'
    import { base } from '$app/paths'
    
    let menuOpen = false
    
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
      goto(`${base}/timeline?filter=today`)
    }

    function navigateToFamily() {
      closeMenu()
      goto(`${base}/family`)
    }

    function navigateToStats() {
      goto(`${base}/stats`)
    }

    function navigateToImportPediatric() {
      closeMenu()
      goto(`${base}/admin/import-pediatric`)
    }

    function navigateToSubject(subjectId) {
      goto(`${base}/subject/${subjectId}`)
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
      <!-- Acceso rápido - 25% superior -->
      <div class="quick-access">
        <button class="quick-btn stats-btn" on:click={navigateToStats}>
          <i class="fa-solid fa-chart-bar"></i>
          <span>Stats</span>
        </button>
        <button class="quick-btn timeline-btn" on:click={navigateToTimeline}>
          <i class="fa-solid fa-history"></i>
          <span>Timeline</span>
        </button>
      </div>

      <!-- Secciones de miembros - 75% inferior -->
      <div class="members-sections">
        {#each $subjects as subject}
          <button 
            class="member-section" 
            style="background-color: {subject.color}"
            on:click={() => navigateToSubject(subject.id)}
          >
            <div class="member-content">
              <i class="fa-solid {subject.icon}"></i>
              <h2>{subject.name}</h2>
              <i class="fa-solid fa-chevron-right"></i>
            </div>
          </button>
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
      
      <button class="menu-item" on:click={navigateToStats}>
        <i class="fa-solid fa-chart-bar"></i>
        Stats
      </button>
      
      <button class="menu-item" on:click={navigateToImportPediatric}>
        <i class="fa-solid fa-file-import"></i>
        Importar Datos
      </button>
      
      <button class="menu-item" on:click={navigateToFamily}>
        <i class="fa-solid fa-users"></i>
        Family
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
    overflow: hidden;
  }

  /* Sección de acceso rápido - 25% superior */
  .quick-access {
    height: 25vh;
    display: flex;
    background: var(--white);
    border-bottom: 2px solid var(--gray-light);
  }

  .quick-btn {
    flex: 1;
    border: none;
    background: var(--gray-light);
    color: var(--gray-dark);
    font-size: 1.2rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    position: relative;
  }

  .quick-btn:first-child {
    border-right: 1px solid var(--gray);
  }

  .quick-btn i {
    font-size: 2.5rem;
    margin-bottom: var(--spacing-xs);
  }

  .stats-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: var(--white);
  }

  .timeline-btn {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: var(--white);
  }

  .quick-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  .quick-btn:active {
    transform: translateY(0);
  }

  /* Secciones de miembros - 75% inferior */
  .members-sections {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 75vh;
  }

  .member-section {
    flex: 1;
    border: none;
    color: var(--white);
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  .member-section:hover {
    transform: scale(1.02);
    box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.3);
  }

  .member-section:active {
    transform: scale(0.98);
  }

  .member-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
    width: 100%;
    justify-content: center;
  }

  .member-content i:first-child {
    font-size: 3rem;
  }

  .member-content h2 {
    margin: 0;
    font-size: 2rem;
    font-weight: 600;
    flex: 1;
    text-align: center;
  }

  .member-content .fa-chevron-right {
    font-size: 1.5rem;
    opacity: 0.8;
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
    .quick-btn {
      font-size: 1rem;
    }

    .quick-btn i {
      font-size: 2rem;
    }

    .member-content {
      gap: var(--spacing-md);
      padding: var(--spacing-md);
    }

    .member-content i:first-child {
      font-size: 2.5rem;
    }

    .member-content h2 {
      font-size: 1.5rem;
    }

    .member-content .fa-chevron-right {
      font-size: 1.2rem;
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
    .quick-btn {
      font-size: 0.9rem;
    }

    .quick-btn i {
      font-size: 1.8rem;
    }

    .member-content {
      gap: var(--spacing-sm);
      padding: var(--spacing-sm);
    }

    .member-content i:first-child {
      font-size: 2rem;
    }

    .member-content h2 {
      font-size: 1.3rem;
    }

    .member-content .fa-chevron-right {
      font-size: 1rem;
    }
  }

  /* Height-based adjustments for compact layouts */
  @media (max-height: 700px) {
    .quick-access {
      height: 20vh;
    }

    .members-sections {
      height: 80vh;
    }

    .quick-btn i {
      font-size: 2rem;
    }

    .member-content i:first-child {
      font-size: 2.5rem;
    }

    .member-content h2 {
      font-size: 1.5rem;
    }
  }

  @media (max-height: 600px) {
    .quick-access {
      height: 18vh;
    }

    .members-sections {
      height: 82vh;
    }

    .quick-btn {
      font-size: 1rem;
    }

    .quick-btn i {
      font-size: 1.8rem;
    }

    .member-content {
      padding: var(--spacing-sm);
    }

    .member-content i:first-child {
      font-size: 2rem;
    }

    .member-content h2 {
      font-size: 1.3rem;
    }
  }
</style>