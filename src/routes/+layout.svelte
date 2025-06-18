<!-- src/routes/+layout.svelte -->
<script>
    import { onMount } from 'svelte'
    import { browser } from '$app/environment'
    import { supabase } from '$lib/supabase'
    import { user, loading } from '$lib/stores/auth'
    import { goto } from '$app/navigation'
    import { page } from '$app/stores'
    import '../App.css'
    import { base } from '$app/paths';
    import InstallPrompt from '$lib/components/InstallPrompt.svelte'
    import LoadingScreen from '$lib/components/LoadingScreen.svelte'
    import { family, familyLoading } from '$lib/stores/family'
  
    // Rutas públicas que no requieren autenticación
    const publicRoutes = ['/auth', '/auth/callback', '/onboarding']
  
    let hasInitialized = false
    
    onMount(() => {
      // Obtener la sesión inicial
      supabase.auth.getSession().then(({ data: { session } }) => {
        user.set(session?.user ?? null)
        loading.set(false)
        hasInitialized = true
        
        // Manejar redirecciones solo en el cliente
        const currentPath = $page.url.pathname
        const isPublicRoute = publicRoutes.some(route => currentPath.startsWith(route))
        
        if (!session?.user && !isPublicRoute) {
          goto(`${base}/auth`);
        } else if (session?.user && currentPath === '/auth') {
          goto(`${base}/dashboard`);
        }
      })
  
      // Escuchar cambios en la autenticación
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        user.set(session?.user ?? null)
        
        // Solo navegar en eventos específicos para evitar loops
        if (event === 'SIGNED_IN') {
          goto(`${base}/dashboard`);
        } else if (event === 'SIGNED_OUT') {
          goto(`${base}/auth`);
        }
      })
  
      return () => {
        subscription?.unsubscribe()
      }
    })
  
    // Manejar redirecciones reactivas solo después de la inicialización
    $: if (browser && !$loading && !$familyLoading && hasInitialized) {
      const currentPath = $page.url.pathname
      const isPublicRoute = publicRoutes.some(route => currentPath.startsWith(route))
      
      if ($user) {
        // Usuario autenticado
        if (!$family && currentPath !== `${base}/onboarding`) {
          // Usuario sin familia - redirigir a onboarding
          goto(`${base}/onboarding`);
        } else if ($family && currentPath === `${base}/onboarding`) {
          // Usuario con familia en onboarding - redirigir a dashboard
          goto(`${base}/dashboard`);
        }
      } else {
        // Usuario no autenticado - redirigir a auth
        if (!isPublicRoute && currentPath !== `${base}/auth`) {
          goto(`${base}/auth`);
        }
      }
    }
  </script>
  
  {#if $loading}
    <LoadingScreen />
  {:else}
    <slot />
  {/if}
  
  <!-- PWA Install Prompt -->
  <InstallPrompt />
  
