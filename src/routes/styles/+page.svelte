<!-- src/routes/styles/+page.svelte -->
<script>
  import { goto } from '$app/navigation'
  import { base } from '$app/paths'
  import { currentTheme, colorPalettes } from '$lib/stores/theme'
  
  let selectedTheme = $currentTheme
  
  function selectTheme(paletteId) {
    selectedTheme = paletteId
    currentTheme.setTheme(paletteId)
  }
  
  function goBack() {
    goto(`${base}/dashboard`)
  }
  
  // Ejemplos de colores para cada categoría
  const colorExamples = [
    { key: 'primary', label: 'Botones principales', icon: 'fa-circle' },
    { key: 'weight', label: 'Peso / Estatura', icon: 'fa-weight-scale' },
    { key: 'poop', label: 'Pañal / Caca', icon: 'fa-baby' },
    { key: 'bottle', label: 'Biberón / Alimentación', icon: 'fa-baby-carriage' },
    { key: 'sleep', label: 'Sueño / Descanso', icon: 'fa-moon' }
  ]
</script>

<div class="styles-container">
  <header class="styles-header">
    <button class="back-btn" on:click={goBack}>
      <i class="fa-solid fa-arrow-left"></i>
    </button>
    <h1>Estilos</h1>
    <div></div>
  </header>

  <main class="styles-content">
    <div class="intro-section">
      <div class="intro-icon">
        <i class="fa-solid fa-palette"></i>
      </div>
      <h2>Personaliza tu experiencia</h2>
      <p>Elige la paleta de colores que mejor se adapte a tu momento del día y preferencias visuales.</p>
    </div>

    <div class="palettes-section">
      <h3>Paletas disponibles</h3>
      
      {#each Object.entries(colorPalettes) as [paletteId, palette]}
        <div 
          class="palette-card" 
          class:selected={selectedTheme === paletteId}
          on:click={() => selectTheme(paletteId)}
        >
          <div class="palette-header">
            <div class="palette-info">
              <h4>{palette.name}</h4>
              <p>{palette.description}</p>
            </div>
            <div class="selection-indicator">
              {#if selectedTheme === paletteId}
                <i class="fa-solid fa-check"></i>
              {:else}
                <i class="fa-regular fa-circle"></i>
              {/if}
            </div>
          </div>
          
          <div class="color-preview">
            {#each colorExamples as example}
              <div class="color-item">
                <div 
                  class="color-circle"
                  style="background-color: {palette.colors[example.key]}"
                >
                  <i class="fa-solid {example.icon}"></i>
                </div>
                <span class="color-label">{example.label}</span>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <div class="preview-section">
      <h3>Vista previa</h3>
      <div class="preview-container">
        <div class="preview-buttons">
          <button class="preview-btn primary">
            <i class="fa-solid fa-plus"></i>
            Acción principal
          </button>
          <button class="preview-btn weight">
            <i class="fa-solid fa-weight-scale"></i>
            Peso
          </button>
          <button class="preview-btn bottle">
            <i class="fa-solid fa-baby-carriage"></i>
            Biberón
          </button>
        </div>
        
        <div class="preview-card">
          <div class="preview-header">
            <h4>Mi bebé</h4>
            <span class="preview-time">Hace 2 horas</span>
          </div>
          <div class="preview-action sleep">
            <i class="fa-solid fa-moon"></i>
            <span>Se durmió</span>
          </div>
        </div>
      </div>
    </div>

    <div class="tips-section">
      <h3>💡 Consejos de uso</h3>
      <div class="tips-grid">
        <div class="tip-card">
          <div class="tip-icon cloud-soft">
            <i class="fa-solid fa-cloud"></i>
          </div>
          <div class="tip-content">
            <h4>Cloud Soft</h4>
            <p>Ideal para sesiones diurnas y primeros meses. Colores suaves que no cansan la vista.</p>
          </div>
        </div>
        
        <div class="tip-card">
          <div class="tip-icon bubble-pop">
            <i class="fa-solid fa-heart"></i>
          </div>
          <div class="tip-content">
            <h4>Bubble Pop</h4>
            <p>Perfecto para padres que prefieren colores más alegres y vibrantes durante el día.</p>
          </div>
        </div>
        
        <div class="tip-card">
          <div class="tip-icon night-light">
            <i class="fa-solid fa-moon"></i>
          </div>
          <div class="tip-content">
            <h4>Night Light</h4>
            <p>Diseñado para uso nocturno. Reduce el deslumbramiento sin perder visibilidad.</p>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>

<style>
  .styles-container {
    min-height: 100vh;
    background-color: var(--color-background);
    color: var(--color-text);
  }

  .styles-header {
    background-color: var(--color-primary);
    color: white;
    padding: var(--spacing-md);
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: var(--shadow-md);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .back-btn {
    background: none;
    border: none;
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    transition: background-color 0.2s ease;
  }

  .back-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .styles-header h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .styles-content {
    padding: var(--spacing-lg);
    max-width: 800px;
    margin: 0 auto;
  }

  .intro-section {
    text-align: center;
    margin-bottom: var(--spacing-xl);
  }

  .intro-icon {
    width: 80px;
    height: 80px;
    background: var(--color-primary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--spacing-md);
    color: white;
    font-size: 2rem;
  }

  .intro-section h2 {
    margin: 0 0 var(--spacing-sm);
    color: var(--color-text);
    font-size: 1.8rem;
  }

  .intro-section p {
    margin: 0;
    color: var(--color-text-light);
    font-size: 1rem;
    line-height: 1.5;
  }

  .palettes-section h3,
  .preview-section h3,
  .tips-section h3 {
    margin: 0 0 var(--spacing-lg);
    color: var(--color-text);
    font-size: 1.3rem;
    font-weight: 600;
  }

  .palette-card {
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-md);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .palette-card:hover {
    border-color: var(--color-primary);
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  .palette-card.selected {
    border-color: var(--color-primary);
    background: rgba(168, 216, 248, 0.1);
  }

  .palette-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--spacing-md);
  }

  .palette-info h4 {
    margin: 0 0 var(--spacing-xs);
    color: var(--color-text);
    font-size: 1.2rem;
    font-weight: 600;
  }

  .palette-info p {
    margin: 0;
    color: var(--color-text-light);
    font-size: 0.9rem;
  }

  .selection-indicator {
    color: var(--color-primary);
    font-size: 1.5rem;
  }

  .color-preview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--spacing-md);
  }

  .color-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .color-circle {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.2rem;
    box-shadow: var(--shadow-sm);
  }

  .color-label {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    text-align: center;
    line-height: 1.2;
  }

  .preview-section {
    margin: var(--spacing-xl) 0;
    padding: var(--spacing-lg);
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
  }

  .preview-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .preview-buttons {
    display: flex;
    gap: var(--spacing-md);
    flex-wrap: wrap;
  }

  .preview-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    border-radius: var(--radius-md);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    color: white;
  }

  .preview-btn.primary { background-color: var(--color-primary); }
  .preview-btn.weight { background-color: var(--color-weight); }
  .preview-btn.bottle { background-color: var(--color-bottle); }

  .preview-btn:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .preview-card {
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
  }

  .preview-header h4 {
    margin: 0;
    color: var(--color-text);
    font-size: 1.1rem;
  }

  .preview-time {
    color: var(--color-text-muted);
    font-size: 0.9rem;
  }

  .preview-action {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-weight: 500;
  }

  .preview-action.sleep {
    background-color: var(--color-sleep);
    color: white;
  }

  .tips-section {
    margin-top: var(--spacing-xl);
  }

  .tips-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-lg);
  }

  .tip-card {
    display: flex;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .tip-icon {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.3rem;
    flex-shrink: 0;
  }

  .tip-icon.cloud-soft { background: #A8D8F8; }
  .tip-icon.bubble-pop { background: #58D1F2; }
  .tip-icon.night-light { background: #3B82F6; }

  .tip-content h4 {
    margin: 0 0 var(--spacing-xs);
    color: var(--color-text);
    font-size: 1.1rem;
    font-weight: 600;
  }

  .tip-content p {
    margin: 0;
    color: var(--color-text-light);
    font-size: 0.9rem;
    line-height: 1.4;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .styles-content {
      padding: var(--spacing-md);
    }

    .palette-header {
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .selection-indicator {
      align-self: flex-end;
    }

    .color-preview {
      grid-template-columns: repeat(2, 1fr);
    }

    .preview-buttons {
      flex-direction: column;
    }

    .tips-grid {
      grid-template-columns: 1fr;
    }

    .tip-card {
      flex-direction: column;
      text-align: center;
    }
  }
</style>