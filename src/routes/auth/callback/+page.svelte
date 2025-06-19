<!-- src/routes/auth/callback/+page.svelte -->
<script>
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { base } from '$app/paths'
  import { browser } from '$app/environment'
  import LoadingScreen from '$lib/components/LoadingScreen.svelte'
  
  onMount(() => {
    if (browser) {
      console.log('Auth callback page loaded')
      // Dar tiempo para que Supabase procese la autenticación
      setTimeout(() => {
        console.log('Redirecting to dashboard')
        goto(`${base}/dashboard`)
      }, 2000)
    }
  })
</script>

<svelte:head>
  <title>Procesando autenticación...</title>
</svelte:head>

<LoadingScreen />