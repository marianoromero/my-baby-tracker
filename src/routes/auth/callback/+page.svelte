<!-- src/routes/auth/callback/+page.svelte -->
<script>
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { base } from '$app/paths'
  import { browser } from '$app/environment'
  import { supabase } from '$lib/supabase'
  import LoadingScreen from '$lib/components/LoadingScreen.svelte'
  
  let error = null
  
  onMount(async () => {
    if (browser) {
      console.log('Auth callback page loaded')
      
      try {
        // Handle the OAuth callback
        const { data, error: authError } = await supabase.auth.getSession()
        
        if (authError) {
          console.error('Auth error:', authError)
          error = authError.message
          // Redirect to auth page with error
          setTimeout(() => {
            goto(`${base}/auth?error=${encodeURIComponent(authError.message)}`)
          }, 3000)
          return
        }
        
        if (data.session) {
          console.log('Authentication successful, redirecting to dashboard')
          goto(`${base}/dashboard`)
        } else {
          console.log('No session found, redirecting to auth')
          goto(`${base}/auth`)
        }
      } catch (err) {
        console.error('Callback processing error:', err)
        error = 'Authentication failed. Please try again.'
        setTimeout(() => {
          goto(`${base}/auth`)
        }, 3000)
      }
    }
  })
</script>

<svelte:head>
  <title>Procesando autenticación...</title>
</svelte:head>

{#if error}
  <div class="error-container">
    <h2>Error de autenticación</h2>
    <p>{error}</p>
    <p>Serás redirigido automáticamente...</p>
  </div>
{:else}
  <LoadingScreen />
{/if}

<style>
  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    text-align: center;
  }
  
  .error-container h2 {
    color: var(--color-error, #dc3545);
    margin-bottom: 1rem;
  }
  
  .error-container p {
    margin-bottom: 0.5rem;
    max-width: 400px;
  }
</style>