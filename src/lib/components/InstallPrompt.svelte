<!-- src/lib/components/InstallPrompt.svelte -->
<script>
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  
  let showInstallPrompt = false
  let deferredPrompt = null
  let isStandalone = false

  onMount(() => {
    if (!browser) return

    // Verificar si ya está instalada (modo standalone)
    isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                   window.navigator.standalone ||
                   document.referrer.includes('android-app://')

    // Si ya está instalada, no mostrar el prompt
    if (isStandalone) return

    // Verificar si ya se mostró antes (localStorage)
    const hasSeenPrompt = localStorage.getItem('pwa-install-prompt-shown')
    const promptDismissed = localStorage.getItem('pwa-install-dismissed')
    
    // Escuchar el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      // Prevenir que el navegador muestre su propio prompt
      e.preventDefault()
      
      // Guardar el evento para usar después
      deferredPrompt = e
      
      // Mostrar nuestro prompt personalizado si no se ha mostrado antes
      if (!hasSeenPrompt && !promptDismissed) {
        showInstallPrompt = true
        localStorage.setItem('pwa-install-prompt-shown', 'true')
      }
    }

    // Agregar listener
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Mostrar prompt automáticamente después de 3 segundos si cumple condiciones
    if (!hasSeenPrompt && !promptDismissed) {
      setTimeout(() => {
        if (!isStandalone && !showInstallPrompt) {
          showInstallPrompt = true
          localStorage.setItem('pwa-install-prompt-shown', 'true')
        }
      }, 3000)
    }

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  })

  async function handleInstall() {
    if (!deferredPrompt) {
      // Fallback: mostrar instrucciones manuales
      showManualInstallInstructions()
      return
    }

    // Mostrar el prompt de instalación
    deferredPrompt.prompt()
    
    // Esperar a que el usuario responda
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('Usuario aceptó instalar la PWA')
    } else {
      console.log('Usuario rechazó instalar la PWA')
    }

    // Limpiar el prompt
    deferredPrompt = null
    showInstallPrompt = false
  }

  function handleDismiss() {
    showInstallPrompt = false
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  function showManualInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/.test(navigator.userAgent)
    
    let instructions = ''
    
    if (isIOS) {
      instructions = '1. Toca el icono de compartir\n2. Selecciona "Añadir a pantalla de inicio"\n3. Toca "Añadir"'
    } else if (isAndroid) {
      instructions = '1. Toca el menú del navegador (⋮)\n2. Selecciona "Instalar app" o "Añadir a pantalla de inicio"\n3. Toca "Instalar"'
    } else {
      instructions = '1. Busca el icono de instalación en la barra de direcciones\n2. O usa el menú del navegador\n3. Selecciona "Instalar Baby Tracker"'
    }
    
    alert(`Para instalar Baby Tracker:\n\n${instructions}`)
    showInstallPrompt = false
  }
</script>

{#if showInstallPrompt && !isStandalone}
  <div class="install-prompt-overlay">
    <div class="install-prompt">
      <button class="close-btn" on:click={handleDismiss}>
        <i class="fa-solid fa-times"></i>
      </button>
      
      <div class="prompt-content">
        <div class="app-icon">
          <i class="fa-solid fa-baby"></i>
        </div>
        
        <h3>¡Instala Baby Tracker!</h3>
        <p>Accede más rápido y úsala sin conexión</p>
        
        <div class="features">
          <div class="feature">
            <i class="fa-solid fa-bolt"></i>
            <span>Acceso rápido</span>
          </div>
          <div class="feature">
            <i class="fa-solid fa-wifi-slash"></i>
            <span>Funciona sin internet</span>
          </div>
          <div class="feature">
            <i class="fa-solid fa-mobile-alt"></i>
            <span>Como una app nativa</span>
          </div>
        </div>
        
        <div class="prompt-actions">
          <button class="btn-secondary" on:click={handleDismiss}>
            Ahora no
          </button>
          <button class="btn-primary" on:click={handleInstall}>
            <i class="fa-solid fa-download"></i>
            Instalar
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .install-prompt-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: var(--spacing-md);
  }

  .install-prompt {
    background: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    width: 100%;
    max-width: 400px;
    position: relative;
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .close-btn {
    position: absolute;
    top: var(--spacing-md);
    right: var(--spacing-md);
    background: none;
    border: none;
    font-size: 1.25rem;
    color: var(--gray-dark);
    cursor: pointer;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease;
  }

  .close-btn:hover {
    background: var(--gray-light);
  }

  .prompt-content {
    padding: var(--spacing-xl);
    text-align: center;
  }

  .app-icon {
    width: 80px;
    height: 80px;
    background: var(--primary);
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--spacing-lg);
    color: var(--white);
    font-size: 2.5rem;
  }

  h3 {
    margin: 0 0 var(--spacing-sm);
    color: var(--black);
    font-size: 1.5rem;
  }

  p {
    margin: 0 0 var(--spacing-lg);
    color: var(--gray-dark);
    font-size: 1rem;
  }

  .features {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xl);
  }

  .feature {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    text-align: left;
  }

  .feature i {
    width: 24px;
    color: var(--primary);
    font-size: 1.125rem;
  }

  .feature span {
    color: var(--gray-dark);
    font-size: 0.9rem;
  }

  .prompt-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: center;
  }

  .btn-secondary, .btn-primary {
    padding: var(--spacing-md) var(--spacing-lg);
    border: none;
    border-radius: var(--radius-md);
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex: 1;
    justify-content: center;
  }

  .btn-secondary {
    background: var(--gray-light);
    color: var(--gray-dark);
  }

  .btn-secondary:hover {
    background: var(--gray);
  }

  .btn-primary {
    background: var(--primary);
    color: var(--white);
  }

  .btn-primary:hover {
    background: var(--primary-dark);
  }

  /* Responsive */
  @media (max-width: 640px) {
    .install-prompt-overlay {
      padding: var(--spacing-sm);
    }

    .prompt-content {
      padding: var(--spacing-lg);
    }

    .app-icon {
      width: 60px;
      height: 60px;
      font-size: 2rem;
    }

    .features {
      gap: var(--spacing-sm);
    }

    .prompt-actions {
      flex-direction: column;
    }
  }
</style>