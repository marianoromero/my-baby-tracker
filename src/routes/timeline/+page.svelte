<!-- src/routes/timeline/+page.svelte -->
<script>
    import { page } from '$app/stores'
    import { selectedFilter } from '$lib/stores/events'
    import Timeline from '$lib/components/Timeline.svelte'
    import { onMount } from 'svelte'

    onMount(() => {
        // Obtener el filtro de la URL o usar 'today' por defecto
        const filter = $page.url.searchParams.get('filter') || 'today'
        selectedFilter.set(filter)
    })
</script>

<div class="timeline-page">
    <Timeline />
</div>

<style>
    .timeline-page {
        min-height: 100vh;
        background-color: var(--gray-light);
        width: 100%;
    }
</style> 