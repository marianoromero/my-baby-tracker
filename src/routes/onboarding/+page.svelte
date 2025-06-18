<!-- src/routes/onboarding/+page.svelte -->
<script>
  import { goto } from '$app/navigation'
  import { base } from '$app/paths'
  import { user } from '$lib/stores/auth'
  import { supabase } from '$lib/supabase'
  import { family, initializeFamily } from '$lib/stores/family'
  
  let step = 'choose' // 'choose' | 'join' | 'create'
  let familyCode = ''
  let loading = false
  let error = null
  let success = false

  // Redirigir si ya tiene familia
  $: if ($family) {
    goto(`${base}/dashboard`)
  }

  async function joinExistingFamily() {
    if (!familyCode.trim()) {
      error = 'Por favor ingresa un código de familia'
      return
    }

    loading = true
    error = null

    try {
      // Buscar familia por código
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('id')
        .eq('invitation_code', familyCode.toUpperCase().trim())
        .single()

      if (familyError || !familyData) {
        error = 'Código de familia inválido'
        loading = false
        return
      }

      // Verificar si ya es miembro
      const { data: existingMember } = await supabase
        .from('family_members')
        .select('user_id')
        .eq('user_id', $user.id)
        .eq('family_id', familyData.id)
        .single()

      if (existingMember) {
        error = 'Ya eres miembro de esta familia'
        loading = false
        return
      }

      // Añadir como miembro
      const { error: addError } = await supabase
        .from('family_members')
        .insert({
          user_id: $user.id,
          family_id: familyData.id
        })

      if (addError) {
        error = 'Error al unirse a la familia'
        loading = false
        return
      }

      success = true
      
      // Reinicializar la familia
      await initializeFamily()
      
      setTimeout(() => {
        goto(`${base}/dashboard`)
      }, 1500)

    } catch (err) {
      error = 'Error inesperado'
      loading = false
    }
  }

  async function createNewFamily() {
    loading = true
    error = null

    try {
      // Crear nueva familia
      const { data: newFamily, error: familyError } = await supabase
        .from('families')
        .insert({})
        .select()
        .single()

      if (familyError) {
        error = 'Error al crear la familia'
        loading = false
        return
      }

      // Añadir al usuario como miembro
      const { error: addMemberError } = await supabase
        .from('family_members')
        .insert({
          user_id: $user.id,
          family_id: newFamily.id
        })

      if (addMemberError) {
        error = 'Error al configurar la familia'
        loading = false
        return
      }

      // Crear sujetos por defecto
      const defaultSubjects = [
        { name: 'Mi bebé', icon: 'fa-baby', color: '#FF6B6B', position: 1 },
        { name: 'Mi pareja', icon: 'fa-heart', color: '#4ECDC4', position: 2 },
        { name: 'Yo', icon: 'fa-user', color: '#45B7D1', position: 3 }
      ]

      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .insert(
          defaultSubjects.map(subject => ({
            ...subject,
            family_id: newFamily.id
          }))
        )
        .select()

      if (subjectsError) {
        error = 'Error al crear los sujetos'
        loading = false
        return
      }

      // Crear acciones por defecto para cada sujeto
      const defaultActions = {
        'Mi bebé': ['Lactancia', 'Cambio pañal', 'Siesta'],
        'Mi pareja': ['Salió de casa', 'Llegó a casa', 'Comida'],
        'Yo': ['Salí de casa', 'Llegué a casa', 'Descanso']
      }

      for (const subject of subjects) {
        const actions = defaultActions[subject.name] || []
        
        if (actions.length > 0) {
          await supabase
            .from('actions')
            .insert(
              actions.map(actionName => ({
                subject_id: subject.id,
                name: actionName
              }))
            )
        }
      }

      success = true
      
      // Reinicializar la familia
      await initializeFamily()
      
      setTimeout(() => {
        goto(`${base}/dashboard`)
      }, 1500)

    } catch (err) {
      console.error('Error creating family:', err)
      error = 'Error inesperado al crear la familia'
      loading = false
    }
  }

  function goBack() {
    step = 'choose'
    error = null
    familyCode = ''
  }
</script>

<div class="onboarding-container">
  <div class="onboarding-card">
    {#if success}
      <div class="success-state">
        <div class="success-icon">
          <i class="fa-solid fa-check"></i>
        </div>
        <h2>¡Perfecto!</h2>
        <p>Configuración completada exitosamente</p>
        <div class="loading-dots">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      </div>
    {:else if step === 'choose'}
      <div class="welcome-header">
        <div class="app-icon">
          <i class="fa-solid fa-baby"></i>
        </div>
        <h1>¡Bienvenido a Baby Tracker!</h1>
        <p>Para comenzar, necesitas configurar tu familia</p>
      </div>

      <div class="options">
        <button class="option-card" on:click={() => step = 'join'}>
          <div class="option-icon join">
            <i class="fa-solid fa-users"></i>
          </div>
          <h3>Unirme a una familia</h3>
          <p>Ya tienes un código de familia y quieres unirte</p>
          <div class="option-arrow">
            <i class="fa-solid fa-arrow-right"></i>
          </div>
        </button>

        <button class="option-card" on:click={() => step = 'create'}>
          <div class="option-icon create">
            <i class="fa-solid fa-plus-circle"></i>
          </div>
          <h3>Crear nueva familia</h3>
          <p>Configura una familia nueva y obtén tu código</p>
          <div class="option-arrow">
            <i class="fa-solid fa-arrow-right"></i>
          </div>
        </button>
      </div>
    {:else if step === 'join'}
      <div class="step-header">
        <button class="back-btn" on:click={goBack}>
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <h2>Unirse a familia existente</h2>
      </div>

      <div class="join-form">
        <div class="input-group">
          <label for="familyCode">Código de familia</label>
          <input
            id="familyCode"
            type="text"
            bind:value={familyCode}
            placeholder="Ingresa el código de 6 letras"
            maxlength="6"
            disabled={loading}
            on:input={() => familyCode = familyCode.toUpperCase()}
          />
          <small>Pide el código a un miembro de tu familia</small>
        </div>

        {#if error}
          <div class="error-message">
            <i class="fa-solid fa-exclamation-circle"></i>
            {error}
          </div>
        {/if}

        <button 
          class="btn-primary" 
          on:click={joinExistingFamily}
          disabled={loading || !familyCode.trim()}
        >
          {#if loading}
            <i class="fa-solid fa-spinner fa-spin"></i>
            Uniéndose...
          {:else}
            <i class="fa-solid fa-users"></i>
            Unirse a familia
          {/if}
        </button>
      </div>
    {:else if step === 'create'}
      <div class="step-header">
        <button class="back-btn" on:click={goBack}>
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <h2>Crear nueva familia</h2>
      </div>

      <div class="create-info">
        <div class="info-card">
          <h3>Se creará automáticamente:</h3>
          <div class="subjects-preview">
            <div class="subject-item">
              <div class="subject-icon" style="background-color: #FF6B6B">
                <i class="fa-solid fa-baby"></i>
              </div>
              <div class="subject-info">
                <span class="subject-name">Mi bebé</span>
                <span class="subject-actions">Lactancia, Cambio pañal, Siesta</span>
              </div>
            </div>
            <div class="subject-item">
              <div class="subject-icon" style="background-color: #4ECDC4">
                <i class="fa-solid fa-heart"></i>
              </div>
              <div class="subject-info">
                <span class="subject-name">Mi pareja</span>
                <span class="subject-actions">Salió de casa, Llegó a casa, Comida</span>
              </div>
            </div>
            <div class="subject-item">
              <div class="subject-icon" style="background-color: #45B7D1">
                <i class="fa-solid fa-user"></i>
              </div>
              <div class="subject-info">
                <span class="subject-name">Yo</span>
                <span class="subject-actions">Salí de casa, Llegué a casa, Descanso</span>
              </div>
            </div>
          </div>
        </div>

        {#if error}
          <div class="error-message">
            <i class="fa-solid fa-exclamation-circle"></i>
            {error}
          </div>
        {/if}

        <button 
          class="btn-primary" 
          on:click={createNewFamily}
          disabled={loading}
        >
          {#if loading}
            <i class="fa-solid fa-spinner fa-spin"></i>
            Creando familia...
          {:else}
            <i class="fa-solid fa-plus-circle"></i>
            Crear familia
          {/if}
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .onboarding-container {
    min-height: 100vh;
    background: linear-gradient(135deg, var(--primary) 0%, #5a9bb8 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-lg);
  }

  .onboarding-card {
    background: var(--white);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    width: 100%;
    max-width: 500px;
    padding: var(--spacing-xl);
    animation: slideUp 0.5s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .welcome-header {
    text-align: center;
    margin-bottom: var(--spacing-xl);
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

  .welcome-header h1 {
    margin: 0 0 var(--spacing-sm);
    color: var(--black);
    font-size: 1.8rem;
  }

  .welcome-header p {
    margin: 0;
    color: var(--gray-dark);
    font-size: 1rem;
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .option-card {
    background: var(--gray-light);
    border: 2px solid transparent;
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    position: relative;
  }

  .option-card:hover {
    border-color: var(--primary);
    background: var(--white);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .option-icon {
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

  .option-icon.join {
    background: #4ECDC4;
  }

  .option-icon.create {
    background: #FF6B6B;
  }

  .option-card h3 {
    margin: 0 0 var(--spacing-xs);
    color: var(--black);
    font-size: 1.2rem;
  }

  .option-card p {
    margin: 0;
    color: var(--gray-dark);
    font-size: 0.9rem;
  }

  .option-arrow {
    margin-left: auto;
    color: var(--gray);
    font-size: 1.2rem;
    transition: transform 0.2s ease;
  }

  .option-card:hover .option-arrow {
    transform: translateX(5px);
    color: var(--primary);
  }

  .step-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xl);
  }

  .back-btn {
    background: var(--gray-light);
    border: none;
    border-radius: var(--radius-full);
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--gray-dark);
    transition: all 0.2s ease;
  }

  .back-btn:hover {
    background: var(--gray);
  }

  .step-header h2 {
    margin: 0;
    color: var(--black);
    font-size: 1.5rem;
  }

  .join-form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .input-group label {
    display: block;
    margin-bottom: var(--spacing-xs);
    color: var(--black);
    font-weight: 500;
  }

  .input-group input {
    width: 100%;
    padding: var(--spacing-md);
    border: 2px solid var(--gray);
    border-radius: var(--radius-md);
    font-size: 1rem;
    text-align: center;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  .input-group input:focus {
    outline: none;
    border-color: var(--primary);
  }

  .input-group small {
    display: block;
    margin-top: var(--spacing-xs);
    color: var(--gray-dark);
    font-size: 0.85rem;
  }

  .subjects-preview {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .subject-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .subject-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--white);
    font-size: 1.1rem;
  }

  .subject-info {
    display: flex;
    flex-direction: column;
  }

  .subject-name {
    font-weight: 600;
    color: var(--black);
  }

  .subject-actions {
    font-size: 0.8rem;
    color: var(--gray-dark);
  }

  .info-card {
    background: var(--gray-light);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
  }

  .info-card h3 {
    margin: 0 0 var(--spacing-md);
    color: var(--black);
    font-size: 1.1rem;
  }

  .btn-primary {
    width: 100%;
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--primary);
    color: var(--white);
    border: none;
    border-radius: var(--radius-md);
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    transition: all 0.2s ease;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--primary-dark);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-message {
    background: #fee;
    border: 1px solid #fcc;
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    color: #c33;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 0.9rem;
  }

  .success-state {
    text-align: center;
    padding: var(--spacing-xl) 0;
  }

  .success-icon {
    width: 80px;
    height: 80px;
    background: #10B981;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--spacing-lg);
    color: var(--white);
    font-size: 2.5rem;
    animation: successPop 0.5s ease-out;
  }

  @keyframes successPop {
    0% { transform: scale(0); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }

  .success-state h2 {
    margin: 0 0 var(--spacing-sm);
    color: var(--black);
    font-size: 1.8rem;
  }

  .success-state p {
    margin: 0 0 var(--spacing-lg);
    color: var(--gray-dark);
  }

  .loading-dots {
    display: flex;
    justify-content: center;
    gap: var(--spacing-xs);
  }

  .dot {
    width: 8px;
    height: 8px;
    background: var(--primary);
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
    .onboarding-container {
      padding: var(--spacing-md);
    }

    .onboarding-card {
      padding: var(--spacing-lg);
    }

    .option-card {
      flex-direction: column;
      text-align: center;
      gap: var(--spacing-sm);
    }

    .option-arrow {
      margin: 0;
      transform: rotate(90deg);
    }

    .option-card:hover .option-arrow {
      transform: rotate(90deg) translateX(5px);
    }
  }
</style>