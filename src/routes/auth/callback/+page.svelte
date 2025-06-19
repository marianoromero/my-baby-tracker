<!-- src/routes/auth/callback/+page.svelte -->
<script>
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { base } from '$app/paths'
  import LoadingScreen from '$lib/components/LoadingScreen.svelte'
  
  onMount(() => {
    // Dar tiempo para que Supabase procese la autenticación
    setTimeout(() => {
      goto(`${base}/dashboard`)
    }, 1000)
  })
</script>

<LoadingScreen />