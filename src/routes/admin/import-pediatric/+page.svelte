<!-- Página temporal para importar datos pediátricos -->
<script>
  import { insertPediatricDataForCurrentUser, previewPediatricData } from '$lib/utils/insertPediatricData.js'
  import { cleanAndFixPediatricData } from '$lib/utils/cleanPediatricData.js'
  import { user } from '$lib/stores/auth'
  import { goto } from '$app/navigation'
  import { base } from '$app/paths'
  
  let importing = false
  let importResult = null
  let error = null
  let preview = null
  let cleaning = false
  let cleanResult = null
  
  // Verificar autenticación
  $: if (!$user) {
    goto(`${base}/auth`)
  }
  
  // Mostrar vista previa al cargar
  if (typeof window !== 'undefined') {
    preview = previewPediatricData()
  }
  
  async function handleImport() {
    importing = true
    error = null
    importResult = null
    
    try {
      const result = await insertPediatricDataForCurrentUser()
      importResult = result
      console.log('✅ Importación completada:', result)
    } catch (err) {
      error = err.message
      console.error('❌ Error en importación:', err)
    } finally {
      importing = false
    }
  }
  
  function goToDashboard() {
    goto(`${base}/dashboard`)
  }
  
  function goToTimeline() {
    goto(`${base}/timeline`)
  }
  
  async function handleClean() {
    cleaning = true
    error = null
    cleanResult = null
    
    try {
      const result = await cleanAndFixPediatricData()
      cleanResult = result
      console.log('✅ Limpieza completada:', result)
    } catch (err) {
      error = err.message
      console.error('❌ Error en limpieza:', err)
    } finally {
      cleaning = false
    }
  }
</script>

<svelte:head>
  <title>Importar Datos Pediátricos - Baby Tracker</title>
</svelte:head>

<div class="container">
  <header>
    <button class="back-button" on:click={goToDashboard}>
      <i class="fa-solid fa-arrow-left"></i>
    </button>
    <h1>Importar Datos Pediátricos</h1>
  </header>
  
  <main>
    {#if preview}
      <div class="preview-section">
        <h2>📋 Vista Previa de Datos</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <i class="fa-solid fa-calendar-days"></i>
            <span class="stat-value">{preview.totalEntries}</span>
            <span class="stat-label">Fechas</span>
          </div>
          <div class="stat-card">
            <i class="fa-solid fa-weight-scale"></i>
            <span class="stat-value">{preview.weightEntries}</span>
            <span class="stat-label">Pesos</span>
          </div>
          <div class="stat-card">
            <i class="fa-solid fa-ruler-vertical"></i>
            <span class="stat-value">{preview.heightEntries}</span>
            <span class="stat-label">Estaturas</span>
          </div>
          <div class="stat-card total">
            <i class="fa-solid fa-database"></i>
            <span class="stat-value">{preview.totalEvents}</span>
            <span class="stat-label">Total Eventos</span>
          </div>
        </div>
        
        <div class="date-range">
          <p><strong>Rango de fechas:</strong> 13 enero 2025 - 13 junio 2025</p>
          <p><strong>Nombre del bebé:</strong> Male Pediatra</p>
        </div>
      </div>
    {/if}
    
    <div class="clean-section">
      <h2>🧹 Corrección de Datos</h2>
      
      {#if !cleanResult && !error}
        <div class="info-box">
          <i class="fa-solid fa-info-circle"></i>
          <p><strong>Problema detectado:</strong> Algunos eventos de peso/estatura aparecen en "Mariano" en lugar de "Mi Bebé".</p>
          <p>Esta función moverá automáticamente todos los eventos pediátricos al sujeto correcto (Mi Bebé).</p>
        </div>
        
        <button 
          class="btn btn-secondary clean-btn" 
          on:click={handleClean}
          disabled={cleaning}
        >
          {#if cleaning}
            <i class="fa-solid fa-spinner fa-spin"></i>
            Corrigiendo datos...
          {:else}
            <i class="fa-solid fa-broom"></i>
            Corregir Atribución de Eventos
          {/if}
        </button>
      {/if}
      
      {#if cleanResult}
        <div class="success-box">
          <i class="fa-solid fa-check-circle"></i>
          <h3>✅ Corrección Completada</h3>
          <div class="result-details">
            <p><strong>Eventos movidos:</strong> {cleanResult.cleaned}</p>
            <p><strong>Total eventos en {cleanResult.babySubjectName}:</strong> {cleanResult.totalBabyEvents}</p>
            <p><strong>Datos ahora aparecen correctamente en:</strong> {cleanResult.babySubjectName}</p>
          </div>
          
          <div class="action-buttons">
            <button class="btn btn-primary" on:click={goToTimeline}>
              <i class="fa-solid fa-timeline"></i>
              Ver Timeline Corregido
            </button>
          </div>
        </div>
      {/if}
    </div>
    
    <div class="import-section">
      <h2>🚀 Importación</h2>
      
      {#if !importResult && !error}
        <div class="warning-box">
          <i class="fa-solid fa-exclamation-triangle"></i>
          <p><strong>Atención:</strong> Esta acción insertará los datos pediátricos del CSV en la base de datos asociados al usuario actual ({$user?.email}).</p>
          <p>Los datos se insertarán con las fechas originales del pediatra.</p>
        </div>
        
        <button 
          class="btn btn-primary import-btn" 
          on:click={handleImport}
          disabled={importing}
        >
          {#if importing}
            <i class="fa-solid fa-spinner fa-spin"></i>
            Importando datos...
          {:else}
            <i class="fa-solid fa-upload"></i>
            Importar Datos Pediátricos
          {/if}
        </button>
      {/if}
      
      {#if importResult}
        <div class="success-box">
          <i class="fa-solid fa-check-circle"></i>
          <h3>✅ Importación Exitosa</h3>
          <div class="result-details">
            <p><strong>Total de eventos insertados:</strong> {importResult.totalEvents}</p>
            <p><strong>Eventos de peso:</strong> {importResult.weightEvents}</p>
            <p><strong>Eventos de estatura:</strong> {importResult.heightEvents}</p>
            <p><strong>Sujeto:</strong> {importResult.babyName}</p>
            <p><strong>Período:</strong> {importResult.startDate} a {importResult.endDate}</p>
          </div>
          
          <div class="action-buttons">
            <button class="btn btn-secondary" on:click={goToDashboard}>
              <i class="fa-solid fa-home"></i>
              Ir al Dashboard
            </button>
            <button class="btn btn-primary" on:click={goToTimeline}>
              <i class="fa-solid fa-timeline"></i>
              Ver Timeline
            </button>
          </div>
        </div>
      {/if}
      
      {#if error}
        <div class="error-box">
          <i class="fa-solid fa-exclamation-circle"></i>
          <h3>❌ Error en la Importación</h3>
          <p>{error}</p>
          <button class="btn btn-secondary" on:click={() => { error = null; importResult = null; }}>
            <i class="fa-solid fa-redo"></i>
            Intentar de Nuevo
          </button>
        </div>
      {/if}
    </div>
  </main>
</div>

<style>
  .container {
    min-height: 100vh;
    background-color: var(--gray-light);
    padding: var(--spacing-md);
  }
  
  header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xl);
  }
  
  .back-button {
    background: var(--white);
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    color: var(--primary);
  }
  
  h1 {
    color: var(--dark);
    margin: 0;
  }
  
  main {
    max-width: 600px;
    margin: 0 auto;
  }
  
  .preview-section, .import-section, .clean-section {
    background: var(--white);
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);
    margin-bottom: var(--spacing-lg);
    box-shadow: var(--shadow-sm);
  }
  
  .preview-section h2, .import-section h2, .clean-section h2 {
    margin: 0 0 var(--spacing-lg) 0;
    color: var(--dark);
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }
  
  .stat-card {
    background: var(--background);
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);
    text-align: center;
    border: 2px solid transparent;
  }
  
  .stat-card.total {
    border-color: var(--primary);
    background: var(--primary)11;
  }
  
  .stat-card i {
    font-size: 1.5rem;
    color: var(--primary);
    margin-bottom: var(--spacing-sm);
  }
  
  .stat-value {
    display: block;
    font-size: 1.8rem;
    font-weight: bold;
    color: var(--dark);
    margin-bottom: var(--spacing-xs);
  }
  
  .stat-label {
    font-size: 0.85rem;
    color: var(--gray-dark);
  }
  
  .date-range {
    border-top: 1px solid var(--light);
    padding-top: var(--spacing-lg);
    color: var(--gray-dark);
  }
  
  .date-range p {
    margin: var(--spacing-xs) 0;
  }
  
  .warning-box, .success-box, .error-box, .info-box {
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .warning-box {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    color: #856404;
  }
  
  .success-box {
    background: #d4edda;
    border: 1px solid #c3e6cb;
    color: #155724;
  }
  
  .error-box {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
  }
  
  .info-box {
    background: #d1ecf1;
    border: 1px solid #bee5eb;
    color: #0c5460;
  }
  
  .warning-box i, .success-box i, .error-box i, .info-box i {
    font-size: 2rem;
    margin-bottom: var(--spacing-md);
  }
  
  .import-btn, .clean-btn {
    width: 100%;
    padding: var(--spacing-lg);
    font-size: 1.1rem;
    font-weight: bold;
  }
  
  .result-details {
    margin: var(--spacing-md) 0;
    text-align: left;
  }
  
  .result-details p {
    margin: var(--spacing-xs) 0;
  }
  
  .action-buttons {
    display: flex;
    gap: var(--spacing-md);
    margin-top: var(--spacing-lg);
  }
  
  .btn {
    padding: var(--spacing-md) var(--spacing-lg);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 1rem;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    transition: all 0.2s ease;
  }
  
  .btn-primary {
    background-color: var(--primary);
    color: var(--white);
  }
  
  .btn-secondary {
    background-color: var(--gray);
    color: var(--dark);
  }
  
  .btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  @media (max-width: 640px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .action-buttons {
      flex-direction: column;
    }
    
    .container {
      padding: var(--spacing-sm);
    }
  }
</style>