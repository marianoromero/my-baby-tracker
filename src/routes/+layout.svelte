<!-- src/routes/+layout.svelte -->
<script>
    import { onMount } from 'svelte'
    import { browser } from '$app/environment'
    import { supabase } from '$lib/supabase'
    import { user, loading, initializing } from '$lib/stores/auth'
    import { goto } from '$app/navigation'
    import { page } from '$app/stores'
    import '../App.css'
    import { base } from '$app/paths';
    import InstallPrompt from '$lib/components/InstallPrompt.svelte'
    import LoadingScreen from '$lib/components/LoadingScreen.svelte'
    import SplashScreen from '$lib/components/SplashScreen.svelte'
    import { family, familyLoading } from '$lib/stores/family'
  
    // Rutas públicas que no requieren autenticación
    const publicRoutes = ['/auth', '/auth/callback', '/onboarding']
    
    // Función para obtener el nombre de la página actual
    function getPageName(pathname) {
      if (pathname.includes('/stats')) return 'stats'
      if (pathname.includes('/timeline')) return 'timeline'
      if (pathname.includes('/subject/')) return 'subject'
      if (pathname.includes('/family')) return 'family'
      if (pathname.includes('/auth')) return 'auth'
      if (pathname.includes('/onboarding')) return 'onboarding'
      return 'dashboard'
    }
    
    // Reactivo para actualizar el data-page del body
    $: if (browser && $page) {
      const pageName = getPageName($page.url.pathname)
      document.body.setAttribute('data-page', pageName)
    }
  
    let hasInitialized = false
    let showSplash = true
    let authSubscription = null
    
    onMount(() => {
      // Obtener la sesión inicial
      supabase.auth.getSession().then(({ data: { session } }) => {
        user.set(session?.user ?? null)
        initializing.set(false)
        hasInitialized = true
        
        // Ocultar splash después de un tiempo mínimo
        setTimeout(() => {
          showSplash = false
        }, 1000)
      })
  
      // Escuchar cambios en la autenticación
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        user.set(session?.user ?? null)
        
        // Solo navegar en eventos específicos para evitar loops
        if (event === 'SIGNED_IN') {
          const currentPath = $page.url.pathname
          if (currentPath === `${base}/auth` || currentPath === `${base}/`) {
            goto(`${base}/dashboard`);
          }
        } else if (event === 'SIGNED_OUT') {
          goto(`${base}/auth`);
        }
      })
  
      authSubscription = subscription
  
      return () => {
        authSubscription?.unsubscribe()
      }
    })
  
    // Manejar redirecciones reactivas solo después de la inicialización
    $: if (browser && !$initializing && !$familyLoading && hasInitialized) {
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
  
  {#if showSplash}
    <SplashScreen bind:show={showSplash} />
  {:else if $loading}
    <LoadingScreen />
  {:else}
    <slot />
  {/if}
  
  <!-- PWA Install Prompt -->
  <InstallPrompt />
  
