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
    import { currentTheme, colorPalettes } from '$lib/stores/theme'
  
    // Rutas públicas que no requieren autenticación
    const publicRoutes = ['/auth', '/auth/callback', '/onboarding']
    
    // Función para obtener el nombre de la página actual
    function getPageName(pathname) {
      if (pathname.includes('/stats')) return 'stats'
      if (pathname.includes('/timeline')) return 'timeline'
      if (pathname.includes('/subject/')) return 'subject'
      if (pathname.includes('/family')) return 'family'
      if (pathname.includes('/styles')) return 'styles'
      if (pathname.includes('/special-fields')) return 'special-fields'
      if (pathname.includes('/auth')) return 'auth'
      if (pathname.includes('/onboarding')) return 'onboarding'
      return 'dashboard'
    }
    
    // Reactivo para actualizar el data-page del body
    $: if (browser && $page) {
      const pageName = getPageName($page.url.pathname)
      document.body.setAttribute('data-page', pageName)
    }
    
    // Función para aplicar los colores del tema al DOM
    function applyThemeColors(paletteId) {
      if (!browser) return
      
      const palette = colorPalettes[paletteId]
      if (!palette) return
      
      const root = document.documentElement
      
      // Aplicar todas las variables CSS
      Object.entries(palette.colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value)
      })
      
      // Aplicar clase del tema al body para estilos específicos
      document.body.className = document.body.className.replace(/theme-\w+/g, '')
      document.body.classList.add(`theme-${paletteId}`)
      
      console.log('Theme applied:', paletteId, palette.colors)
    }
    
    // Reactivo para aplicar cambios de tema
    $: if (browser && $currentTheme) {
      console.log('Applying theme from reactive:', $currentTheme)
      applyThemeColors($currentTheme)
    }
  
    let hasInitialized = false
    let showSplash = true
    let authSubscription = null
    
    // Timeout de emergencia para evitar que la app se quede bloqueada
    let emergencyTimeout = null
    
    onMount(() => {
      console.log('Layout onMount - hasInitialized:', hasInitialized)
      
      // Inicializar tema inmediatamente
      const savedTheme = localStorage.getItem('baby-tracker-theme') || 'cloud-soft'
      console.log('Initializing theme on mount:', savedTheme)
      applyThemeColors(savedTheme)
      
      // Timeout de emergencia - si después de 5 segundos no se ha inicializado, forzar continuar
      emergencyTimeout = setTimeout(() => {
        console.log('Emergency timeout - forcing initialization')
        if (!hasInitialized) {
          initializing.set(false)
          hasInitialized = true
        }
        showSplash = false
      }, 5000)
      
      // Solo inicializar si no está ya inicializado
      if (!hasInitialized) {
        console.log('Starting auth initialization...')
        // Obtener la sesión inicial
        supabase.auth.getSession().then(({ data: { session } }) => {
          console.log('Auth session obtained:', !!session?.user)
          user.set(session?.user ?? null)
          initializing.set(false)
          hasInitialized = true
          
          // Limpiar timeout de emergencia
          if (emergencyTimeout) {
            clearTimeout(emergencyTimeout)
            emergencyTimeout = null
          }
          
          // Ocultar splash después de un tiempo mínimo
          setTimeout(() => {
            showSplash = false
          }, 1500)
        }).catch((error) => {
          console.error('Error getting session:', error)
          // En caso de error, aún permitir continuar
          initializing.set(false)
          hasInitialized = true
          
          // Limpiar timeout de emergencia
          if (emergencyTimeout) {
            clearTimeout(emergencyTimeout)
            emergencyTimeout = null
          }
          
          setTimeout(() => {
            showSplash = false
          }, 1500)
        })
      } else {
        console.log('Already initialized, hiding splash quickly')
        // Si ya está inicializado, ocultar splash inmediatamente
        if (emergencyTimeout) {
          clearTimeout(emergencyTimeout)
          emergencyTimeout = null
        }
        setTimeout(() => {
          showSplash = false
        }, 1000)
      }
  
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
        if (emergencyTimeout) {
          clearTimeout(emergencyTimeout)
          emergencyTimeout = null
        }
      }
    })
  
    // Manejar redirecciones reactivas solo después de la inicialización
    $: if (browser && !$initializing && hasInitialized) {
      console.log('Reactive navigation check:', {
        initializing: $initializing,
        familyLoading: $familyLoading,
        hasInitialized,
        user: !!$user,
        family: !!$family,
        currentPath: $page.url.pathname
      })
      
      const currentPath = $page.url.pathname
      const isPublicRoute = publicRoutes.some(route => currentPath.startsWith(route))
      
      if ($user) {
        // Usuario autenticado
        if (!$family && currentPath !== `${base}/onboarding`) {
          // Usuario sin familia - redirigir a onboarding
          console.log('Redirecting to onboarding (no family)')
          goto(`${base}/onboarding`);
        } else if ($family && currentPath === `${base}/onboarding`) {
          // Usuario con familia en onboarding - redirigir a dashboard
          console.log('Redirecting to dashboard (has family)')
          goto(`${base}/dashboard`);
        }
      } else {
        // Usuario no autenticado - redirigir a auth
        if (!isPublicRoute && currentPath !== `${base}/auth`) {
          console.log('Redirecting to auth (no user)')
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
  
