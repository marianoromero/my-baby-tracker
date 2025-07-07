<!-- src/lib/components/SplashScreen.svelte -->
<script>
  import { onMount } from 'svelte'
  
  export let show = true
  
  let progress = 0
  let loadingText = 'Inicializando...'
  
  const loadingSteps = [
    { text: 'Inicializando...', duration: 300 },
    { text: 'Conectando con la familia...', duration: 500 },
    { text: 'Cargando miembros...', duration: 400 },
    { text: 'Preparando acciones...', duration: 300 },
    { text: '¡Listo!', duration: 200 }
  ]
  
  onMount(() => {
    let currentStep = 0
    let currentProgress = 0
    let animationId = null
    
    const animateProgress = () => {
      if (currentStep < loadingSteps.length && show) {
        const step = loadingSteps[currentStep]
        loadingText = step.text
        
        const targetProgress = ((currentStep + 1) / loadingSteps.length) * 100
        
        const animateToTarget = () => {
          if (currentProgress < targetProgress && show) {
            currentProgress += 2
            progress = Math.min(currentProgress, targetProgress)
            animationId = requestAnimationFrame(animateToTarget)
          } else {
            setTimeout(() => {
              currentStep++
              if (currentStep < loadingSteps.length && show) {
                animateProgress()
              } else {
                // Completado - esperar un momento antes de ocultar
                setTimeout(() => {
                  show = false
                }, 300)
              }
            }, step.duration)
          }
        }
        
        animateToTarget()
      }
    }
    
    // Empezar la animación después de un pequeño delay
    const startTimeout = setTimeout(animateProgress, 200)
    
    // Limpiar timeout y animación si el componente se desmonta
    return () => {
      clearTimeout(startTimeout)
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  })
</script>

{#if show}
  <div class="splash-screen" class:hiding={!show}>
    <div class="splash-content">
      <!-- Logo/Icono -->
      <div class="logo">
        <div class="logo-icon">
          <i class="fa-solid fa-baby"></i>
        </div>
        <h1>Baby Tracker</h1>
        <p class="tagline">Seguimiento familiar inteligente</p>
      </div>
      
      <!-- Barra de progreso -->
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" style="width: {progress}%"></div>
        </div>
        <p class="loading-text">{loadingText}</p>
      </div>
    </div>
    
    <!-- Elementos decorativos -->
    <div class="background-elements">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>
  </div>
{/if}

<style>
  .splash-screen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, var(--primary) 0%, #5a9bb8 50%, #6ba3c4 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn 0.3s ease-out;
  }
  
  .splash-screen.hiding {
    animation: fadeOut 0.5s ease-in forwards;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
      visibility: hidden;
    }
  }
  
  .splash-content {
    text-align: center;
    color: var(--white);
    z-index: 2;
    position: relative;
  }
  
  .logo {
    margin-bottom: 3rem;
  }
  
  .logo-icon {
    width: 100px;
    height: 100px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
    backdrop-filter: blur(10px);
    border: 2px solid rgba(255, 255, 255, 0.3);
    animation: pulse 2s ease-in-out infinite;
  }
  
  .logo-icon i {
    font-size: 3rem;
    color: var(--white);
  }
  
  @keyframes pulse {
    0% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 0 0 0 20px rgba(255, 255, 255, 0);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
    }
  }
  
  .logo h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
    letter-spacing: -0.5px;
  }
  
  .tagline {
    font-size: 1.1rem;
    opacity: 0.9;
    margin: 0;
    font-weight: 300;
  }
  
  .progress-container {
    width: 300px;
    margin: 0 auto;
  }
  
  .progress-bar {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    overflow: hidden;
    position: relative;
    backdrop-filter: blur(10px);
  }
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.8) 0%, var(--white) 100%);
    border-radius: 3px;
    transition: width 0.3s ease;
    position: relative;
  }
  
  .progress-fill::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 30px;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.6) 100%);
    animation: shimmer 1.5s infinite;
  }
  
  @keyframes shimmer {
    0% {
      transform: translateX(-30px);
    }
    100% {
      transform: translateX(30px);
    }
  }
  
  .loading-text {
    margin-top: 1.5rem;
    font-size: 1rem;
    font-weight: 500;
    opacity: 0.9;
    min-height: 1.2em;
    animation: textFade 0.3s ease-in-out;
  }
  
  @keyframes textFade {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 0.9;
      transform: translateY(0);
    }
  }
  
  .background-elements {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    z-index: 1;
  }
  
  .circle {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    animation: float 6s ease-in-out infinite;
  }
  
  .circle-1 {
    width: 200px;
    height: 200px;
    top: 10%;
    left: 10%;
    animation-delay: 0s;
  }
  
  .circle-2 {
    width: 150px;
    height: 150px;
    top: 60%;
    right: 10%;
    animation-delay: 2s;
  }
  
  .circle-3 {
    width: 100px;
    height: 100px;
    bottom: 20%;
    left: 20%;
    animation-delay: 4s;
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0px) rotate(0deg);
      opacity: 0.3;
    }
    50% {
      transform: translateY(-20px) rotate(180deg);
      opacity: 0.1;
    }
  }
  
  /* Responsive */
  @media (max-width: 640px) {
    .logo h1 {
      font-size: 2rem;
    }
    
    .logo-icon {
      width: 80px;
      height: 80px;
    }
    
    .logo-icon i {
      font-size: 2.5rem;
    }
    
    .progress-container {
      width: 250px;
    }
    
    .tagline {
      font-size: 1rem;
    }
    
    .circle-1 {
      width: 150px;
      height: 150px;
    }
    
    .circle-2 {
      width: 100px;
      height: 100px;
    }
    
    .circle-3 {
      width: 80px;
      height: 80px;
    }
  }
</style>