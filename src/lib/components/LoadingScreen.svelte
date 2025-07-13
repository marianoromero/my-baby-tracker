<!-- src/lib/components/LoadingScreen.svelte -->
<script>
  import { onMount } from 'svelte'
  
  let progress = 0
  let loadingText = 'Cargando...'
  
  const loadingSteps = [
    { progress: 20, text: 'Inicializando...' },
    { progress: 40, text: 'Conectando...' },
    { progress: 60, text: 'Cargando datos...' },
    { progress: 80, text: 'Preparando interfaz...' },
    { progress: 100, text: 'Listo!' }
  ]
  
  onMount(() => {
    let currentStep = 0
    
    const updateProgress = () => {
      if (currentStep < loadingSteps.length) {
        const step = loadingSteps[currentStep]
        progress = step.progress
        loadingText = step.text
        currentStep++
        
        // Tiempo entre pasos: más rápido al inicio, más lento al final
        const delay = currentStep <= 2 ? 200 : 300
        setTimeout(updateProgress, delay)
      }
    }
    
    // Iniciar después de un pequeño delay
    setTimeout(updateProgress, 100)
  })
</script>

<div class="loading-screen">
  <div class="loading-content">
    <!-- Logo/Icono de la app -->
    <div class="app-logo">
      <div class="logo-circle">
        <i class="fa-solid fa-baby"></i>
      </div>
      <h1>Baby Tracker</h1>
    </div>
    
    <!-- Barra de progreso -->
    <div class="progress-container">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          style="width: {progress}%"
        ></div>
      </div>
      <div class="progress-percentage">{progress}%</div>
    </div>
    
    <!-- Texto de estado -->
    <div class="loading-text">
      {loadingText}
    </div>
    
    <!-- Puntos animados -->
    <div class="loading-dots">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
  </div>
</div>

<style>
  .loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, var(--primary) 0%, #5a9bb8 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn 0.3s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .loading-content {
    text-align: center;
    color: var(--white);
    max-width: 300px;
    width: 100%;
    padding: var(--spacing-lg);
  }
  
  .app-logo {
    margin-bottom: var(--spacing-xl);
    animation: slideDown 0.6s ease-out;
  }
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .logo-circle {
    width: 80px;
    height: 80px;
    background: rgba(255, 255, 255, 0.2);
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--spacing-md);
    font-size: 2rem;
    animation: pulse 2s ease-in-out infinite;
    backdrop-filter: blur(10px);
  }
  
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 0 0 0 20px rgba(255, 255, 255, 0);
    }
  }
  
  .app-logo h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 300;
    letter-spacing: 1px;
  }
  
  .progress-container {
    margin-bottom: var(--spacing-lg);
    animation: slideUp 0.6s ease-out 0.2s both;
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
  
  .progress-bar {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    overflow: hidden;
    margin-bottom: var(--spacing-sm);
    backdrop-filter: blur(10px);
  }
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #ffffff 0%, #f0f9ff 50%, #ffffff 100%);
    border-radius: 20px;
    transition: width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    position: relative;
    overflow: hidden;
  }
  
  .progress-fill::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%);
    animation: shimmer 1.5s ease-in-out infinite;
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  .progress-percentage {
    font-size: 0.9rem;
    font-weight: 500;
    opacity: 0.9;
  }
  
  .loading-text {
    font-size: 1rem;
    margin-bottom: var(--spacing-md);
    opacity: 0.9;
    animation: slideUp 0.6s ease-out 0.4s both;
    min-height: 1.5rem;
    transition: all 0.3s ease;
  }
  
  .loading-dots {
    display: flex;
    justify-content: center;
    gap: var(--spacing-xs);
    animation: slideUp 0.6s ease-out 0.6s both;
  }
  
  .dot {
    width: 8px;
    height: 8px;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 50%;
    animation: bounce 1.4s ease-in-out infinite;
  }
  
  .dot:nth-child(1) { animation-delay: 0s; }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  
  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0.8);
      opacity: 0.6;
    }
    40% {
      transform: scale(1.2);
      opacity: 1;
    }
  }
  
  /* Responsive */
  @media (max-width: 640px) {
    .loading-content {
      padding: var(--spacing-md);
    }
    
    .logo-circle {
      width: 60px;
      height: 60px;
      font-size: 1.5rem;
    }
    
    .app-logo h1 {
      font-size: 1.25rem;
    }
    
    .progress-bar {
      height: 6px;
    }
    
    .loading-text {
      font-size: 0.9rem;
    }
  }
  
  /* Modo oscuro */
  @media (prefers-color-scheme: dark) {
    .loading-screen {
      background: linear-gradient(135deg, #1a365d 0%, #2d5a7b 100%);
    }
  }
</style>