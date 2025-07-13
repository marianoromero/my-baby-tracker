<script>
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { base } from '$app/paths'
  import { user, initializing } from '$lib/stores/auth'
  import { family, familyLoading } from '$lib/stores/family'
  import LoadingScreen from '$lib/components/LoadingScreen.svelte'

  onMount(() => {
    const redirect = () => {
      if ($initializing || $familyLoading) {
        return
      }

      if (!$user) {
        goto(`${base}/auth`, { replaceState: true })
      } else if (!$family) {
        goto(`${base}/onboarding`, { replaceState: true })
      } else {
        goto(`${base}/dashboard`, { replaceState: true })
      }
    }

    redirect()
  })

  $: if (!$initializing && !$familyLoading) {
    if (!$user) {
      goto(`${base}/auth`, { replaceState: true })
    } else if (!$family) {
      goto(`${base}/onboarding`, { replaceState: true })
    } else {
      goto(`${base}/dashboard`, { replaceState: true })
    }
  }
</script>

<LoadingScreen />
