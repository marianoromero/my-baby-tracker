<!-- src/routes/auth/+page.svelte -->
<script>
    import { signIn, signUp, signInWithGoogle, loading } from '$lib/stores/auth'
    
    let email = ''
    let password = ''
    let invitationCode = ''
    let isLogin = true
    let error = null
    let successMessage = null
  
    const handleSubmit = async () => {
      error = null
      successMessage = null
      
      if (!email || !password) {
        error = 'Por favor completa todos los campos'
        return
      }
  
      const { data, error: authError } = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password, invitationCode || null)
  
      if (authError) {
        error = authError.message
      } else if (!isLogin) {
        successMessage = 'Cuenta creada. Revisa tu email para confirmar.'
      }
    }
  
    const handleGoogleSignIn = async () => {
      error = null
      const { error: authError } = await signInWithGoogle()
      if (authError) {
        error = authError.message
      }
    }
  </script>
  
  <div class="auth-container">
    <div class="auth-card">
      <h1>Baby Tracker</h1>
      <p class="subtitle">Rastrea los momentos importantes de tu bebé</p>
  
      {#if error}
        <div class="alert alert-error">
          {error}
        </div>
      {/if}
  
      {#if successMessage}
        <div class="alert alert-success">
          {successMessage}
        </div>
      {/if}
  
      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
          <label for="email" class="form-label">Email</label>
          <input
            type="email"
            id="email"
            class="form-input"
            bind:value={email}
            placeholder="tu@email.com"
            disabled={$loading}
          />
        </div>
  
        <div class="form-group">
          <label for="password" class="form-label">Contraseña</label>
          <input
            type="password"
            id="password"
            class="form-input"
            bind:value={password}
            placeholder="••••••••"
            disabled={$loading}
          />
        </div>
  
        {#if !isLogin}
          <div class="form-group">
            <label for="invitation" class="form-label">
              Código de invitación (opcional)
            </label>
            <input
              type="text"
              id="invitation"
              class="form-input"
              bind:value={invitationCode}
              placeholder="ABCD1234"
              disabled={$loading}
              style="text-transform: uppercase"
            />
            <p class="form-hint">
              Si tienes un código de invitación familiar, ingrésalo aquí
            </p>
          </div>
        {/if}
  
        <button type="submit" class="btn btn-primary" disabled={$loading}>
          {#if $loading}
            <i class="fas fa-spinner fa-spin"></i>
          {:else}
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          {/if}
        </button>
      </form>
  
      <div class="divider">
        <span>o</span>
      </div>
  
      <button 
        class="btn btn-google" 
        on:click={handleGoogleSignIn}
        disabled={$loading}
      >
        <i class="fab fa-google"></i>
        Continuar con Google
      </button>
  
      <p class="switch-mode">
        {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
        <button 
          class="link-button"
          on:click={() => {
            isLogin = !isLogin
            error = null
            successMessage = null
          }}
        >
          {isLogin ? 'Crear cuenta' : 'Iniciar sesión'}
        </button>
      </p>
    </div>
  </div>
  
  <style>
    .auth-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--gray-light);
      padding: var(--spacing-md);
    }
  
    .auth-card {
      background: var(--white);
      padding: var(--spacing-xl);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      width: 100%;
      max-width: 400px;
    }
  
    h1 {
      text-align: center;
      color: var(--primary);
      margin-bottom: var(--spacing-sm);
    }
  
    .subtitle {
      text-align: center;
      color: var(--gray-dark);
      margin-bottom: var(--spacing-xl);
    }
  
    form {
      margin-bottom: var(--spacing-md);
    }
  
    .btn {
      width: 100%;
      margin-top: var(--spacing-md);
    }
  
    .divider {
      text-align: center;
      margin: var(--spacing-lg) 0;
      position: relative;
    }
  
    .divider span {
      background: var(--white);
      padding: 0 var(--spacing-md);
      color: var(--gray-dark);
      position: relative;
    }
  
    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: var(--gray);
    }
  
    .switch-mode {
      text-align: center;
      margin-top: var(--spacing-lg);
      color: var(--gray-dark);
    }
  
    .link-button {
      background: none;
      border: none;
      color: var(--primary);
      cursor: pointer;
      text-decoration: underline;
      font-size: inherit;
    }
  
    .link-button:hover {
      color: #3a6d82;
    }
  
    .alert {
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--radius-sm);
      margin-bottom: var(--spacing-md);
    }
  
    .alert-error {
      background-color: #fee;
      color: #c33;
      border: 1px solid #fcc;
    }
  
    .alert-success {
      background-color: #efe;
      color: #3c3;
      border: 1px solid #cfc;
    }
  </style>