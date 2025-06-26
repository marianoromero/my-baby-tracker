<!-- src/routes/stats/+page.svelte -->
<script>
    import { onMount } from 'svelte'
    import { goto } from '$app/navigation'
    import { base } from '$app/paths'
    import { supabase } from '$lib/supabase'
    import { family, subjects } from '$lib/stores/family'
    
    let sleepData = []
    let bottleData = []
    let currentWeekStart = new Date()
    let loading = true
    
    // Configurar el inicio de la semana (lunes)
    function getWeekStart(date) {
        const d = new Date(date)
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Ajustar para que lunes sea día 1
        return new Date(d.setDate(diff))
    }
    
    // Formatear fecha para mostrar
    function formatWeekRange(weekStart) {
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        
        const options = { day: 'numeric', month: 'short' }
        return `${weekStart.toLocaleDateString('es-ES', options)} - ${weekEnd.toLocaleDateString('es-ES', options)}`
    }
    
    // Calcular horas de sueño por día
    async function calculateSleepHours(weekStart) {
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 7)
        
        const { data: events, error } = await supabase
            .from('events')
            .select('*, subjects(*)')
            .gte('event_timestamp', weekStart.toISOString())
            .lt('event_timestamp', weekEnd.toISOString())
            .order('event_timestamp')
        
        if (error) {
            console.error('Error loading events:', error)
            return {}
        }
        
        const sleepEvents = events.filter(event => 
            event.action_name.toLowerCase().includes('dorm') || 
            event.action_name.toLowerCase().includes('despiert')
        )
        
        const dailySleep = {}
        let sleepStart = null
        
        // Inicializar días de la semana
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart)
            day.setDate(weekStart.getDate() + i)
            const dayKey = day.toISOString().split('T')[0]
            dailySleep[dayKey] = 0
        }
        
        sleepEvents.forEach(event => {
            const isGoingToSleep = event.action_name.toLowerCase().includes('dorm')
            const eventDate = new Date(event.event_timestamp)
            const dayKey = eventDate.toISOString().split('T')[0]
            
            if (isGoingToSleep) {
                sleepStart = eventDate
            } else if (sleepStart && !isGoingToSleep) {
                // Se despierta
                const sleepDuration = (eventDate - sleepStart) / (1000 * 60 * 60) // horas
                if (sleepDuration > 0 && sleepDuration < 24) { // Validar duración razonable
                    dailySleep[dayKey] += sleepDuration
                }
                sleepStart = null
            }
        })
        
        return dailySleep
    }
    
    // Calcular mililitros de biberón por día
    async function calculateBottleVolume(weekStart) {
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 7)
        
        const { data: events, error } = await supabase
            .from('events')
            .select('*, subjects(*)')
            .gte('event_timestamp', weekStart.toISOString())
            .lt('event_timestamp', weekEnd.toISOString())
            .order('event_timestamp')
        
        if (error) {
            console.error('Error loading events:', error)
            return {}
        }
        
        const bottleEvents = events.filter(event => 
            event.action_name.toLowerCase().includes('biber') ||
            event.action_name.toLowerCase().includes('bibi') ||
            event.action_name.toLowerCase().includes('botella')
        )
        
        const dailyBottle = {}
        
        // Inicializar días de la semana
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart)
            day.setDate(weekStart.getDate() + i)
            const dayKey = day.toISOString().split('T')[0]
            dailyBottle[dayKey] = 0
        }
        
        bottleEvents.forEach(event => {
            // Extraer cantidad de los paréntesis
            const match = event.action_name.match(/\((\d+)ml\)/)
            if (match) {
                const volume = parseInt(match[1])
                const eventDate = new Date(event.event_timestamp)
                const dayKey = eventDate.toISOString().split('T')[0]
                dailyBottle[dayKey] += volume
            }
        })
        
        return dailyBottle
    }
    
    // Cargar datos de la semana
    async function loadWeekData() {
        loading = true
        const weekStart = getWeekStart(currentWeekStart)
        
        const [sleepHours, bottleVolume] = await Promise.all([
            calculateSleepHours(weekStart),
            calculateBottleVolume(weekStart)
        ])
        
        // Convertir a arrays para los gráficos
        sleepData = Object.entries(sleepHours).map(([date, hours]) => ({
            date: new Date(date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
            value: Math.round(hours * 10) / 10 // Redondear a 1 decimal
        }))
        
        bottleData = Object.entries(bottleVolume).map(([date, ml]) => ({
            date: new Date(date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
            value: ml
        }))
        
        loading = false
    }
    
    // Navegar semanas
    function previousWeek() {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7)
        currentWeekStart = new Date(currentWeekStart)
        loadWeekData()
    }
    
    function nextWeek() {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7)
        currentWeekStart = new Date(currentWeekStart)
        loadWeekData()
    }
    
    onMount(() => {
        currentWeekStart = getWeekStart(new Date())
        loadWeekData()
    })
</script>

<div class="container">
    <header>
        <button class="back-button" on:click={() => goto(`${base}/dashboard`)}>
            <i class="fa-solid fa-arrow-left"></i>
        </button>
        <h1>Estadísticas</h1>
    </header>

    <main>
        {#if loading}
            <div class="loading">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <p>Cargando estadísticas...</p>
            </div>
        {:else}
            <!-- Navegación de semana -->
            <div class="week-navigation">
                <button class="nav-button" on:click={previousWeek}>
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <span class="week-range">{formatWeekRange(getWeekStart(currentWeekStart))}</span>
                <button class="nav-button" on:click={nextWeek}>
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>

            <!-- Gráfico de sueño -->
            <div class="chart-section">
                <h2>Horas de sueño por día</h2>
                <div class="chart">
                    {#each sleepData as day}
                        <div class="bar-container">
                            <div class="bar sleep-bar" style="height: {(day.value / 12) * 100}%"></div>
                            <span class="bar-value">{day.value}h</span>
                            <span class="bar-label">{day.date}</span>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Gráfico de biberón -->
            <div class="chart-section">
                <h2>Mililitros de biberón por día</h2>
                <div class="chart">
                    {#each bottleData as day}
                        <div class="bar-container">
                            <div class="bar bottle-bar" style="height: {(day.value / 800) * 100}%"></div>
                            <span class="bar-value">{day.value}ml</span>
                            <span class="bar-label">{day.date}</span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </main>
</div>

<style>
    .container {
        min-height: 100vh;
        background-color: var(--gray-light);
        width: 100%;
        display: flex;
        flex-direction: column;
    }

    header {
        background-color: var(--primary);
        color: var(--white);
        padding: var(--spacing-md);
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        box-shadow: var(--shadow-md);
    }

    .back-button {
        background: none;
        border: none;
        color: var(--white);
        font-size: 1.25rem;
        cursor: pointer;
        padding: var(--spacing-sm);
    }

    h1 {
        margin: 0;
        font-size: 1.5rem;
    }

    main {
        padding: var(--spacing-md);
        flex: 1;
    }

    .loading {
        text-align: center;
        padding: var(--spacing-xl);
        color: var(--gray-dark);
    }

    .loading i {
        font-size: 2rem;
        margin-bottom: var(--spacing-md);
        color: var(--primary);
    }

    .week-navigation {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-lg);
        background: var(--white);
        padding: var(--spacing-md);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-sm);
    }

    .nav-button {
        background: var(--primary);
        color: var(--white);
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .nav-button:hover {
        background: var(--primary-dark);
        transform: scale(1.05);
    }

    .week-range {
        font-weight: 600;
        font-size: 1.1rem;
        color: var(--dark);
        min-width: 150px;
        text-align: center;
    }

    .chart-section {
        background: var(--white);
        border-radius: var(--radius-md);
        padding: var(--spacing-lg);
        margin-bottom: var(--spacing-lg);
        box-shadow: var(--shadow-sm);
    }

    .chart-section h2 {
        margin: 0 0 var(--spacing-lg) 0;
        color: var(--dark);
        font-size: 1.25rem;
        text-align: center;
    }

    .chart {
        display: flex;
        align-items: flex-end;
        justify-content: space-around;
        height: 200px;
        gap: var(--spacing-xs);
        padding: var(--spacing-md) 0;
        border-bottom: 2px solid var(--light);
        position: relative;
    }

    .bar-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        height: 100%;
        position: relative;
    }

    .bar {
        width: 100%;
        max-width: 40px;
        min-height: 5px;
        border-radius: var(--radius-sm) var(--radius-sm) 0 0;
        transition: all 0.3s ease;
        margin-bottom: auto;
    }

    .sleep-bar {
        background: linear-gradient(to top, #4CAF50, #66BB6A);
    }

    .bottle-bar {
        background: linear-gradient(to top, #2196F3, #42A5F5);
    }

    .bar:hover {
        transform: scaleY(1.05);
        box-shadow: var(--shadow-md);
    }

    .bar-value {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--dark);
        margin-top: var(--spacing-xs);
        white-space: nowrap;
    }

    .bar-label {
        font-size: 0.7rem;
        color: var(--gray-dark);
        margin-top: var(--spacing-xs);
        text-align: center;
    }

    /* Responsive */
    @media (max-width: 640px) {
        .chart {
            gap: 2px;
        }

        .bar {
            max-width: 30px;
        }

        .bar-value {
            font-size: 0.7rem;
        }

        .bar-label {
            font-size: 0.6rem;
        }

        .week-range {
            font-size: 1rem;
            min-width: 120px;
        }
    }
</style>